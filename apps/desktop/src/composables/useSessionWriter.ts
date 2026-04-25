import { invoke } from "@tauri-apps/api/core";
import type { TrackName } from "@/types/replay.types";

interface BufferedEvent {
  t: number;
  data: unknown;
}

/**
 * Per-session event writer. Call push() from any track collector.
 * Internally batches events and flushes to Rust every `flushIntervalMs`.
 *
 * Usage:
 *   const writer = useSessionWriter(sessionId, startedAt)
 *   writer.start()
 *   writer.push('network', networkEntry)  // from useNetworkStore watcher
 *   writer.pushAt('rrweb', event, event.timestamp)
 *   await writer.stop()  // flushes remainder and clears interval
 */
export function useSessionWriter(sessionId: string, startedAt: number, flushIntervalMs = 2000) {
  const buffers: Record<TrackName, BufferedEvent[]> = {
    rrweb: [],
    network: [],
    console: [],
  };

  let intervalId: ReturnType<typeof setInterval> | null = null;

  /** Push an event with the current wall-clock time as offset */
  function push(track: TrackName, data: unknown) {
    pushAt(track, data, Date.now());
  }

  /** Push an event with an explicit wall-clock timestamp (e.g. from CDP events) */
  function pushAt(track: TrackName, data: unknown, wallMs: number) {
    buffers[track].push({ t: wallMs - startedAt, data });
  }

  /** Returns total number of buffered events across all tracks */
  function bufferSize(): number {
    return Object.values(buffers).reduce((sum, arr) => sum + arr.length, 0);
  }

  /** Drains a track buffer and returns NDJSON string (for testing) */
  function drainAsNdjson(track: TrackName): string {
    const events = buffers[track].splice(0);
    return events.map((e) => JSON.stringify(e)).join("\n") + "\n";
  }

  /** Sends all buffered events to Rust and clears buffers */
  async function flush() {
    const tracks = Object.entries(buffers) as [TrackName, BufferedEvent[]][];
    for (const [track, events] of tracks) {
      if (events.length === 0) continue;
      const batch = events.splice(0); // drain atomically
      const ndjson = batch.map((e) => JSON.stringify(e)).join("\n") + "\n";
      try {
        await invoke<void>("recording_session_append", {
          sessionId,
          track,
          ndjsonBatch: ndjson,
        });
      } catch (err) {
        // Put events back at front of buffer so they're retried next flush
        events.unshift(...batch);
        console.error(`[SessionWriter] flush failed for track ${track}:`, err);
      }
    }
  }

  /** Start periodic flushing */
  function start() {
    if (intervalId !== null) return;
    intervalId = setInterval(flush, flushIntervalMs);
  }

  /** Flush remaining events and stop the interval */
  async function stop() {
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
    await flush();
  }

  return { push, pushAt, flush, start, stop, bufferSize, drainAsNdjson };
}
