<script setup lang="ts">
import { computed } from "vue";
import {
  useVueTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
} from "@tanstack/vue-table";
import { ref } from "vue";
import type { IDBRecord } from "utils";

const props = defineProps<{
  records: IDBRecord[];
  isLoading: boolean;
}>();

const sorting = ref<SortingState>([]);

// Infer columns from first record's keys + always include the key column
const columnHelper = createColumnHelper<IDBRecord>();

const columns = computed(() => {
  if (props.records.length === 0) return [];

  const firstValue = props.records[0]!.value;
  const valueKeys =
    firstValue !== null && typeof firstValue === "object"
      ? Object.keys(firstValue as Record<string, unknown>).slice(0, 20)
      : [];

  const cols = [
    columnHelper.accessor("key", {
      header: "Key",
      size: 120,
      cell: (info) => String(info.getValue()),
    }),
  ];

  if (valueKeys.length > 0) {
    for (const key of valueKeys) {
      cols.push(
        columnHelper.accessor(
          (row) => {
            const v = row.value as Record<string, unknown>;
            return v?.[key];
          },
          {
            id: key,
            header: key,
            cell: (info) => {
              const v = info.getValue();
              if (v === null || v === undefined) return "";
              if (typeof v === "object") return JSON.stringify(v);
              return String(v);
            },
          },
        ),
      );
    }
  } else {
    cols.push(
      columnHelper.accessor("value", {
        header: "Value",
        cell: (info) => {
          const v = info.getValue();
          if (v === null || v === undefined) return "";
          if (typeof v === "object") return JSON.stringify(v);
          return String(v);
        },
      }),
    );
  }

  return cols;
});

const table = useVueTable({
  get data() {
    return props.records;
  },
  get columns() {
    return columns.value;
  },
  state: {
    get sorting() {
      return sorting.value;
    },
  },
  onSortingChange: (updater) => {
    sorting.value = typeof updater === "function" ? updater(sorting.value) : updater;
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
});
</script>

<template>
  <div class="idb-table-wrapper">
    <!-- Loading skeleton -->
    <div v-if="isLoading && records.length === 0" class="table-loading">
      <div v-for="i in 8" :key="i" class="skeleton-row" />
    </div>

    <!-- Empty -->
    <div v-else-if="!isLoading && records.length === 0" class="table-empty">
      No records in this store
    </div>

    <!-- Table -->
    <table v-else class="idb-table">
      <thead>
        <tr>
          <th
            v-for="header in table.getFlatHeaders()"
            :key="header.id"
            :style="{ width: header.getSize() + 'px' }"
            class="th"
            :class="{ sortable: header.column.getCanSort() }"
            @click="header.column.getToggleSortingHandler()?.($event)"
          >
            <span class="th-content">
              <flexRender :render="header.column.columnDef.header" :props="header.getContext()" />
              <span v-if="header.column.getIsSorted() === 'asc'" class="sort-icon">↑</span>
              <span v-else-if="header.column.getIsSorted() === 'desc'" class="sort-icon">↓</span>
            </span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="row in table.getRowModel().rows" :key="row.id" class="tr">
          <td v-for="cell in row.getVisibleCells()" :key="cell.id" class="td">
            <flexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style scoped>
.idb-table-wrapper {
  flex: 1;
  overflow: auto;
  position: relative;
}

.idb-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  table-layout: fixed;
}

.th {
  position: sticky;
  top: 0;
  background-color: var(--surface-raised);
  border-bottom: 1px solid var(--border-strong);
  padding: 0 10px;
  height: 32px;
  text-align: left;
  font-weight: 600;
  font-size: 11px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  z-index: 1;
  user-select: none;
}

.th.sortable {
  cursor: pointer;
}

.th.sortable:hover {
  color: var(--text-primary);
  background-color: var(--surface-overlay);
}

.th-content {
  display: flex;
  align-items: center;
  gap: 4px;
}

.sort-icon {
  font-size: 10px;
  color: var(--accent-primary);
}

.tr:hover .td {
  background-color: rgba(255, 255, 255, 0.03);
}

.td {
  padding: 0 10px;
  height: 28px;
  border-bottom: 1px solid var(--border-default);
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 300px;
}

.table-loading {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.skeleton-row {
  height: 28px;
  border-radius: 4px;
  background: linear-gradient(
    90deg,
    var(--surface-raised) 25%,
    var(--surface-overlay) 50%,
    var(--surface-raised) 75%
  );
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}

.table-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 120px;
  color: var(--text-tertiary);
  font-size: 12px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}
</style>
