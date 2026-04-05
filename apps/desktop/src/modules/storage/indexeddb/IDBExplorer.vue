<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { Database, ChevronRight, ChevronDown, Search, RefreshCw } from "lucide-vue-next";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useIDB } from "@/composables/useIDB";
import type { IDBDatabaseInfo, IDBRecord } from "utils";
import IDBTable from "./IDBTable.vue";
import IDBTableToolbar from "./IDBTableToolbar.vue";

const route = useRoute();
const router = useRouter();

const expandedDbs = ref<Set<string>>(new Set());
const filter = ref("");
const page = ref(0);
const pageSize = ref(50);

const dbName = computed(() => decodeURIComponent((route.params["db"] as string) ?? ""));
const storeName = computed(() => decodeURIComponent((route.params["store"] as string) ?? ""));
const selectedOrigin = ref("");

const { useDatabases, useRecords } = useIDB();

const {
  data: databases,
  isLoading: isLoadingDbs,
  isFetching: isFetchingDbs,
  refetch: refetchDbs,
} = useDatabases();

const {
  data: recordsData,
  isLoading: isLoadingRecords,
  isFetching: isFetchingRecords,
  isError,
  refetch: refetchRecords,
} = useRecords(selectedOrigin, dbName, storeName, page, pageSize);

const isLoading = computed(() => isLoadingRecords.value || isFetchingRecords.value);
const hasMore = computed(() => recordsData.value?.hasMore ?? false);
const recordCount = computed(() => recordsData.value?.records.length ?? 0);

const filteredRecords = computed<IDBRecord[]>(() => {
  if (!recordsData.value?.records) return [];
  if (!filter.value) return recordsData.value.records;
  const q = filter.value.toLowerCase();
  return recordsData.value.records.filter(
    (r) =>
      String(r.key).toLowerCase().includes(q) || JSON.stringify(r.value).toLowerCase().includes(q),
  );
});

function toggleDb(name: string) {
  if (expandedDbs.value.has(name)) expandedDbs.value.delete(name);
  else expandedDbs.value.add(name);
}

function navigateToStore(db: string, store: string) {
  const dbInfo = databases.value?.find((d) => d.name === db);
  if (dbInfo) {
    selectedOrigin.value = dbInfo.origin;
  }
  void router.push(`/storage/indexeddb/${encodeURIComponent(db)}/${encodeURIComponent(store)}`);
}

function isStoreActive(db: string, store: string) {
  return dbName.value === db && storeName.value === store;
}

function getDbKey(db: IDBDatabaseInfo) {
  return `${db.origin}::${db.name}`;
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
  void refetchDbs();
  void refetchRecords();
}

watch([dbName, storeName], () => {
  page.value = 0;
  filter.value = "";
});

watch(
  databases,
  (dbs) => {
    if (dbs && dbs.length > 0 && expandedDbs.value.size === 0) {
      expandedDbs.value.add(dbs[0].name);
      selectedOrigin.value = dbs[0].origin;
    }
    for (const db of dbs ?? []) {
      for (const store of db.objectStoreNames) {
        if (isStoreActive(db.name, store)) {
          expandedDbs.value.add(db.name);
          break;
        }
      }
    }
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <ResizablePanelGroup direction="horizontal" class="flex-1">
      <ResizablePanel :default-size="15" :min-size="10" :max-size="30">
        <div class="flex h-full flex-col border-r border-border/30">
          <div
            class="flex items-center gap-2 bg-surface-3 rounded-md px-2.5 py-1.5 border border-border/30 focus-within:border-border/60 transition-colors"
          >
            <Search class="w-3.5 h-3.5 text-muted-foreground/50" />
            <Input
              v-model="filter"
              class="h-6 text-xs font-mono bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-muted-foreground/40"
              placeholder="Filter by key or value…"
            />
          </div>
          <ScrollArea class="flex-1">
            <div v-if="isLoadingDbs || isFetchingDbs" class="flex items-center justify-center py-8">
              <RefreshCw :size="14" class="animate-spin text-muted-foreground/40" />
            </div>

            <div
              v-else-if="!databases?.length"
              class="flex flex-col items-center justify-center py-8 px-3 text-center"
            >
              <Database :size="16" class="text-muted-foreground/30 mb-2" />
              <p class="text-[11px] text-muted-foreground/40">No IndexedDB databases found</p>
            </div>

            <ul v-else class="py-1">
              <li v-for="db in databases" :key="getDbKey(db)">
                <button
                  class="flex w-full items-center gap-2 px-3 py-2 text-xs text-foreground/70 transition-colors hover:bg-surface-3/50"
                  @click="toggleDb(db.name)"
                >
                  <component
                    :is="expandedDbs.has(db.name) ? ChevronDown : ChevronRight"
                    :size="12"
                    class="shrink-0 opacity-50"
                  />
                  <Database :size="13" class="shrink-0 opacity-40" />
                  <span class="flex-1 truncate text-left">{{ db.name }}</span>
                  <span class="text-[10px] font-mono text-muted-foreground/40 shrink-0"
                    >v{{ db.version }}</span
                  >
                </button>
                <ul v-if="expandedDbs.has(db.name)">
                  <li v-for="storeItem in db.objectStoreNames" :key="storeItem">
                    <button
                      class="flex w-full items-center gap-1.5 py-1.5 pl-[26px] pr-3 text-xs transition-colors"
                      :class="
                        isStoreActive(db.name, storeItem)
                          ? 'text-foreground font-medium bg-surface-3 border-l-2 border-foreground pl-[24px]'
                          : 'text-foreground/60 hover:bg-surface-3/50 hover:text-foreground/80'
                      "
                      @click="navigateToStore(db.name, storeItem)"
                    >
                      <span class="truncate text-left">{{ storeItem }}</span>
                    </button>
                  </li>
                </ul>
              </li>
            </ul>
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />
      <ResizablePanel :default-size="80">
        <div
          v-if="!dbName || !storeName"
          class="flex flex-1 items-center justify-center text-sm text-muted-foreground/30"
        >
          Select a store from the sidebar
        </div>

        <template v-else>
          <div class="flex flex-col h-full overflow-hidden">
            <IDBTableToolbar
              :store-name="storeName"
              :db-name="dbName"
              :is-loading="isLoading"
              :page="page"
              :page-size="pageSize"
              :has-more="hasMore"
              :record-count="recordCount"
              @refresh="refetch"
              @prev="prevPage"
              @next="nextPage"
              @page-size-change="handlePageSizeChange"
            />

            <div
              v-if="isError"
              class="shrink-0 border-b border-border/30 bg-error/[0.06] px-4 py-2 text-xs text-error"
            >
              Failed to load records. Make sure the target supports IndexedDB inspection.
            </div>

            <IDBTable :records="filteredRecords" :is-loading="isLoading" />
          </div>
        </template>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>
</template>
