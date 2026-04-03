<script setup lang="ts">
// Slots: left (device), center (target URL), right (CDP status)
// Wired in T12
</script>

<template>
  <footer class="status-bar">
    <div class="status-bar-left">
      <slot name="left">
        <span class="status-placeholder">No device</span>
      </slot>
    </div>
    <div class="status-bar-center">
      <slot name="center" />
    </div>
    <div class="status-bar-right">
      <slot name="right">
        <span class="status-dot disconnected" title="Not connected" />
      </slot>
    </div>
  </footer>
</template>

<style scoped>
.status-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--status-bar-height);
  padding: 0 10px;
  background-color: var(--surface-sunken);
  border-top: 1px solid var(--border-default);
  grid-column: 1 / -1;
  grid-row: 2;
  font-size: 11px;
  color: var(--text-tertiary);
  user-select: none;
}

.status-bar-left,
.status-bar-center,
.status-bar-right {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-bar-right {
  justify-content: flex-end;
}

.status-placeholder {
  color: var(--text-tertiary);
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

.status-dot.disconnected {
  background-color: var(--text-tertiary);
}

.status-dot.error {
  background-color: var(--status-error);
}
</style>
