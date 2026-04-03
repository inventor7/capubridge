import { ref } from "vue";
import { defineStore } from "pinia";
import type { CDPTarget } from "@/types/cdp.types";

// Port assignment: device index → base port 9222
export const CDP_BASE_PORT = 9222;

export const useTargetsStore = defineStore("targets", () => {
  const targets = ref<CDPTarget[]>([]);
  const selectedTarget = ref<CDPTarget | null>(null);
  const isFetching = ref(false);
  const error = ref<string | null>(null);

  // Fetch from already-forwarded port (call adb_forward_cdp first)
  async function fetchTargets(port = CDP_BASE_PORT) {
    isFetching.value = true;
    error.value = null;
    try {
      const res = await fetch(`http://localhost:${port}/json`);
      const raw = (await res.json()) as CDPTarget[];
      targets.value = raw.filter((t) => ["page", "background_page"].includes(t.type));
    } catch (err) {
      error.value = String(err);
      targets.value = [];
    } finally {
      isFetching.value = false;
    }
  }

  function selectTarget(target: CDPTarget) {
    selectedTarget.value = target;
  }

  function clearTargets() {
    targets.value = [];
    selectedTarget.value = null;
  }

  return {
    targets,
    selectedTarget,
    isFetching,
    error,
    fetchTargets,
    selectTarget,
    clearTargets,
  };
});
