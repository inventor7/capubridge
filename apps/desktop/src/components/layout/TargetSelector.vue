<script setup lang="ts">
import { watch } from "vue";
import { ChevronDown, Loader, CircleDot } from "lucide-vue-next";
import { useCDP } from "@/composables/useCDP";
import type { CDPTarget } from "@/types/cdp.types";

const { devicesStore, targetsStore, connectionStore, forwardAndFetchTargets, connectToTarget } =
  useCDP();

// When a device is selected, auto-forward and fetch targets
watch(
  () => devicesStore.selectedDevice,
  async (device) => {
    targetsStore.clearTargets();
    if (device?.status === "online") {
      await forwardAndFetchTargets(device.serial);
    }
  },
);

async function handleTargetSelect(target: CDPTarget) {
  targetsStore.selectTarget(target);
  try {
    await connectToTarget(target);
  } catch (err) {
    console.error("CDP connect failed:", err);
  }
}

function connStatus(targetId: string) {
  return connectionStore.connections.get(targetId)?.status ?? "disconnected";
}
</script>

<template>
  <div class="target-selector">
    <!-- No device selected -->
    <div v-if="!devicesStore.selectedDevice" class="selector-placeholder">Select a device</div>

    <!-- Device selected, fetching targets -->
    <div v-else-if="targetsStore.isFetching" class="selector-loading">
      <Loader :size="12" class="spin" />
      <span>Fetching targets…</span>
    </div>

    <!-- No targets found -->
    <div
      v-else-if="targetsStore.targets.length === 0 && !targetsStore.isFetching"
      class="selector-placeholder"
    >
      No inspectable targets
    </div>

    <!-- Target dropdown -->
    <div v-else class="selector-dropdown">
      <div class="selector-selected">
        <span
          class="conn-dot"
          :class="
            targetsStore.selectedTarget
              ? connStatus(targetsStore.selectedTarget.id)
              : 'disconnected'
          "
        />
        <span class="selector-text">
          {{ targetsStore.selectedTarget?.title || "Pick a target" }}
        </span>
        <ChevronDown :size="12" />
      </div>

      <div class="selector-menu">
        <button
          v-for="target in targetsStore.targets"
          :key="target.id"
          class="selector-item"
          :class="{ active: targetsStore.selectedTarget?.id === target.id }"
          @click="handleTargetSelect(target)"
        >
          <CircleDot :size="10" />
          <div class="selector-item-info">
            <span class="item-title">{{ target.title || "(no title)" }}</span>
            <span class="item-url">{{ target.url }}</span>
          </div>
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.target-selector {
  position: relative;
  display: flex;
  align-items: center;
  height: 100%;
}

.selector-placeholder,
.selector-loading {
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.selector-dropdown {
  position: relative;
}

.selector-dropdown:hover .selector-menu {
  display: flex;
}

.selector-selected {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid var(--border-default);
  background-color: var(--surface-overlay);
  min-width: 180px;
  max-width: 320px;
}

.selector-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.selector-menu {
  display: none;
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 4px;
  background-color: var(--surface-overlay);
  border: 1px solid var(--border-default);
  border-radius: 6px;
  padding: 4px;
  min-width: 320px;
  max-width: 420px;
  max-height: 280px;
  overflow-y: auto;
  flex-direction: column;
  gap: 2px;
  z-index: 100;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.selector-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 8px;
  border-radius: 4px;
  background: none;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  text-align: left;
  width: 100%;
  transition: background-color 0.1s;
}

.selector-item:hover {
  background-color: var(--border-default);
}

.selector-item.active {
  background-color: rgba(79, 142, 247, 0.1);
  color: var(--text-primary);
}

.selector-item-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.item-title {
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.item-url {
  font-size: 10px;
  color: var(--text-tertiary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.conn-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  flex-shrink: 0;
  display: inline-block;
}

.conn-dot.connected {
  background-color: var(--status-success);
}

.conn-dot.connecting {
  background-color: var(--status-warning);
}

.conn-dot.disconnected,
.conn-dot.error {
  background-color: var(--text-tertiary);
}

.spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}
</style>
