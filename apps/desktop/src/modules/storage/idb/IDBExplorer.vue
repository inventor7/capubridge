<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute } from "vue-router";
import { useIDB } from "@/composables/useIDB";
import IDBTable from "./IDBTable.vue";
import IDBTableToolbar from "./IDBTableToolbar.vue";

const route = useRoute();
const { useRecords } = useIDB();

const dbName = computed(() => decodeURIComponent((route.params["db"] as string) ?? ""));
const storeName = computed(() => decodeURIComponent((route.params["store"] as string) ?? ""));
const page = ref(0);
const pageSize = ref(50);

const { data, isLoading, isError, error, refetch } = useRecords(dbName, storeName, page, pageSize);

function prevPage() {
  if (page.value > 0) page.value--;
}

function nextPage() {
  if (data.value?.hasMore) page.value++;
}

function handlePageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 0;
}
</script>

<template>
  <div class="idb-explorer">
    <div v-if="!dbName || !storeName" class="empty">Select a store from the sidebar</div>

    <template v-else>
      <IDBTableToolbar
        :store-name="storeName"
        :db-name="dbName"
        :is-loading="isLoading"
        :page="page"
        :page-size="pageSize"
        :has-more="data?.hasMore ?? false"
        :record-count="data?.records.length ?? 0"
        @refresh="refetch"
        @prev="prevPage"
        @next="nextPage"
        @page-size-change="handlePageSizeChange"
      />

      <div v-if="isError" class="error-msg">{{ error?.message }}</div>

      <IDBTable :records="data?.records ?? []" :is-loading="isLoading" />
    </template>
  </div>
</template>

<style scoped>
.idb-explorer {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.empty {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-tertiary);
  font-size: 12px;
}

.error-msg {
  padding: 8px 12px;
  font-size: 12px;
  color: var(--status-error);
  background-color: rgba(240, 64, 64, 0.08);
  border-bottom: 1px solid var(--border-default);
  flex-shrink: 0;
}
</style>
