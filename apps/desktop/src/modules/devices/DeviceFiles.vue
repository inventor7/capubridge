<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { invoke } from "@tauri-apps/api/core";
import { useQuery, useQueryClient } from "@tanstack/vue-query";
import {
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Image,
  Film,
  Music,
  Package,
  FileText,
  File,
  Code,
  Archive,
  Link,
  Trash2,
  ArrowDown,
  ArrowUp,
  RefreshCw,
  Eye,
  EyeOff,
  Loader2,
  HardDrive,
  AlertCircle,
  X,
  CheckCircle2,
} from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { useDevicesStore } from "@/stores/devices.store";
import type { Component } from "vue";
import type { FileEntry } from "@/types/adb.types";

const devicesStore = useDevicesStore();
const qc = useQueryClient();
const serial = computed(() => devicesStore.selectedDevice?.serial ?? "");

// ── Tree state ──────────────────────────────────────────────────────────────

const ROOT_DIRS = ["/sdcard", "/storage", "/Download", "/data", "/system", "/cache"];

const expandedDirs = ref<Set<string>>(new Set(["/sdcard"]));
const treeContents = ref<Map<string, FileEntry[]>>(new Map());
const treeLoading = ref<Set<string>>(new Set());
const selectedDir = ref("/sdcard");

// ── UI state ─────────────────────────────────────────────────────────────────

const showHidden = ref(false);
const pendingDelete = ref<FileEntry | null>(null);

interface PullStatus {
  name: string;
  savedPath?: string;
  error?: string;
}
const pullStatus = ref<PullStatus | null>(null);

// ── Right panel: files in selected dir ────────────────────────────────────

const {
  data: entries,
  isLoading,
  isError,
  error,
  refetch,
} = useQuery({
  queryKey: computed(() => ["adb-dir", serial.value, selectedDir.value]),
  queryFn: () =>
    invoke<FileEntry[]>("adb_list_dir", { serial: serial.value, path: selectedDir.value }),
  enabled: computed(() => !!serial.value),
  staleTime: 15_000,
});

const displayEntries = computed(() => {
  const all = entries.value ?? [];
  const filtered = showHidden.value ? all : all.filter((e) => !e.name.startsWith("."));
  // Dirs first, then files; both groups sorted alphabetically
  return [
    ...filtered.filter((e) => e.entryType === "dir" || e.entryType === "symlink").sort((a, b) => a.name.localeCompare(b.name)),
    ...filtered.filter((e) => e.entryType === "file" || e.entryType === "other").sort((a, b) => a.name.localeCompare(b.name)),
  ];
});

const hiddenCount = computed(() => {
  const all = entries.value ?? [];
  return all.filter((e) => e.name.startsWith(".")).length;
});

// ── Tree loading ────────────────────────────────────────────────────────────

async function loadTreeDir(path: string) {
  if (!serial.value) return;
  if (treeLoading.value.has(path) || treeContents.value.has(path)) return;
  treeLoading.value.add(path);
  try {
    const items = await invoke<FileEntry[]>("adb_list_dir", { serial: serial.value, path });
    treeContents.value.set(path, items);
  } catch {
    treeContents.value.set(path, []); // mark loaded even on error
  } finally {
    treeLoading.value.delete(path);
  }
}

async function toggleDir(path: string, e: MouseEvent) {
  e.stopPropagation();
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path);
  } else {
    expandedDirs.value.add(path);
    await loadTreeDir(path);
  }
}

function selectDir(path: string) {
  selectedDir.value = path;
}

// Flat dir list for the tree sidebar
const flatDirs = computed(() => {
  const result: { path: string; name: string; depth: number; isLoading: boolean }[] = [];

  function walk(paths: string[], depth: number) {
    for (const p of paths) {
      const segments = p.split("/").filter(Boolean);
      const name = segments[segments.length - 1] || p;
      result.push({
        path: p,
        name,
        depth,
        isLoading: treeLoading.value.has(p),
      });
      if (expandedDirs.value.has(p) && treeContents.value.has(p)) {
        const subdirs = (treeContents.value.get(p) ?? [])
          .filter((e) => e.entryType === "dir" || e.entryType === "symlink")
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((e) => `${p}/${e.name}`);
        walk(subdirs, depth + 1);
      }
    }
  }

  walk(ROOT_DIRS, 0);
  return result;
});

// ── Breadcrumb ───────────────────────────────────────────────────────────────

const breadcrumbs = computed(() => {
  const parts = selectedDir.value.split("/").filter(Boolean);
  const crumbs: { label: string; path: string }[] = [{ label: "/", path: "/" }];
  let acc = "";
  for (const p of parts) {
    acc += "/" + p;
    crumbs.push({ label: p, path: acc });
  }
  return crumbs;
});

// ── Icons & formatting ────────────────────────────────────────────────────

function getIcon(entry: FileEntry): { icon: Component; color: string } {
  if (entry.entryType === "dir")
    return { icon: FolderOpen, color: "text-amber-400" };
  if (entry.entryType === "symlink")
    return { icon: Link, color: "text-indigo-400" };
  const ext = entry.name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg", "jpeg", "png", "gif", "webp", "bmp", "svg", "heic"].includes(ext))
    return { icon: Image, color: "text-sky-400" };
  if (["mp4", "mkv", "mov", "avi", "webm", "flv", "3gp"].includes(ext))
    return { icon: Film, color: "text-violet-400" };
  if (["mp3", "flac", "wav", "ogg", "m4a", "aac"].includes(ext))
    return { icon: Music, color: "text-emerald-400" };
  if (ext === "apk") return { icon: Package, color: "text-orange-400" };
  if (["zip", "tar", "gz", "bz2", "xz", "7z", "rar"].includes(ext))
    return { icon: Archive, color: "text-yellow-400" };
  if (
    ["js", "ts", "java", "kt", "py", "rb", "go", "rs", "cpp", "c", "h", "swift", "dart", "xml", "json", "yaml", "yml", "sh"].includes(ext)
  )
    return { icon: Code, color: "text-cyan-400" };
  if (["txt", "md", "pdf", "doc", "docx", "csv", "log"].includes(ext))
    return { icon: FileText, color: "text-blue-400" };
  return { icon: File, color: "text-muted-foreground/40" };
}

function formatSize(bytes: number, isDir: boolean): string {
  if (isDir) return "—";
  if (bytes === 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(2)} GB`;
}

interface PermChar {
  char: string;
  cls: string;
}

function formatPermissions(perm: string): PermChar[] {
  const typeMap: Record<number, "r" | "w" | "x"> = {
    0: "r", 1: "w", 2: "x",
    3: "r", 4: "w", 5: "x",
    6: "r", 7: "w", 8: "x",
  };
  const colorMap = {
    r: "text-sky-400/60",
    w: "text-amber-400/60",
    x: "text-emerald-400/70",
  };
  return perm
    .split("")
    .slice(0, 9)
    .map((c, i) => ({
      char: c,
      cls:
        c === "-"
          ? "text-muted-foreground/20"
          : colorMap[typeMap[i]] ?? "text-muted-foreground/40",
    }));
}

// ── Navigate into dir ─────────────────────────────────────────────────────

function openDir(entry: FileEntry) {
  if (entry.entryType !== "dir" && entry.entryType !== "symlink") return;
  const newPath =
    selectedDir.value === "/" ? `/${entry.name}` : `${selectedDir.value}/${entry.name}`;
  selectedDir.value = newPath;
  // Also expand it in the sidebar
  if (!treeContents.value.has(newPath)) {
    expandedDirs.value.add(newPath);
    void loadTreeDir(newPath);
  }
}

// ── Actions ────────────────────────────────────────────────────────────────

async function handlePull(entry: FileEntry) {
  const fullPath =
    selectedDir.value === "/" ? `/${entry.name}` : `${selectedDir.value}/${entry.name}`;
  pullStatus.value = { name: entry.name };
  try {
    const savedPath = await invoke<string>("adb_pull_file", {
      serial: serial.value,
      path: fullPath,
    });
    pullStatus.value = { name: entry.name, savedPath };
    setTimeout(() => {
      pullStatus.value = null;
    }, 5000);
  } catch (e) {
    pullStatus.value = { name: entry.name, error: String(e) };
    setTimeout(() => {
      pullStatus.value = null;
    }, 6000);
  }
}

function requestDelete(entry: FileEntry) {
  pendingDelete.value = entry;
}

async function confirmDelete() {
  const entry = pendingDelete.value;
  if (!entry) return;
  pendingDelete.value = null;
  const fullPath =
    selectedDir.value === "/" ? `/${entry.name}` : `${selectedDir.value}/${entry.name}`;
  try {
    await invoke("adb_delete_file", {
      serial: serial.value,
      path: fullPath,
      isDir: entry.entryType === "dir",
    });
    // Invalidate both the current dir query and the tree cache
    await qc.invalidateQueries({ queryKey: ["adb-dir", serial.value, selectedDir.value] });
    treeContents.value.delete(selectedDir.value);
  } catch (e) {
    console.error("Delete failed:", e);
  }
}

// ── Init ──────────────────────────────────────────────────────────────────

watch(
  serial,
  (s) => {
    if (s) void loadTreeDir("/sdcard");
  },
  { immediate: true },
);
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <!-- No device state -->
    <div
      v-if="!serial"
      class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
    >
      <HardDrive class="h-10 w-10 text-muted-foreground/15" />
      <p class="text-sm text-muted-foreground/40">No device connected</p>
      <p class="text-xs text-muted-foreground/25">Select a device to browse its file system</p>
    </div>

    <template v-else>
      <!-- Toolbar -->
      <div
        class="flex h-10 shrink-0 items-center gap-1 border-b border-border/30 bg-surface-2 px-3"
      >
        <!-- Breadcrumb -->
        <div class="flex min-w-0 flex-1 items-center gap-0.5 font-mono text-xs">
          <template v-for="(crumb, i) in breadcrumbs" :key="crumb.path">
            <span
              class="cursor-pointer rounded px-1 py-0.5 text-muted-foreground/50 hover:bg-surface-3 hover:text-foreground transition-colors"
              :class="{ 'text-foreground!': i === breadcrumbs.length - 1 }"
              @click="selectDir(crumb.path)"
            >{{ crumb.label }}</span>
            <ChevronRight
              v-if="i < breadcrumbs.length - 1"
              class="h-3 w-3 shrink-0 text-muted-foreground/25"
            />
          </template>
        </div>

        <!-- Controls -->
        <div class="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
            :title="showHidden ? 'Hide dotfiles' : 'Show dotfiles'"
            @click="showHidden = !showHidden"
          >
            <EyeOff v-if="showHidden" class="h-3.5 w-3.5" />
            <Eye v-else class="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            class="h-7 w-7 text-muted-foreground/50 hover:text-foreground"
            title="Refresh"
            @click="refetch()"
          >
            <RefreshCw class="h-3.5 w-3.5" :class="{ 'animate-spin': isLoading }" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            class="h-7 gap-1.5 px-2 text-xs text-muted-foreground/70"
            title="Push file to device (coming soon)"
            disabled
          >
            <ArrowUp class="h-3 w-3" />
            Push
          </Button>
        </div>
      </div>

      <!-- Pull status toast -->
      <Transition
        enter-active-class="transition-all duration-200"
        enter-from-class="opacity-0 -translate-y-1"
        leave-active-class="transition-all duration-150"
        leave-to-class="opacity-0 -translate-y-1"
      >
        <div
          v-if="pullStatus"
          class="mx-3 mt-2 flex shrink-0 items-center gap-2 rounded-md border px-3 py-2 text-xs"
          :class="
            pullStatus.error
              ? 'border-error/30 bg-error/10 text-error'
              : pullStatus.savedPath
                ? 'border-success/30 bg-success/10 text-success'
                : 'border-border/30 bg-surface-2 text-muted-foreground'
          "
        >
          <Loader2 v-if="!pullStatus.savedPath && !pullStatus.error" class="h-3 w-3 animate-spin" />
          <CheckCircle2 v-else-if="pullStatus.savedPath" class="h-3 w-3 shrink-0" />
          <AlertCircle v-else class="h-3 w-3 shrink-0" />
          <span class="min-w-0 truncate">
            <template v-if="!pullStatus.savedPath && !pullStatus.error">
              Pulling <span class="font-medium">{{ pullStatus.name }}</span>…
            </template>
            <template v-else-if="pullStatus.savedPath">
              Saved to <span class="font-medium font-mono">{{ pullStatus.savedPath }}</span>
            </template>
            <template v-else>{{ pullStatus.error }}</template>
          </span>
          <button class="ml-auto shrink-0 opacity-60 hover:opacity-100" @click="pullStatus = null">
            <X class="h-3 w-3" />
          </button>
        </div>
      </Transition>

      <!-- Delete confirm dialog -->
      <Transition
        enter-active-class="transition-all duration-150"
        enter-from-class="opacity-0 scale-95"
        leave-active-class="transition-all duration-100"
        leave-to-class="opacity-0 scale-95"
      >
        <div
          v-if="pendingDelete"
          class="absolute inset-0 z-50 flex items-center justify-center bg-background/60 backdrop-blur-sm"
        >
          <div
            class="mx-4 w-full max-w-sm rounded-lg border border-border/50 bg-surface-2 p-5 shadow-2xl"
          >
            <p class="mb-1 text-sm font-medium text-foreground">Delete file?</p>
            <p class="mb-4 text-xs text-muted-foreground">
              <span class="font-mono text-foreground/80">{{ pendingDelete.name }}</span> will be
              permanently deleted from the device.
            </p>
            <div class="flex justify-end gap-2">
              <Button variant="ghost" size="sm" class="text-xs" @click="pendingDelete = null">
                Cancel
              </Button>
              <Button
                variant="destructive"
                size="sm"
                class="text-xs"
                @click="confirmDelete()"
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      </Transition>

      <!-- Main layout -->
      <ResizablePanelGroup direction="horizontal" class="flex-1 overflow-hidden">
        <!-- Sidebar: directory tree -->
        <ResizablePanel :default-size="18" :min-size="12" :max-size="35">
          <div class="flex h-full flex-col border-r border-border/30">
            <div
              class="flex h-8 shrink-0 items-center gap-2 border-b border-border/20 px-3"
            >
              <HardDrive class="h-3 w-3 text-muted-foreground/30" />
              <span class="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/40">
                Folders
              </span>
            </div>

            <ScrollArea class="flex-1">
              <div class="py-1">
                <template v-for="dir in flatDirs" :key="dir.path">
                  <button
                    class="group flex w-full items-center gap-1.5 py-1.5 pr-2 text-xs transition-colors"
                    :style="{ paddingLeft: `${8 + dir.depth * 12}px` }"
                    :class="
                      selectedDir === dir.path
                        ? 'bg-surface-3 text-foreground'
                        : 'text-muted-foreground/60 hover:bg-surface-3/50 hover:text-muted-foreground'
                    "
                    @click="selectDir(dir.path)"
                  >
                    <!-- Expand toggle -->
                    <span
                      class="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-surface-3"
                      @click.stop="toggleDir(dir.path, $event)"
                    >
                      <Loader2
                        v-if="dir.isLoading"
                        class="h-2.5 w-2.5 animate-spin text-muted-foreground/40"
                      />
                      <ChevronDown
                        v-else-if="expandedDirs.has(dir.path)"
                        class="h-2.5 w-2.5 text-muted-foreground/50"
                      />
                      <ChevronRight
                        v-else
                        class="h-2.5 w-2.5 text-muted-foreground/30"
                      />
                    </span>
                    <FolderOpen
                      class="h-3.5 w-3.5 shrink-0"
                      :class="
                        selectedDir === dir.path ? 'text-amber-400' : 'text-amber-400/40'
                      "
                    />
                    <span class="truncate">{{ dir.name }}</span>
                  </button>
                </template>
              </div>
            </ScrollArea>
          </div>
        </ResizablePanel>

        <ResizableHandle with-handle />

        <!-- Right panel: file list -->
        <ResizablePanel :default-size="82">
          <div class="flex h-full flex-col overflow-hidden">
            <!-- Loading skeleton -->
            <div v-if="isLoading" class="flex flex-1 flex-col gap-0">
              <div
                class="flex h-9 shrink-0 items-center border-b border-border/30 bg-surface-2 px-4"
              >
                <div class="h-3 w-24 animate-pulse rounded bg-muted/20" />
              </div>
              <div class="flex-1 overflow-hidden">
                <div
                  v-for="i in 12"
                  :key="i"
                  class="flex items-center gap-4 border-b border-border/10 px-4 py-2.5"
                >
                  <div class="h-4 w-4 animate-pulse rounded bg-muted/15" />
                  <div class="h-3 animate-pulse rounded bg-muted/20" :style="`width:${40 + (i * 37) % 120}px`" />
                  <div class="ml-auto flex gap-6">
                    <div class="h-3 w-14 animate-pulse rounded bg-muted/10" />
                    <div class="h-3 w-28 animate-pulse rounded bg-muted/10" />
                    <div class="h-3 w-16 animate-pulse rounded bg-muted/10" />
                  </div>
                </div>
              </div>
            </div>

            <!-- Error state -->
            <div
              v-else-if="isError"
              class="flex flex-1 flex-col items-center justify-center gap-3 text-center"
            >
              <AlertCircle class="h-8 w-8 text-error/40" />
              <p class="text-sm text-muted-foreground/60">Failed to list directory</p>
              <p class="max-w-xs truncate font-mono text-xs text-muted-foreground/40">
                {{ error }}
              </p>
              <Button variant="outline" size="sm" class="mt-1 text-xs" @click="refetch()">
                Retry
              </Button>
            </div>

            <!-- Empty dir -->
            <div
              v-else-if="displayEntries.length === 0"
              class="flex flex-1 flex-col items-center justify-center gap-2 text-center"
            >
              <FolderOpen class="h-9 w-9 text-muted-foreground/10" />
              <p class="text-sm text-muted-foreground/40">Empty directory</p>
              <p v-if="hiddenCount > 0 && !showHidden" class="text-xs text-muted-foreground/30">
                {{ hiddenCount }} hidden {{ hiddenCount === 1 ? "item" : "items" }} —
                <button
                  class="text-muted-foreground/50 underline underline-offset-2 hover:text-muted-foreground"
                  @click="showHidden = true"
                >
                  show
                </button>
              </p>
            </div>

            <!-- File table -->
            <template v-else>
              <div class="flex flex-1 flex-col overflow-hidden">
                <div class="flex-1 overflow-auto">
                  <table class="w-full text-xs">
                    <thead class="sticky top-0 z-10">
                      <tr
                        class="border-b border-border/30 bg-surface-2 text-left uppercase tracking-wider text-muted-foreground/40"
                      >
                        <th class="px-4 py-2 font-medium">Name</th>
                        <th class="w-24 px-4 py-2 text-right font-medium">Size</th>
                        <th class="w-36 px-4 py-2 font-medium">Modified</th>
                        <th class="w-24 px-4 py-2 font-medium">Perms</th>
                        <th class="w-16 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="entry in displayEntries"
                        :key="entry.name"
                        class="group border-b border-border/15 transition-colors hover:bg-surface-2/60"
                        :class="{
                          'cursor-pointer': entry.entryType === 'dir' || entry.entryType === 'symlink',
                        }"
                        @dblclick="openDir(entry)"
                      >
                        <!-- Name -->
                        <td class="px-4 py-2">
                          <div class="flex items-center gap-2.5">
                            <component
                              :is="getIcon(entry).icon"
                              class="h-4 w-4 shrink-0"
                              :class="getIcon(entry).color"
                            />
                            <span
                              class="text-sm font-medium text-foreground/90"
                              :class="{ 'text-amber-400/90': entry.entryType === 'dir' }"
                            >{{ entry.name }}</span>
                            <span
                              v-if="entry.entryType === 'symlink'"
                              class="rounded bg-indigo-500/10 px-1 py-0.5 text-[10px] text-indigo-400/70"
                            >
                              link
                            </span>
                          </div>
                        </td>

                        <!-- Size -->
                        <td class="w-24 px-4 py-2 text-right font-mono text-muted-foreground/50">
                          {{ formatSize(entry.size, entry.entryType === "dir") }}
                        </td>

                        <!-- Modified -->
                        <td class="w-36 px-4 py-2 font-mono text-muted-foreground/50">
                          {{ entry.modified }}
                        </td>

                        <!-- Permissions -->
                        <td class="w-24 px-4 py-2 font-mono tracking-widest">
                          <span
                            v-for="(p, i) in formatPermissions(entry.permissions)"
                            :key="i"
                            :class="p.cls"
                          >{{ p.char }}</span>
                        </td>

                        <!-- Actions -->
                        <td class="w-16 px-4 py-2">
                          <div
                            class="flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100"
                          >
                            <Button
                              v-if="entry.entryType === 'file'"
                              variant="ghost"
                              size="sm"
                              title="Pull to Downloads"
                              class="h-6 w-6 text-muted-foreground/40 hover:text-foreground"
                              @click.stop="handlePull(entry)"
                            >
                              <ArrowDown class="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Delete"
                              class="h-6 w-6 text-muted-foreground/40 hover:text-error"
                              @click.stop="requestDelete(entry)"
                            >
                              <Trash2 class="h-3 w-3" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Status bar -->
                <div
                  class="flex h-7 shrink-0 items-center border-t border-border/20 bg-surface-2/50 px-4"
                >
                  <span class="text-[11px] text-muted-foreground/35">
                    {{ displayEntries.length }} item{{ displayEntries.length === 1 ? "" : "s" }}
                    <template v-if="hiddenCount > 0 && !showHidden">
                      · {{ hiddenCount }} hidden
                    </template>
                  </span>
                </div>
              </div>
            </template>
          </div>
        </ResizablePanel>
      </ResizablePanelGroup>
    </template>
  </div>
</template>
