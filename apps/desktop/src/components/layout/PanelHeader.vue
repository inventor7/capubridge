<script setup lang="ts">
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

const panelTitle = computed(() => {
  const path = route.path;
  if (path.startsWith("/devices")) return "Devices";
  if (path.startsWith("/storage")) return "Storage";
  if (path.startsWith("/network")) return "Network";
  if (path.startsWith("/console")) return "Console";
  if (path.startsWith("/hybrid")) return "Hybrid Tools";
  if (path.startsWith("/settings")) return "Settings";
  return "";
});
</script>

<template>
  <header class="panel-header">
    <div class="panel-header-title">{{ panelTitle }}</div>
    <div class="panel-header-controls">
      <slot name="controls" />
    </div>
    <!-- Target selector will be wired in T09 -->
    <div class="panel-header-target">
      <slot name="target" />
    </div>
  </header>
</template>

<style scoped>
.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  height: var(--panel-header-height);
  padding: 0 12px;
  background-color: var(--surface-raised);
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.panel-header-title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  min-width: 80px;
}

.panel-header-controls {
  display: flex;
  align-items: center;
  gap: 6px;
}

.panel-header-target {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 8px;
}
</style>
