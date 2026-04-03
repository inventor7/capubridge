<script setup lang="ts">
import Sidebar from "./Sidebar.vue";
import StatusBar from "./StatusBar.vue";
import PanelHeader from "./PanelHeader.vue";
import TargetSelector from "./TargetSelector.vue";
import { useDevicesStore } from "@/stores/devices.store";
import { useTargetsStore } from "@/stores/targets.store";
import { useConnectionStore } from "@/stores/connection.store";
import { computed } from "vue";

const devicesStore = useDevicesStore();
const targetsStore = useTargetsStore();
const connectionStore = useConnectionStore();

const connStatus = computed(() => {
  const target = targetsStore.selectedTarget;
  if (!target) return "disconnected";
  return connectionStore.connections.get(target.id)?.status ?? "disconnected";
});
</script>

<template>
  <div class="app-shell">
    <Sidebar />
    <div class="app-main">
      <PanelHeader>
        <template #target>
          <TargetSelector />
        </template>
      </PanelHeader>
      <div class="app-content">
        <RouterView />
      </div>
    </div>
    <StatusBar>
      <template #left>
        <span v-if="devicesStore.selectedDevice" class="status-text">
          {{ devicesStore.selectedDevice.model || devicesStore.selectedDevice.serial }}
        </span>
        <span v-else class="status-muted">No device</span>
      </template>
      <template #center>
        <span v-if="targetsStore.selectedTarget" class="status-text status-url">
          {{ targetsStore.selectedTarget.url }}
        </span>
      </template>
      <template #right>
        <span class="status-dot" :class="connStatus" :title="connStatus" />
        <span class="status-text">{{ connStatus }}</span>
      </template>
    </StatusBar>
  </div>
</template>

<style scoped>
.app-shell {
  display: grid;
  grid-template-columns: var(--sidebar-width) 1fr;
  grid-template-rows: 1fr var(--status-bar-height);
  height: 100vh;
  background-color: var(--surface-base);
  overflow: hidden;
}

.app-main {
  display: flex;
  flex-direction: column;
  grid-column: 2;
  grid-row: 1;
  overflow: hidden;
  border-left: 1px solid var(--border-default);
}

.app-content {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.status-text {
  font-size: 11px;
  color: var(--text-secondary);
}

.status-muted {
  font-size: 11px;
  color: var(--text-tertiary);
}

.status-url {
  max-width: 400px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.connected {
  background-color: var(--status-success);
}
.status-dot.connecting {
  background-color: var(--status-warning);
}
.status-dot.disconnected,
.status-dot.error {
  background-color: var(--text-tertiary);
}
</style>
