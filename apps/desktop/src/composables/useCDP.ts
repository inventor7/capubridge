import { computed, watch } from "vue";
import { useDevicesStore } from "@/stores/devices.store";
import { useTargetsStore } from "@/stores/targets.store";
import { useConnectionStore } from "@/stores/connection.store";
import { useSourceStore } from "@/stores/source.store";
import type { CDPTarget } from "@/types/cdp.types";
import type { ConnectionSource } from "@/types/connection.types";
import { CDPClient } from "utils";

export function useCDP() {
  const devicesStore = useDevicesStore();
  const targetsStore = useTargetsStore();
  const connectionStore = useConnectionStore();
  const sourceStore = useSourceStore();

  const activeClient = computed<CDPClient | null>(() => {
    const conn = connectionStore.activeConnection;
    if (!conn || conn.status !== "connected") return null;
    return connectionStore.getClient(conn.targetId) ?? null;
  });

  async function fetchTargetsForSource(source: ConnectionSource) {
    await targetsStore.fetchTargetsForSource(source);
  }

  async function refreshTargets() {
    for (const source of sourceStore.activeSources) {
      await fetchTargetsForSource(source);
    }
  }

  async function connectToTarget(target: CDPTarget): Promise<CDPClient> {
    return connectionStore.connect(target);
  }

  function getClient(targetId: string): CDPClient | undefined {
    return connectionStore.getClient(targetId);
  }

  function disconnectTarget(targetId: string) {
    connectionStore.disconnectTarget(targetId);
  }

  watch(
    () => devicesStore.selectedDevice,
    async (device) => {
      if (device?.status === "online") {
        await sourceStore.addAdbSource(device.serial);
        const source = sourceStore.getAdbSource();
        if (source) {
          await fetchTargetsForSource(source);
        }
      } else {
        await sourceStore.removeAdbSource();
        targetsStore.clearTargetsForSource("adb");
      }
    },
  );

  watch(
    () => sourceStore.getChromeSource(),
    async (chromeSource) => {
      if (chromeSource) {
        await fetchTargetsForSource(chromeSource);
      }
    },
  );

  return {
    activeClient,
    devicesStore,
    targetsStore,
    connectionStore,
    sourceStore,
    fetchTargetsForSource,
    refreshTargets,
    connectToTarget,
    getClient,
    disconnectTarget,
  };
}
