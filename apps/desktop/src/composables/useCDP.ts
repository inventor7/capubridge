import { computed } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { CDPClient } from "utils";
import { useDevicesStore } from "@/stores/devices.store";
import { useTargetsStore, CDP_BASE_PORT } from "@/stores/targets.store";
import { useConnectionStore } from "@/stores/connection.store";
import type { CDPTarget } from "@/types/cdp.types";

export function useCDP() {
  const devicesStore = useDevicesStore();
  const targetsStore = useTargetsStore();
  const connectionStore = useConnectionStore();

  const activeClient = computed<CDPClient | null>(() => {
    const conn = connectionStore.activeConnection;
    if (!conn || conn.status !== "connected") return null;
    // CDPClient is stored separately — see connectToTarget
    return clientMap.get(conn.targetId) ?? null;
  });

  // Keep CDPClient instances in a module-level map (Pinia stores can't hold class instances reliably)
  const clientMap = new Map<string, CDPClient>();

  async function forwardAndFetchTargets(serial: string) {
    await invoke("adb_forward_cdp", { serial, localPort: CDP_BASE_PORT });
    await targetsStore.fetchTargets(CDP_BASE_PORT);
  }

  async function connectToTarget(target: CDPTarget): Promise<CDPClient> {
    // Reuse existing open client
    const existing = clientMap.get(target.id);
    if (existing && existing.readyState === WebSocket.OPEN) return existing;

    const conn = await connectionStore.connect(target);

    const client = new CDPClient(target.webSocketDebuggerUrl);
    await client.waitForOpen();
    clientMap.set(target.id, client);

    // Clean up on close
    conn.ws.addEventListener("close", () => {
      connectionStore.setStatus(target.id, "disconnected");
      clientMap.delete(target.id);
    });

    return client;
  }

  function getClient(targetId: string): CDPClient | undefined {
    return clientMap.get(targetId);
  }

  function disconnectTarget(targetId: string) {
    clientMap.get(targetId)?.close();
    clientMap.delete(targetId);
    connectionStore.disconnect(targetId);
  }

  return {
    activeClient,
    devicesStore,
    targetsStore,
    connectionStore,
    forwardAndFetchTargets,
    connectToTarget,
    getClient,
    disconnectTarget,
  };
}
