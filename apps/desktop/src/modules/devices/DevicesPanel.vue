<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import { useDevicesStore } from "@/stores/devices.store";
import DeviceList from "./DeviceList.vue";

const devicesStore = useDevicesStore();

onMounted(() => devicesStore.startPolling());
onUnmounted(() => devicesStore.stopPolling());
</script>

<template>
  <div class="devices-panel">
    <DeviceList />
  </div>
</template>

<style scoped>
.devices-panel {
  height: 100%;
  display: flex;
  overflow: hidden;
}
</style>
