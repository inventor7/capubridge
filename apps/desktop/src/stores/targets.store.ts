import { ref } from "vue";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { CDPTarget } from "@/types/cdp.types";
import type { ConnectionSource } from "@/types/connection.types";

interface RawCDPTarget {
  id: string;
  type: string;
  title: string;
  url: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
}

export const useTargetsStore = defineStore("targets", () => {
  const targets = ref<CDPTarget[]>([]);
  const selectedTarget = ref<CDPTarget | null>(null);
  const fetchingSources = ref<Set<string>>(new Set());
  const error = ref<string | null>(null);

  async function fetchTargetsForSource(source: ConnectionSource) {
    const key = source.type === "adb" ? `adb:${source.serial}` : `chrome:${source.port}`;
    fetchingSources.value.add(key);
    error.value = null;

    try {
      let raw: RawCDPTarget[];

      if (source.type === "chrome") {
        raw = await invoke<RawCDPTarget[]>("chrome_fetch_targets", { port: source.port });
      } else {
        const res = await fetch(`http://localhost:${source.port}/json`);
        raw = (await res.json()) as RawCDPTarget[];
      }

      const enriched = raw
        .filter((t) => ["page", "background_page", "iframe"].includes(t.type))
        .map((t) => ({
          id: t.id,
          type: t.type as CDPTarget["type"],
          title: t.title,
          url: t.url,
          webSocketDebuggerUrl: t.webSocketDebuggerUrl,
          source: source.type as "adb" | "chrome",
          deviceSerial: source.type === "adb" ? source.serial : undefined,
          faviconUrl: t.faviconUrl,
        }));

      targets.value = targets.value.filter((t) => t.source !== source.type).concat(enriched);
    } catch (err) {
      error.value = String(err);
    } finally {
      fetchingSources.value.delete(key);
    }
  }

  function selectTarget(target: CDPTarget) {
    selectedTarget.value = target;
  }

  function clearTargetsForSource(sourceType: "adb" | "chrome") {
    targets.value = targets.value.filter((t) => t.source !== sourceType);
    if (selectedTarget.value?.source === sourceType) {
      selectedTarget.value = null;
    }
  }

  function clearAllTargets() {
    targets.value = [];
    selectedTarget.value = null;
  }

  return {
    targets,
    selectedTarget,
    fetchingSources,
    error,
    fetchTargetsForSource,
    selectTarget,
    clearTargetsForSource,
    clearAllTargets,
  };
});
