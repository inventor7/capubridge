<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { Database, ChevronRight, ChevronDown, Loader } from "lucide-vue-next";
import { useIDB } from "@/composables/useIDB";
import { useTargetsStore } from "@/stores/targets.store";

const router = useRouter();
const route = useRoute();
const targetsStore = useTargetsStore();
const { useDatabases } = useIDB();

const { data: databases, isLoading, isError, error } = useDatabases();

const expandedDbs = ref<Set<string>>(new Set());

function toggleDb(dbName: string) {
  if (expandedDbs.value.has(dbName)) {
    expandedDbs.value.delete(dbName);
  } else {
    expandedDbs.value.add(dbName);
  }
}

function navigateToStore(dbName: string, storeName: string) {
  void router.push(`/storage/idb/${encodeURIComponent(dbName)}/${encodeURIComponent(storeName)}`);
}

function isStoreActive(dbName: string, storeName: string) {
  return route.params["db"] === dbName && route.params["store"] === storeName;
}
</script>

<template>
  <aside class="storage-sidebar">
    <div class="sidebar-header">Storage</div>

    <div v-if="!targetsStore.selectedTarget" class="sidebar-empty">Connect to a target first</div>

    <div v-else-if="isLoading" class="sidebar-loading">
      <Loader :size="14" class="spin" />
      <span>Loading…</span>
    </div>

    <div v-else-if="isError" class="sidebar-error">
      {{ error?.message }}
    </div>

    <div v-else-if="databases && databases.length === 0" class="sidebar-empty">
      No IndexedDB databases
    </div>

    <ul v-else class="sidebar-tree">
      <li v-for="db in databases" :key="db.name" class="tree-db">
        <button class="tree-db-header" @click="toggleDb(db.name)">
          <component :is="expandedDbs.has(db.name) ? ChevronDown : ChevronRight" :size="12" />
          <Database :size="13" />
          <span class="tree-db-name">{{ db.name }}</span>
          <span class="tree-db-version">v{{ db.version }}</span>
        </button>

        <ul v-if="expandedDbs.has(db.name)" class="tree-stores">
          <li v-for="store in db.objectStoreNames" :key="store" class="tree-store">
            <button
              class="tree-store-btn"
              :class="{ active: isStoreActive(db.name, store) }"
              @click="navigateToStore(db.name, store)"
            >
              {{ store }}
            </button>
          </li>
        </ul>
      </li>
    </ul>

    <!-- LocalStorage link -->
    <div class="sidebar-section">
      <RouterLink to="/storage/localstorage" class="sidebar-link"> LocalStorage </RouterLink>
      <RouterLink to="/storage/cache" class="sidebar-link"> Cache API </RouterLink>
      <RouterLink to="/storage/opfs" class="sidebar-link"> OPFS </RouterLink>
    </div>
  </aside>
</template>

<style scoped>
.storage-sidebar {
  width: var(--storage-sidebar-width);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-raised);
  border-right: 1px solid var(--border-default);
  overflow-y: auto;
  overflow-x: hidden;
}

.sidebar-header {
  padding: 10px 12px 6px;
  font-size: 11px;
  font-weight: 600;
  color: var(--text-tertiary);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}

.sidebar-empty,
.sidebar-loading,
.sidebar-error {
  padding: 16px 12px;
  font-size: 12px;
  color: var(--text-tertiary);
  display: flex;
  align-items: center;
  gap: 6px;
}

.sidebar-error {
  color: var(--status-error);
}

.sidebar-tree {
  list-style: none;
  padding: 4px 0;
}

.tree-db {
  /* no margin */
}

.tree-db-header {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  padding: 5px 8px;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text-secondary);
  font-size: 12px;
  text-align: left;
  transition: background-color 0.1s;
}

.tree-db-header:hover {
  background-color: var(--border-default);
}

.tree-db-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-db-version {
  font-size: 10px;
  color: var(--text-tertiary);
  flex-shrink: 0;
}

.tree-stores {
  list-style: none;
  padding-left: 24px;
}

.tree-store-btn {
  display: block;
  width: 100%;
  padding: 4px 8px;
  background: none;
  border: none;
  border-radius: 3px;
  cursor: pointer;
  font-size: 12px;
  color: var(--text-tertiary);
  text-align: left;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  transition:
    background-color 0.1s,
    color 0.1s;
}

.tree-store-btn:hover {
  color: var(--text-secondary);
  background-color: var(--border-default);
}

.tree-store-btn.active {
  color: var(--accent-primary);
  background-color: rgba(79, 142, 247, 0.1);
}

.sidebar-section {
  padding: 8px;
  border-top: 1px solid var(--border-default);
  margin-top: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar-link {
  display: block;
  padding: 4px 8px;
  font-size: 12px;
  color: var(--text-tertiary);
  text-decoration: none;
  border-radius: 3px;
  transition:
    background-color 0.1s,
    color 0.1s;
}

.sidebar-link:hover {
  color: var(--text-secondary);
  background-color: var(--border-default);
}

.sidebar-link.router-link-active {
  color: var(--accent-primary);
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
