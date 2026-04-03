<script setup lang="ts">
import { RefreshCw, ChevronLeft, ChevronRight } from "lucide-vue-next";

const props = defineProps<{
  storeName: string;
  dbName: string;
  isLoading: boolean;
  page: number;
  pageSize: number;
  hasMore: boolean;
  recordCount: number;
}>();

const emit = defineEmits<{
  refresh: [];
  prev: [];
  next: [];
  pageSizeChange: [size: number];
}>();

const pageSizeOptions = [50, 100, 500];
</script>

<template>
  <div class="toolbar">
    <div class="toolbar-left">
      <span class="toolbar-title">{{ props.storeName }}</span>
      <span class="toolbar-subtitle">{{ props.dbName }}</span>
    </div>

    <div class="toolbar-right">
      <span class="record-count">{{ props.recordCount }} records</span>

      <select
        class="page-size-select"
        :value="props.pageSize"
        @change="emit('pageSizeChange', Number(($event.target as HTMLSelectElement).value))"
      >
        <option v-for="s in pageSizeOptions" :key="s" :value="s">{{ s }} / page</option>
      </select>

      <div class="pagination">
        <button
          class="toolbar-btn"
          :disabled="props.page === 0"
          title="Previous page"
          @click="emit('prev')"
        >
          <ChevronLeft :size="14" />
        </button>
        <span class="page-num">{{ props.page + 1 }}</span>
        <button
          class="toolbar-btn"
          :disabled="!props.hasMore"
          title="Next page"
          @click="emit('next')"
        >
          <ChevronRight :size="14" />
        </button>
      </div>

      <button
        class="toolbar-btn"
        :class="{ spinning: props.isLoading }"
        title="Refresh"
        @click="emit('refresh')"
      >
        <RefreshCw :size="14" />
      </button>
    </div>
  </div>
</template>

<style scoped>
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: var(--toolbar-height);
  padding: 0 12px;
  border-bottom: 1px solid var(--border-default);
  background-color: var(--surface-raised);
  flex-shrink: 0;
  gap: 12px;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.toolbar-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.toolbar-subtitle {
  font-size: 11px;
  color: var(--text-tertiary);
}

.toolbar-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.record-count {
  font-size: 11px;
  color: var(--text-tertiary);
}

.page-size-select {
  font-size: 11px;
  background-color: var(--surface-overlay);
  color: var(--text-secondary);
  border: 1px solid var(--border-default);
  border-radius: 4px;
  padding: 2px 4px;
  cursor: pointer;
}

.pagination {
  display: flex;
  align-items: center;
  gap: 4px;
}

.page-num {
  font-size: 11px;
  color: var(--text-secondary);
  min-width: 16px;
  text-align: center;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  background: none;
  border: 1px solid var(--border-default);
  border-radius: 4px;
  color: var(--text-secondary);
  cursor: pointer;
  transition:
    background-color 0.1s,
    color 0.1s;
}

.toolbar-btn:hover:not(:disabled) {
  background-color: var(--border-default);
  color: var(--text-primary);
}

.toolbar-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.spinning svg {
  animation: spin 0.8s linear infinite;
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
