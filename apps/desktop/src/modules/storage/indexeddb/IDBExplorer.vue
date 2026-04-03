<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Database, ChevronRight, ChevronDown } from "lucide-vue-next";
import { getMockIDBRecords, mockDatabases, type MockIDBRecord } from "@/data/mock-data";
import IDBTable from "./IDBTable.vue";
import IDBTableToolbar from "./IDBTableToolbar.vue";

const route = useRoute();
const router = useRouter();

const expandedDbs = ref<Set<string>>(new Set(["appDatabase"]));

const dbName = computed(() => decodeURIComponent((route.params["db"] as string) ?? ""));
const storeName = computed(() => decodeURIComponent((route.params["store"] as string) ?? ""));
const page = ref(0);
const pageSize = ref(50);

const allRecords = computed<MockIDBRecord[]>(() => {
  if (!dbName.value || !storeName.value) return [];
  return getMockIDBRecords(dbName.value, storeName.value);
});

const pagedRecords = computed(() => {
  const start = page.value * pageSize.value;
  const end = start + pageSize.value;
  return allRecords.value.slice(start, end);
});

const hasMore = computed(() => (page.value + 1) * pageSize.value < allRecords.value.length);

const isLoading = ref(false);
const isError = ref(false);

function toggleDb(name: string) {
  if (expandedDbs.value.has(name)) expandedDbs.value.delete(name);
  else expandedDbs.value.add(name);
}

function navigateToStore(dbName: string, storeName: string) {
  void router.push(
    `/storage/indexeddb/${encodeURIComponent(dbName)}/${encodeURIComponent(storeName)}`,
  );
}

function isStoreActive(dbName: string, storeName: string) {
  return route.params["db"] === dbName && route.params["store"] === storeName;
}

function prevPage() {
  if (page.value > 0) page.value--;
}
function nextPage() {
  if (hasMore.value) page.value++;
}
function handlePageSizeChange(size: number) {
  pageSize.value = size;
  page.value = 0;
}

function refetch() {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
  }, 300);
}

const tableRecords = computed(() =>
  pagedRecords.value.map((r) => ({ key: r.key, value: r.value })),
);
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <div class="flex flex-1 overflow-hidden">
      <!-- Sidebar: database tree -->
      <aside class="flex w-[200px] shrink-0 flex-col border-r border-border overflow-hidden">
        <div class="flex h-7 shrink-0 items-center border-b border-border/50 px-3">
          <span
            class="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/40"
          >
            Databases
          </span>
        </div>
        <div class="flex-1 overflow-y-auto py-1">
          <ul>
            <li v-for="db in mockDatabases" :key="db.name">
              <button
                class="flex w-full items-center gap-1.5 px-3 py-[5px] text-[12px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
                @click="toggleDb(db.name)"
              >
                <component
                  :is="expandedDbs.has(db.name) ? ChevronDown : ChevronRight"
                  :size="11"
                  class="shrink-0 opacity-50"
                />
                <Database :size="12" class="shrink-0 opacity-50" />
                <span class="flex-1 truncate text-left">{{ db.name }}</span>
                <span class="text-[10px] font-mono text-muted-foreground/30 shrink-0"
                  >v{{ db.version }}</span
                >
              </button>
              <ul v-if="expandedDbs.has(db.name)">
                <li v-for="store in db.stores" :key="store.name">
                  <button
                    class="flex w-full items-center gap-1.5 py-[4px] pl-[26px] pr-3 text-[11px] transition-colors"
                    :class="
                      isStoreActive(db.name, store.name)
                        ? 'bg-primary/10 text-primary font-medium border-l-2 border-primary pl-[24px]'
                        : 'text-muted-foreground/60 hover:bg-accent hover:text-accent-foreground'
                    "
                    @click="navigateToStore(db.name, store.name)"
                  >
                    <span class="truncate text-left">{{ store.name }}</span>
                    <span class="ml-auto text-[10px] font-mono text-muted-foreground/30 shrink-0">{{
                      store.recordCount
                    }}</span>
                  </button>
                </li>
              </ul>
            </li>
          </ul>
        </div>
      </aside>

      <!-- Main content -->
      <div class="flex flex-1 flex-col overflow-hidden">
        <div
          v-if="!dbName || !storeName"
          class="flex flex-1 items-center justify-center text-[12px] text-muted-foreground/40"
        >
          Select a store from the sidebar
        </div>

        <template v-else>
          <IDBTableToolbar
            :store-name="storeName"
            :db-name="dbName"
            :is-loading="isLoading"
            :page="page"
            :page-size="pageSize"
            :has-more="hasMore"
            :record-count="pagedRecords.length"
            @refresh="refetch"
            @prev="prevPage"
            @next="nextPage"
            @page-size-change="handlePageSizeChange"
          />

          <div
            v-if="isError"
            class="shrink-0 border-b border-border bg-destructive/10 px-3 py-1.5 text-[11px] text-status-error"
          >
            Failed to load records
          </div>

          <IDBTable :records="tableRecords" :is-loading="isLoading" />
        </template>
      </div>
    </div>
  </div>
</template>
