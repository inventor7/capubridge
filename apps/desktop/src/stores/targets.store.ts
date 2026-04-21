import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { CDPTarget } from "@/types/cdp.types";
import type { ConnectionSource } from "@/types/connection.types";
import type { SessionTargetSnapshot } from "@/types/session.types";
import { listTargetsEffect, refreshTargetsEffect, runSessionEffect } from "@/runtime/session";
import { useSourceStore } from "@/stores/source.store";

interface RawCDPTarget {
  id: string;
  type: string;
  title: string;
  url: string;
  devtoolsFrontendUrl?: string;
  webSocketDebuggerUrl: string;
  faviconUrl?: string;
  packageName?: string;
}

function mapRawTargetToCDP(source: ConnectionSource, target: RawCDPTarget): CDPTarget {
  return {
    id: target.id,
    type: (target.type as CDPTarget["type"]) || "page",
    title: target.title,
    url: target.url,
    devtoolsFrontendUrl: target.devtoolsFrontendUrl,
    webSocketDebuggerUrl: target.webSocketDebuggerUrl,
    source: source.type as "adb" | "chrome",
    deviceSerial: source.type === "adb" ? source.serial : undefined,
    faviconUrl: target.faviconUrl,
    packageName: target.packageName,
  };
}

function mapSessionTargetToCDP(target: SessionTargetSnapshot): CDPTarget {
  return {
    id: target.id,
    type: (target.type as CDPTarget["type"]) || "page",
    title: target.title,
    url: target.url,
    devtoolsFrontendUrl: target.devtoolsFrontendUrl,
    webSocketDebuggerUrl: target.webSocketDebuggerUrl,
    source: "adb",
    deviceSerial: target.serial,
    faviconUrl: target.faviconUrl,
    packageName: target.packageName,
    isStale: target.isStale,
    lastUpdatedAt: target.lastUpdatedAt,
  };
}

export const useTargetsStore = defineStore("targets", () => {
  const sourceStore = useSourceStore();
  const targets = ref<CDPTarget[]>([]);
  const selectedTarget = ref<CDPTarget | null>(null);
  const fetchingSources = ref<Set<string>>(new Set());
  const error = ref<string | null>(null);

  function isSameTargetSignature(a: CDPTarget, b: CDPTarget) {
    if (a.source !== b.source) return false;
    if ((a.deviceSerial ?? null) !== (b.deviceSerial ?? null)) return false;
    if (a.url && b.url) return a.url === b.url;
    return a.title === b.title && (a.packageName ?? "") === (b.packageName ?? "");
  }

  function replaceTargetsForSource(source: ConnectionSource, nextTargets: CDPTarget[]) {
    if (source.type === "adb") {
      targets.value = targets.value
        .filter((target) => target.deviceSerial !== source.serial)
        .concat(nextTargets);
      return;
    }

    targets.value = targets.value
      .filter((target) => target.source !== source.type)
      .concat(nextTargets);
  }

  function reconcileSelectedTarget() {
    const currentSelected = selectedTarget.value;
    if (!currentSelected) {
      return;
    }

    const replacement =
      targets.value.find((target) => target.id === currentSelected.id) ??
      targets.value.find((target) => isSameTargetSignature(currentSelected, target));
    if (replacement) {
      selectedTarget.value = replacement;
    }
  }

  async function hydrateAdbTargets(serial: string) {
    error.value = null;
    try {
      const source: ConnectionSource = { type: "adb", serial };
      const snapshots = await runSessionEffect(listTargetsEffect(serial), {
        operation: "session.listTargets",
      });
      replaceTargetsForSource(
        source,
        snapshots.map((target) => mapSessionTargetToCDP(target)),
      );
      reconcileSelectedTarget();
    } catch (err) {
      error.value = String(err);
    }
  }

  async function fetchTargetsForSource(source: ConnectionSource) {
    const key = source.type === "adb" ? `adb:${source.serial}` : `chrome:${source.port}`;
    if (fetchingSources.value.has(key)) return;

    fetchingSources.value.add(key);
    error.value = null;

    try {
      let raw: RawCDPTarget[] = [];

      if (source.type === "chrome") {
        raw = await invoke<RawCDPTarget[]>("chrome_fetch_targets", {
          port: source.port,
        });
      } else {
        const snapshots = await runSessionEffect(refreshTargetsEffect(source.serial), {
          operation: "session.refreshTargets",
        });
        replaceTargetsForSource(
          source,
          snapshots.map((target) => mapSessionTargetToCDP(target)),
        );
        reconcileSelectedTarget();
        return;
      }

      const enriched = raw.map((target) => mapRawTargetToCDP(source, target));
      replaceTargetsForSource(source, enriched);
      reconcileSelectedTarget();
    } catch (err) {
      error.value = String(err);
    } finally {
      fetchingSources.value.delete(key);
    }
  }

  function selectTarget(target: CDPTarget | null) {
    selectedTarget.value = target;
  }

  async function createChromeTarget(url: string, port: number) {
    const rawTarget = await invoke<RawCDPTarget>("chrome_open_target", {
      port,
      url,
    });
    const source: ConnectionSource = {
      type: "chrome",
      port,
      mode: "manual",
    };
    const target = mapRawTargetToCDP(source, rawTarget);
    targets.value = targets.value.filter((existing) => existing.id !== target.id).concat(target);
    selectedTarget.value = target;
    return target;
  }

  function clearTargetsForSerial(serial: string) {
    targets.value = targets.value.filter((t) => t.deviceSerial !== serial);
    if (selectedTarget.value?.deviceSerial === serial) {
      selectedTarget.value = null;
    }
  }

  function clearAllTargets() {
    targets.value = [];
    selectedTarget.value = null;
  }

  const visibleTargets = computed(() => {
    const activeAdbSerial = sourceStore.getAdbSource()?.serial ?? null;
    const hasChromeSource = sourceStore.hasChromeSource;

    return targets.value.filter((target) => {
      if (target.source === "adb") {
        return target.deviceSerial === activeAdbSerial;
      }
      return hasChromeSource;
    });
  });

  return {
    targets,
    visibleTargets,
    selectedTarget,
    fetchingSources,
    error,
    hydrateAdbTargets,
    fetchTargetsForSource,
    createChromeTarget,
    selectTarget,
    clearTargetsForSerial,
    clearAllTargets,
  };
});
