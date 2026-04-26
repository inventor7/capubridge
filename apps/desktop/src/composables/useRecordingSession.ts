import { invoke } from "@tauri-apps/api/core";
import { effectScope, watch } from "vue";
import { useRecordingStore } from "@/stores/recording.store";
import { useNetworkStore } from "@/modules/network/stores/useNetworkStore";
import { useConsoleStore } from "@/stores/console.store";
import { useSessionWriter } from "./useSessionWriter";
import { useRrwebRecorder } from "./useRrwebRecorder";
import { useCDP } from "./useCDP";
import type { RecordingConfig, SessionManifest } from "@/types/replay.types";
import { useDevicesStore } from "@/stores/devices.store";
import { useTargetsStore } from "@/stores/targets.store";
import { toast } from "vue-sonner";

// ─────────────────────────────────────────────────────────────────────────────
// MODULE-LEVEL SINGLETON STATE
//
// useRecordingSession() is called from multiple components (RecordingButton,
// RecordingConfigModal, future panels). If state lived in the function closure,
// each caller would get its own copy — start() in one component, stop() in
// another would not share state, and stop() would see empty defaults.
//
// All recording state therefore lives at module scope. The composable function
// itself is a thin facade returning start/stop bound to this shared state.
// ─────────────────────────────────────────────────────────────────────────────

let writer: ReturnType<typeof useSessionWriter> | null = null;
let rrwebRecorder: ReturnType<typeof useRrwebRecorder> | null = null;
let networkUnwatch: (() => void) | null = null;
let consoleUnwatch: (() => void) | null = null;
let consoleLeasedByRecorder = false;
let startedAt = 0;
let activeSessionId = "";

// Detached effect scope: watchers created here outlive any component that
// happens to be mounted when start() is called. Without this, a modal closing
// (and unmounting) right after start() would auto-stop the network watcher.
const recordingScope = effectScope(true);

function generateSessionId(): string {
  return `capu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Orchestrates a full recording session.
 *
 * Call start(config) to begin. Call stop() to finalize and get the .capu path.
 * The recording store reflects the current phase throughout.
 *
 * Network capture: depends on useNetwork() being active globally (AppShell mounts it).
 * Console capture: acquires a lease on the console store so CDP events flow even when
 *   the Console panel is not open.
 *
 * Safe to call from any component — all state is module-scoped.
 */
export function useRecordingSession() {
  const recordingStore = useRecordingStore();
  const networkStore = useNetworkStore();
  const consoleStore = useConsoleStore();
  const devicesStore = useDevicesStore();
  const targetsStore = useTargetsStore();
  const { activeClient } = useCDP();

  async function start(config: RecordingConfig): Promise<void> {
    if (recordingStore.isRecording) return;

    const sessionId = generateSessionId();
    startedAt = Date.now();
    activeSessionId = sessionId;

    recordingStore.setConfig(config);

    // 1. Tell Rust to create the session directory FIRST — only transition to
    //    "recording" phase after Rust confirms success to avoid a false-positive
    //    recording indicator in the UI.
    try {
      await invoke<void>("recording_session_start", { sessionId });
    } catch (err) {
      activeSessionId = "";
      recordingStore.setError(`Failed to start session: ${String(err)}`);
      return;
    }

    recordingStore.setPhase("recording", sessionId);

    // 2. Start the event writer
    writer = useSessionWriter(sessionId, startedAt);
    writer.start();

    // 3. Wire network track inside the detached scope.
    //    useNetwork() is mounted globally in AppShell so the store is always populated.
    if (config.tracks.network) {
      const seenIds = new Set<string>();
      recordingScope.run(() => {
        networkUnwatch = watch(
          () => networkStore.allEntries,
          (entries) => {
            for (const entry of entries) {
              if (seenIds.has(entry.requestId)) continue;
              seenIds.add(entry.requestId);
              writer?.pushAt(
                "network",
                {
                  requestId: entry.requestId,
                  url: entry.url,
                  method: entry.method,
                  status: entry.httpStatus,
                  resourceType: entry.resourceType,
                  duration:
                    entry.finishedTimestamp && entry.startedAt
                      ? entry.finishedTimestamp - entry.startedAt
                      : null,
                  transferSize: entry.transferSize,
                  state: entry.state,
                },
                entry.startedAt ?? startedAt,
              );
            }
          },
          { immediate: false },
        );
      });
    }

    // 4. Wire console track. Acquire lease so CDP listener is active even if
    //    Console panel is not open.
    if (config.tracks.console) {
      try {
        await consoleStore.acquireLease();
        consoleLeasedByRecorder = true;
      } catch {
        // Non-fatal — console events won't be captured if lease fails
      }

      let lastConsoleIndex = consoleStore.entries.length;
      recordingScope.run(() => {
        consoleUnwatch = watch(
          () => consoleStore.entries.length,
          () => {
            const newEntries = consoleStore.entries.slice(lastConsoleIndex);
            lastConsoleIndex = consoleStore.entries.length;
            for (const entry of newEntries) {
              writer?.pushAt(
                "console",
                {
                  level: entry.level ?? "log",
                  text: entry.message ?? "",
                  source: entry.source ?? null,
                  line: entry.lineNumber ?? null,
                },
                entry.timestamp ?? startedAt,
              );
            }
          },
        );
      });
    }

    // 5. Wire rrweb track
    if (config.tracks.rrweb && activeClient.value) {
      rrwebRecorder = useRrwebRecorder(activeClient.value, writer);
      try {
        await rrwebRecorder.start({ reloadTarget: config.reloadTarget });
      } catch (err) {
        toast.error(`rrweb injection failed: ${String(err)}`);
        // Non-fatal — continue recording other tracks
      }
    }
  }

  async function stop(): Promise<string | null> {
    if (!recordingStore.isRecording) return null;
    if (!activeSessionId) {
      // Defensive: state was lost somehow. Reset and bail.
      recordingStore.reset();
      return null;
    }

    recordingStore.setPhase("stopping");

    // Snapshot current session details before mutating module state
    const sessionId = activeSessionId;
    const sessionStartedAt = startedAt;

    // 1. Stop rrweb first (removes script injection)
    await rrwebRecorder?.stop();
    rrwebRecorder = null;

    // 2. Unwatch network/console
    networkUnwatch?.();
    networkUnwatch = null;
    consoleUnwatch?.();
    consoleUnwatch = null;

    // 3. Release console lease if we acquired one
    if (consoleLeasedByRecorder) {
      consoleLeasedByRecorder = false;
      try {
        await consoleStore.releaseLease();
      } catch {
        // Best-effort
      }
    }

    // 4. Flush remaining events to Rust
    await writer?.stop();
    writer = null;

    // 5. Build manifest
    const manifest: SessionManifest = {
      version: 1,
      sessionId,
      label: recordingStore.config?.label ?? "Unnamed session",
      startedAt: sessionStartedAt,
      duration: Date.now() - sessionStartedAt,
      deviceSerial: devicesStore.selectedDevice?.serial ?? null,
      targetUrl: targetsStore.selectedTarget?.url ?? null,
      appPackage: null,
      tracks: recordingStore.config?.tracks ?? { rrweb: false, network: false, console: false },
    };

    // 6. Tell Rust to finalize the zip
    let capuPath: string | null = null;
    try {
      capuPath = await invoke<string>("recording_session_stop", {
        sessionId,
        manifestJson: JSON.stringify(manifest),
      });
    } catch (err) {
      recordingStore.setError(`Failed to package session: ${String(err)}`);
      activeSessionId = "";
      startedAt = 0;
      return null;
    }

    // 7. Reset module state
    activeSessionId = "";
    startedAt = 0;
    recordingStore.reset();
    return capuPath;
  }

  return { start, stop };
}
