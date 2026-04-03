import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { invoke } from "@tauri-apps/api/core";
import type { ADBDevice } from "@/types/adb.types";

export const useDevicesStore = defineStore("devices", () => {
  const devices = ref<ADBDevice[]>([]);
  const selectedDevice = ref<ADBDevice | null>(null);
  const isPolling = ref(false);
  const error = ref<string | null>(null);

  let pollTimer: ReturnType<typeof setInterval> | null = null;

  const onlineDevices = computed(() => devices.value.filter((d) => d.status === "online"));

  async function refreshDevices() {
    try {
      devices.value = await invoke<ADBDevice[]>("adb_list_devices");
      error.value = null;

      // If selected device is no longer present, deselect
      if (
        selectedDevice.value &&
        !devices.value.find((d) => d.serial === selectedDevice.value!.serial)
      ) {
        selectedDevice.value = null;
      }
    } catch (err) {
      error.value = String(err);
    }
  }

  function startPolling(intervalMs = 3000) {
    if (isPolling.value) return;
    isPolling.value = true;
    void refreshDevices();
    pollTimer = setInterval(() => void refreshDevices(), intervalMs);
  }

  function stopPolling() {
    if (pollTimer !== null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    isPolling.value = false;
  }

  function selectDevice(device: ADBDevice) {
    selectedDevice.value = device;
  }

  return {
    devices,
    selectedDevice,
    isPolling,
    error,
    onlineDevices,
    refreshDevices,
    startPolling,
    stopPolling,
    selectDevice,
  };
});
