<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from "vue";
import {
  Search,
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  AlertCircle,
  Globe,
  ChevronUp,
  ChevronDown,
  Check,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocalStorage } from "@/composables/useStorage";
import JsonViewer from "./JsonViewer.vue";

const filter = ref("");
const selectedOrigin = ref("");
const showExpandedDialog = ref(false);
const copiedRaw = ref(false);
const dialogEntryIdx = ref(-1);
const jsonViewerRef = ref<InstanceType<typeof JsonViewer> | null>(null);

const { useOrigins, useEntries, getDomain } = useLocalStorage();

const { data: origins, isLoading: isLoadingOrigins, refetch: refetchOrigins } = useOrigins();

const {
  data: entries,
  isLoading: isLoadingEntries,
  isError,
  refetch: refetchEntries,
} = useEntries(selectedOrigin);

const filtered = computed(() => {
  if (!entries.value) return [];
  if (!filter.value) return entries.value;
  const q = filter.value.toLowerCase();
  return entries.value.filter(
    (e) => e.key.toLowerCase().includes(q) || e.value.toLowerCase().includes(q),
  );
});

const dialogEntry = computed(() =>
  dialogEntryIdx.value >= 0 ? filtered.value[dialogEntryIdx.value] : null,
);

const dialogEntrySize = computed(() => {
  if (!dialogEntry.value) return "0 B";
  const bytes = new Blob([dialogEntry.value.value]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
});

const dialogParsedValue = computed(() => {
  if (!dialogEntry.value) return null;
  try {
    return JSON.parse(dialogEntry.value.value);
  } catch {
    return null;
  }
});

const dialogRawValue = computed(() => dialogEntry.value?.value ?? "");

function selectOrigin(origin: string) {
  selectedOrigin.value = origin;
}

async function deleteItem(key: string) {
  if (!selectedOrigin.value) return;
  await getDomain().deleteItem(selectedOrigin.value, key);
  void refetchEntries();
}

function refetchAll() {
  void refetchOrigins();
  if (selectedOrigin.value) void refetchEntries();
}

async function copyValue() {
  if (!dialogRawValue.value) return;
  await navigator.clipboard.writeText(dialogRawValue.value);
  copiedRaw.value = true;
  setTimeout(() => (copiedRaw.value = false), 2000);
}

function openDialog(idx: number) {
  dialogEntryIdx.value = idx;
  showExpandedDialog.value = true;
  copiedRaw.value = false;
}

function navigateDialog(direction: "prev" | "next") {
  if (filtered.value.length === 0) return;
  if (direction === "prev") {
    dialogEntryIdx.value =
      dialogEntryIdx.value <= 0 ? filtered.value.length - 1 : dialogEntryIdx.value - 1;
  } else {
    dialogEntryIdx.value =
      dialogEntryIdx.value >= filtered.value.length - 1 ? 0 : dialogEntryIdx.value + 1;
  }
  copiedRaw.value = false;
}

function formatSize(value: string): string {
  const bytes = new Blob([value]).size;
  return bytes < 1024 ? `${bytes} B` : `${(bytes / 1024).toFixed(1)} KB`;
}

function handleKeydown(e: KeyboardEvent) {
  if (!showExpandedDialog.value) return;

  if (e.ctrlKey && e.key === "f") {
    e.preventDefault();
    setTimeout(() => {
      const jv = jsonViewerRef.value;
      jv?.filterInputRef?.focus();
      jv?.filterInputRef?.select();
    }, 100);
  }

  if (e.ctrlKey && e.key === "ArrowUp") {
    e.preventDefault();
    navigateDialog("prev");
  }

  if (e.ctrlKey && e.key === "ArrowDown") {
    e.preventDefault();
    navigateDialog("next");
  }
}

onMounted(() => {
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  window.removeEventListener("keydown", handleKeydown);
});

watch(showExpandedDialog, (open) => {
  if (open && dialogEntryIdx.value < 0 && filtered.value.length > 0) {
    dialogEntryIdx.value = 0;
  }
});

watch(origins, (newOrigins) => {
  if (newOrigins && newOrigins.length > 0 && !selectedOrigin.value) {
    selectedOrigin.value = newOrigins[0]!;
  }
});
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <ResizablePanelGroup direction="horizontal" class="flex-1">
      <ResizablePanel :default-size="15" :min-size="10" :max-size="30">
        <div class="flex h-full flex-col border-r border-border/30">
          <ScrollArea class="flex-1">
            <div v-if="isLoadingOrigins" class="flex items-center justify-center py-8">
              <RefreshCw :size="14" class="animate-spin text-muted-foreground/40" />
            </div>

            <div
              v-else-if="!origins?.length"
              class="flex flex-col items-center justify-center py-8 px-3 text-center"
            >
              <AlertCircle :size="16" class="text-muted-foreground/30 mb-2" />
              <p class="text-[11px] text-muted-foreground/40">No origins found</p>
            </div>

            <div v-else class="py-1">
              <button
                v-for="origin in origins"
                :key="origin"
                class="w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors"
                :class="
                  selectedOrigin === origin
                    ? 'text-foreground font-medium bg-surface-3 border-l-2 border-foreground'
                    : 'text-muted-foreground/50 hover:bg-surface-3/50 hover:text-muted-foreground border-l-2 border-transparent'
                "
                @click="selectOrigin(origin)"
              >
                <Globe :size="13" class="shrink-0 opacity-40" />
                <span class="truncate text-left font-mono text-xs">{{ origin }}</span>
              </button>
            </div>
          </ScrollArea>
        </div>
      </ResizablePanel>
      <ResizableHandle with-handle />

      <ResizablePanel :default-size="85">
        <div class="flex flex-col h-full">
          <div
            v-if="!selectedOrigin"
            class="flex flex-1 items-center justify-center text-sm text-muted-foreground/30"
          >
            Select an origin from the sidebar
          </div>

          <template v-else>
            <div class="flex items-center gap-2 border-b border-border/30">
              <div
                class="flex items-center gap-2 bg-surface-3 rounded-md px-2.5 py-1.5 border border-border/30 focus-within:border-border/60 transition-colors"
              >
                <Search class="w-3.5 h-3.5 text-muted-foreground/50" />
                <Input
                  v-model="filter"
                  class="h-6 text-xs font-mono bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-muted-foreground/40"
                  placeholder="Filter keys or values…"
                />
              </div>
              <span class="text-xs text-muted-foreground/40"
                >({{ filtered.length ?? 0 }} entries)</span
              >
              <div class="flex-1" />
              <Button variant="ghost" size="sm" class="h-6 text-xs" @click="refetchAll()">
                <RefreshCw :size="12" class="mr-1" />
                Refresh
              </Button>
            </div>

            <div class="flex-1 overflow-auto">
              <div v-if="isLoadingEntries" class="flex items-center justify-center py-8">
                <RefreshCw :size="14" class="animate-spin text-muted-foreground/40" />
              </div>

              <div
                v-else-if="isError || !filtered?.length"
                class="flex flex-col items-center justify-center py-8 px-3 text-center"
              >
                <AlertCircle :size="16" class="text-muted-foreground/30 mb-2" />
                <p class="text-[11px] text-muted-foreground/40">
                  {{ isError ? "Failed to load" : "No LocalStorage entries" }}
                </p>
              </div>

              <table v-else class="w-full text-xs">
                <thead class="sticky top-0 z-10">
                  <tr
                    class="bg-surface-2 text-left text-muted-foreground/50 uppercase tracking-wider border-b border-border/30"
                  >
                    <th class="px-4 py-2.5 font-medium">Key</th>
                    <th class="px-4 py-2.5 font-medium">Value</th>
                    <th class="px-4 py-2.5 font-medium w-20">Size</th>
                    <th class="px-4 py-2.5 font-medium w-24"></th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="(entry, idx) in filtered"
                    :key="entry.key"
                    @dblclick="openDialog(idx)"
                    class="border-b border-border/20 cursor-pointer transition-colors data-row group"
                  >
                    <td
                      class="px-4 py-2.5 font-mono text-sm text-info/70 whitespace-nowrap max-w-[200px] truncate"
                    >
                      {{ entry.key }}
                    </td>
                    <td
                      class="px-4 py-2.5 font-mono text-sm text-secondary-foreground max-w-md truncate"
                    >
                      {{ entry.value }}
                    </td>
                    <td class="px-4 py-2.5 font-mono text-xs text-muted-foreground/40">
                      {{ formatSize(entry.value) }}
                    </td>
                    <td class="px-4 py-2.5">
                      <div
                        class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-muted-foreground/40 hover:text-muted-foreground h-7 w-7"
                          @click.stop="openDialog(idx)"
                        >
                          <Search class="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-muted-foreground/40 hover:text-muted-foreground h-7 w-7"
                        >
                          <Copy class="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-muted-foreground/40 hover:text-muted-foreground h-7 w-7"
                        >
                          <Pencil class="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          class="text-muted-foreground/40 hover:text-error h-7 w-7"
                          @click.stop="deleteItem(entry.key)"
                        >
                          <Trash2 class="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </template>
        </div>
      </ResizablePanel>
    </ResizablePanelGroup>
  </div>

  <Dialog v-model:open="showExpandedDialog">
    <DialogContent class="max-w-[90vw] min-w-[70vw] w-[90vw] h-[85vh] p-0 gap-0 flex flex-col">
      <DialogHeader class="px-6 py-2.5 border-b border-border/30 shrink-0">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <button
              class="text-muted-foreground/40 hover:text-foreground transition-colors"
              @click="navigateDialog('prev')"
            >
              <ChevronUp :size="16" />
            </button>
            <button
              class="text-muted-foreground/40 hover:text-foreground transition-colors"
              @click="navigateDialog('next')"
            >
              <ChevronDown :size="16" />
            </button>
            <DialogTitle class="text-base font-medium">
              {{ dialogEntry?.key }}
            </DialogTitle>
            <span class="text-xs text-muted-foreground/40">{{ dialogEntrySize }}</span>
          </div>
          <div class="flex items-center gap-2 mr-4">
            <div
              class="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold tabular-nums"
            >
              <span>{{ dialogEntryIdx + 1 }}</span>
              <span class="text-muted-foreground/40">/</span>
              <span>{{ filtered.length }}</span>
            </div>
            <Button variant="outline" size="sm" class="h-7 text-xs gap-1.5" @click="copyValue()">
              <Check v-if="copiedRaw" :size="13" class="text-green-500" />
              <Copy v-else :size="13" />
              {{ copiedRaw ? "Copied" : "Copy" }}
            </Button>
          </div>
        </div>
      </DialogHeader>
      <div class="flex-1 overflow-auto p-6">
        <JsonViewer
          v-if="dialogParsedValue !== null"
          ref="jsonViewerRef"
          :value="dialogParsedValue"
        />
        <pre v-else class="text-sm font-mono text-foreground whitespace-pre-wrap m-0">{{
          dialogRawValue
        }}</pre>
      </div>
    </DialogContent>
  </Dialog>
</template>
