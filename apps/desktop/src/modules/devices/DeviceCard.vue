<script setup lang="ts">
import type { ADBDevice } from "@/types/adb.types";
import { Usb, Wifi } from "lucide-vue-next";

const props = defineProps<{
  device: ADBDevice;
  isSelected: boolean;
}>();

const emit = defineEmits<{
  select: [];
}>();

const statusLabel: Record<ADBDevice["status"], string> = {
  online: "Online",
  offline: "Offline",
  unauthorized: "Unauthorized",
  "no-permissions": "No Permissions",
};

const statusClass: Record<ADBDevice["status"], string> = {
  online: "status-online",
  offline: "status-offline",
  unauthorized: "status-warn",
  "no-permissions": "status-warn",
};
</script>

<template>
  <button class="device-card" :class="{ selected: props.isSelected }" @click="emit('select')">
    <div class="device-card-top">
      <span class="device-name">{{ props.device.model || props.device.serial }}</span>
      <span class="device-badge" :class="statusClass[props.device.status]">
        {{ statusLabel[props.device.status] }}
      </span>
    </div>
    <div class="device-card-bottom">
      <span class="device-serial">{{ props.device.serial }}</span>
      <component
        :is="props.device.connectionType === 'wifi' ? Wifi : Usb"
        :size="12"
        class="device-conn-icon"
      />
    </div>
    <p v-if="props.device.status === 'unauthorized'" class="device-hint">
      Accept the USB debugging prompt on the device
    </p>
  </button>
</template>

<style scoped>
.device-card {
  width: 100%;
  padding: 10px 12px;
  border-radius: 6px;
  background: none;
  border: 1px solid transparent;
  text-align: left;
  cursor: pointer;
  transition:
    background-color 0.1s,
    border-color 0.1s;
  color: var(--text-primary);
}

.device-card:hover {
  background-color: var(--border-default);
}

.device-card.selected {
  background-color: rgba(79, 142, 247, 0.08);
  border-color: var(--border-focus);
}

.device-card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}

.device-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.device-badge {
  font-size: 10px;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 10px;
  flex-shrink: 0;
}

.status-online {
  color: var(--status-success);
  background-color: rgba(61, 214, 140, 0.15);
}

.status-offline {
  color: var(--text-tertiary);
  background-color: var(--border-default);
}

.status-warn {
  color: var(--status-warning);
  background-color: rgba(240, 160, 48, 0.15);
}

.device-card-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.device-serial {
  font-size: 11px;
  color: var(--text-tertiary);
  font-family: monospace;
}

.device-conn-icon {
  color: var(--text-tertiary);
}

.device-hint {
  font-size: 11px;
  color: var(--status-warning);
  margin-top: 4px;
  line-height: 1.4;
}
</style>
