<script setup lang="ts">
import { useDevicesStore } from "@/stores/devices.store";
import DeviceCard from "./DeviceCard.vue";
import { Smartphone } from "lucide-vue-next";

const devicesStore = useDevicesStore();
</script>

<template>
  <div class="device-list">
    <div v-if="devicesStore.devices.length === 0" class="empty-state">
      <Smartphone :size="32" class="empty-icon" />
      <p class="empty-title">No devices connected</p>
      <p class="empty-hint">Connect an Android device via USB or WiFi ADB</p>
    </div>

    <div v-else class="device-list-inner">
      <DeviceCard
        v-for="device in devicesStore.devices"
        :key="device.serial"
        :device="device"
        :is-selected="devicesStore.selectedDevice?.serial === device.serial"
        @select="devicesStore.selectDevice(device)"
      />
    </div>

    <div v-if="devicesStore.error" class="error-bar">
      {{ devicesStore.error }}
    </div>
  </div>
</template>

<style scoped>
.device-list {
  width: 280px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-default);
  background-color: var(--surface-raised);
  overflow: hidden;
}

.device-list-inner {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 24px;
  color: var(--text-tertiary);
  text-align: center;
}

.empty-icon {
  opacity: 0.4;
}

.empty-title {
  font-size: 13px;
  color: var(--text-secondary);
}

.empty-hint {
  font-size: 11px;
  color: var(--text-tertiary);
}

.error-bar {
  padding: 8px 12px;
  font-size: 11px;
  color: var(--status-error);
  background-color: rgba(240, 64, 64, 0.1);
  border-top: 1px solid var(--border-default);
}
</style>
