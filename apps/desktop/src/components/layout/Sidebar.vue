<script setup lang="ts">
import { useRoute } from "vue-router";
import { Smartphone, Database, Network, Terminal, Puzzle, Settings } from "lucide-vue-next";

const route = useRoute();

const navItems = [
  { to: "/devices", icon: Smartphone, label: "Devices" },
  { to: "/storage", icon: Database, label: "Storage" },
  { to: "/network", icon: Network, label: "Network" },
  { to: "/console", icon: Terminal, label: "Console" },
  { to: "/hybrid", icon: Puzzle, label: "Hybrid Tools" },
] as const;

function isActive(path: string) {
  return route.path.startsWith(path);
}
</script>

<template>
  <nav class="sidebar">
    <div class="sidebar-nav">
      <RouterLink
        v-for="item in navItems"
        :key="item.to"
        :to="item.to"
        class="sidebar-item"
        :class="{ active: isActive(item.to) }"
        :title="item.label"
      >
        <component :is="item.icon" :size="18" />
      </RouterLink>
    </div>
    <div class="sidebar-bottom">
      <RouterLink
        to="/settings"
        class="sidebar-item"
        :class="{ active: isActive('/settings') }"
        title="Settings"
      >
        <Settings :size="18" />
      </RouterLink>
    </div>
  </nav>
</template>

<style scoped>
.sidebar {
  display: flex;
  flex-direction: column;
  width: var(--sidebar-width);
  background-color: var(--surface-sunken);
  border-right: 1px solid var(--border-default);
  grid-column: 1;
  grid-row: 1;
}

.sidebar-nav {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 8px 0;
  gap: 2px;
}

.sidebar-bottom {
  padding: 8px 0;
  border-top: 1px solid var(--border-default);
}

.sidebar-item {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 40px;
  color: var(--text-tertiary);
  text-decoration: none;
  transition:
    color 0.15s,
    background-color 0.15s;
  border-radius: 0;
  cursor: pointer;
}

.sidebar-item:hover {
  color: var(--text-secondary);
  background-color: var(--border-default);
}

.sidebar-item.active {
  color: var(--accent-primary);
  background-color: rgba(79, 142, 247, 0.1);
  border-right: 2px solid var(--accent-primary);
}
</style>
