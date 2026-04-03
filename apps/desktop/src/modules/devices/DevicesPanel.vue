<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import {
  Battery,
  Wifi,
  Usb,
  Monitor,
  Smartphone,
  HardDrive,
  Cpu,
  Search,
  Trash2,
  StopCircle,
  Download,
  ScreenShare,
  FolderOpen,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  Film,
  Image,
  Music,
  Package,
  File,
  X,
  Camera,
  Video,
  Gauge,
  Activity,
  Zap,
  Wifi as WifiIcon,
  ArrowDown,
  ArrowUp,
} from "lucide-vue-next";
import PanelHeader from "@/components/layout/PanelHeader.vue";
import { devices, logcatMessages, installedApps, webviewTargets, fileTree } from "@/data/mock-data";
import type { FileNode } from "@/data/mock-data";

type Tab = "info" | "logcat" | "apps" | "webview" | "files" | "screen" | "perf";

const tab = ref<Tab>("info");
const device = ref(devices[0]);

const tabs: { id: Tab; label: string }[] = [
  { id: "info", label: "Info" },
  { id: "logcat", label: "Logcat" },
  { id: "apps", label: "Apps" },
  { id: "webview", label: "WebView" },
  { id: "files", label: "Files" },
  { id: "screen", label: "Screen" },
  { id: "perf", label: "Performance" },
];

// ── Logcat ──────────────────────────────────────────────────────────────────
const logFilter = ref("");
const logPackage = ref("");
const logTag = ref("");
const activeLevels = ref(new Set(["V", "D", "I", "W", "E", "F"]));

const logLevelColor: Record<string, string> = {
  V: "text-muted-foreground",
  D: "text-secondary-foreground",
  I: "text-success",
  W: "text-warning",
  E: "text-error",
  F: "text-error font-bold",
};
const logLevelBg: Record<string, string> = {
  E: "bg-error/[0.03]",
  W: "bg-warning/[0.03]",
  F: "bg-error/[0.06]",
};

function toggleLevel(lvl: string) {
  if (activeLevels.value.has(lvl)) {
    activeLevels.value.delete(lvl);
  } else {
    activeLevels.value.add(lvl);
  }
}

const filteredLogs = computed(() =>
  logcatMessages.filter((m) => {
    if (!activeLevels.value.has(m.level)) return false;
    if (logTag.value && !m.tag.toLowerCase().includes(logTag.value.toLowerCase())) return false;
    if (logFilter.value && !m.message.toLowerCase().includes(logFilter.value.toLowerCase()))
      return false;
    return true;
  }),
);

// ── Apps ────────────────────────────────────────────────────────────────────
const appsView = ref<"grid" | "table">("grid");
const appsSearch = ref("");
const appsCategory = ref("All");
const selectedApp = ref<(typeof installedApps)[0] | null>(null);

const categories = ["All", ...Array.from(new Set(installedApps.map((a) => a.category)))];

const filteredApps = computed(() =>
  installedApps.filter((a) => {
    const q = appsSearch.value.toLowerCase();
    const matchSearch =
      !q || a.label.toLowerCase().includes(q) || a.packageName.toLowerCase().includes(q);
    const matchCat = appsCategory.value === "All" || a.category === appsCategory.value;
    return matchSearch && matchCat;
  }),
);

// ── Files ────────────────────────────────────────────────────────────────────
const expandedDirs = ref<Set<string>>(new Set(["/sdcard", "/sdcard/DCIM"]));
const selectedDir = ref<string>("/sdcard/DCIM/Camera");

function toggleDir(path: string) {
  if (expandedDirs.value.has(path)) {
    expandedDirs.value.delete(path);
  } else {
    expandedDirs.value.add(path);
  }
}

function getFileIcon(ext: string) {
  if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return Image;
  if (["mp4", "mkv", "mov", "avi"].includes(ext)) return Film;
  if (["mp3", "flac", "wav", "ogg"].includes(ext)) return Music;
  if (ext === "apk") return Package;
  if (["txt", "md", "pdf"].includes(ext)) return FileText;
  return File;
}

type FlatDir = { path: string; name: string; depth: number; node: FileNode & { type: "dir" } };

function flattenTree(nodes: FileNode[], prefix = "/sdcard", depth = 0): FlatDir[] {
  const result: FlatDir[] = [];
  for (const n of nodes) {
    if (n.type === "dir") {
      const path = `${prefix}/${n.name}`;
      result.push({ path, name: n.name, depth, node: n });
      if (expandedDirs.value.has(path)) {
        result.push(...flattenTree(n.children, path, depth + 1));
      }
    }
  }
  return result;
}

const flatDirs = computed(() => flattenTree(fileTree));

function getFilesInDir(path: string): (FileNode & { type: "file" })[] {
  const parts = path.replace("/sdcard/", "").split("/");
  let nodes: FileNode[] = fileTree;
  for (const part of parts) {
    const dir = nodes.find((n) => n.type === "dir" && n.name === part) as
      | (FileNode & { type: "dir" })
      | undefined;
    if (!dir) return [];
    nodes = dir.children;
  }
  return nodes.filter((n): n is FileNode & { type: "file" } => n.type === "file");
}

const currentFiles = computed(() => getFilesInDir(selectedDir.value));

// ── Screen ───────────────────────────────────────────────────────────────────
const isRecording = ref(false);
const recordQuality = ref<"720p" | "1080p" | "1440p">("1080p");
const recordBitrate = ref("8");
const recordFormat = ref<"mp4" | "gif">("mp4");

// ── Performance ─────────────────────────────────────────────────────────────
const perf = ref({ cpu: 24, ram: 62, battery: 87, fps: 60, rxKbps: 48, txKbps: 12 });

let perfTimer: ReturnType<typeof setInterval>;
onMounted(() => {
  perfTimer = setInterval(() => {
    perf.value = {
      cpu: Math.max(5, Math.min(95, perf.value.cpu + (Math.random() - 0.5) * 15)),
      ram: Math.max(20, Math.min(90, perf.value.ram + (Math.random() - 0.5) * 5)),
      battery: Math.max(1, perf.value.battery - (Math.random() > 0.9 ? 1 : 0)),
      fps: Math.max(24, Math.min(60, Math.round(perf.value.fps + (Math.random() - 0.5) * 8))),
      rxKbps: Math.max(0, perf.value.rxKbps + (Math.random() - 0.5) * 20),
      txKbps: Math.max(0, perf.value.txKbps + (Math.random() - 0.5) * 8),
    };
  }, 1200);
});
onUnmounted(() => clearInterval(perfTimer));

const cpuColor = computed(() =>
  perf.value.cpu > 80 ? "text-error" : perf.value.cpu > 60 ? "text-warning" : "text-success",
);
const ramColor = computed(() =>
  perf.value.ram > 80 ? "text-error" : perf.value.ram > 60 ? "text-warning" : "text-info",
);
const fpsColor = computed(() =>
  perf.value.fps < 30 ? "text-error" : perf.value.fps < 50 ? "text-warning" : "text-success",
);
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <PanelHeader
      :title="device.model"
      :subtitle="`API ${device.apiLevel} · Android ${device.androidVersion} · ${device.connection}`"
    />

    <!-- Tab bar -->
    <div class="h-10 border-b border-border/20 bg-surface-1 flex items-center px-1 shrink-0">
      <button
        v-for="t in tabs"
        :key="t.id"
        @click="tab = t.id"
        class="relative px-3 py-2 text-xs transition-colors duration-150"
        :class="
          tab === t.id ? 'text-foreground' : 'text-muted-foreground hover:text-secondary-foreground'
        "
      >
        {{ t.label }}
        <div
          v-if="tab === t.id"
          class="absolute bottom-0 left-1 right-1 h-[2px] bg-primary rounded-full"
        />
      </button>
    </div>

    <!-- ── INFO ──────────────────────────────────────────────────────────── -->
    <div v-if="tab === 'info'" class="flex-1 overflow-y-auto p-5">
      <div class="grid grid-cols-3 gap-2.5 max-w-3xl">
        <div
          v-for="item in [
            { icon: Smartphone, label: 'Model', value: device.model, color: 'text-primary' },
            { icon: Monitor, label: 'Display', value: device.resolution, color: 'text-info' },
            { icon: Cpu, label: 'Processor', value: device.cpu, color: 'text-warning' },
            { icon: HardDrive, label: 'Storage', value: device.storage, color: 'text-success' },
            {
              icon: Battery,
              label: 'Battery',
              value: `${device.battery}%`,
              color: device.battery > 50 ? 'text-success' : 'text-warning',
            },
            {
              icon: Wifi,
              label: 'Connection',
              value: `${device.connection} · ${device.ip}`,
              color: 'text-info',
            },
          ]"
          :key="item.label"
          class="bg-surface-2/60 rounded-lg p-3 border border-border/20 hover:border-border/40 transition-colors"
        >
          <div class="flex items-center gap-2 mb-2">
            <div
              class="w-6 h-6 rounded-md bg-surface-3 flex items-center justify-center"
              :class="item.color"
            >
              <component :is="item.icon" class="w-3 h-3" />
            </div>
            <span class="text-2xs text-muted-foreground uppercase tracking-wider">{{
              item.label
            }}</span>
          </div>
          <span class="text-xs font-medium text-foreground">{{ item.value }}</span>
        </div>
      </div>

      <div class="mt-5 max-w-3xl">
        <span class="text-2xs text-muted-foreground uppercase tracking-wider">Quick Actions</span>
        <div class="flex gap-2 mt-2">
          <button
            v-for="action in [
              { icon: ScreenShare, label: 'Screenshot' },
              { icon: FolderOpen, label: 'File Explorer' },
              { icon: Wifi, label: 'Wireless Debug' },
            ]"
            :key="action.label"
            class="flex items-center gap-2 px-3 py-2 rounded-lg bg-surface-2/40 border border-border/20 text-xs text-secondary-foreground hover:text-foreground hover:border-border/40 transition-all"
          >
            <component :is="action.icon" class="w-3.5 h-3.5" />
            {{ action.label }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── LOGCAT ─────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'logcat'" class="flex-1 flex flex-col overflow-hidden">
      <!-- Filter bar -->
      <div class="border-b border-border/20 bg-surface-2/40 shrink-0">
        <div class="flex items-center px-3 gap-2 h-8">
          <Search class="w-3 h-3 text-muted-foreground shrink-0" />
          <input
            v-model="logFilter"
            class="bg-transparent text-2xs text-foreground flex-1 outline-none placeholder:text-dimmed font-mono"
            placeholder="Filter messages…"
          />
          <div class="w-px h-3 bg-border/40" />
          <div class="flex gap-0.5">
            <button
              v-for="lvl in ['V', 'D', 'I', 'W', 'E']"
              :key="lvl"
              @click="toggleLevel(lvl)"
              class="text-2xs font-mono w-5 h-5 flex items-center justify-center rounded transition-colors"
              :class="activeLevels.has(lvl) ? logLevelColor[lvl] + ' bg-surface-3' : 'text-dimmed'"
            >
              {{ lvl }}
            </button>
          </div>
        </div>
        <div class="flex items-center px-3 gap-2 h-7 border-t border-border/10">
          <span class="text-2xs text-dimmed font-mono w-12">pkg</span>
          <input
            v-model="logPackage"
            class="bg-transparent text-2xs text-foreground w-40 outline-none placeholder:text-dimmed font-mono"
            placeholder="com.myapp…"
          />
          <div class="w-px h-3 bg-border/40" />
          <span class="text-2xs text-dimmed font-mono w-8">tag</span>
          <input
            v-model="logTag"
            class="bg-transparent text-2xs text-foreground w-32 outline-none placeholder:text-dimmed font-mono"
            placeholder="Capacitor…"
          />
          <span class="ml-auto text-2xs text-dimmed font-mono"
            >{{ filteredLogs.length }} lines</span
          >
        </div>
      </div>

      <div class="flex-1 overflow-y-auto bg-surface-0/50 font-mono text-2xs leading-[18px]">
        <div
          v-for="(msg, i) in filteredLogs"
          :key="i"
          class="flex gap-0 px-3 py-[3px] data-row"
          :class="logLevelBg[msg.level] || ''"
        >
          <span class="w-3 shrink-0 font-bold" :class="logLevelColor[msg.level]">{{
            msg.level
          }}</span>
          <span class="w-24 shrink-0 text-dimmed truncate px-2">{{ msg.tag }}</span>
          <span class="w-10 shrink-0 text-dimmed text-right pr-3">{{ msg.pid }}</span>
          <span
            class="flex-1"
            :class="msg.level === 'E' ? 'text-error' : 'text-secondary-foreground'"
            >{{ msg.message }}</span
          >
        </div>
      </div>
    </div>

    <!-- ── APPS ───────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'apps'" class="flex-1 flex flex-col overflow-hidden">
      <!-- Toolbar -->
      <div class="h-9 border-b border-border/20 bg-surface-1 flex items-center px-3 gap-2 shrink-0">
        <Search class="w-3 h-3 text-muted-foreground" />
        <input
          v-model="appsSearch"
          class="bg-transparent text-xs text-foreground w-48 outline-none placeholder:text-dimmed"
          placeholder="Search apps…"
        />
        <div class="w-px h-4 bg-border/40" />
        <div class="flex gap-0.5">
          <button
            v-for="cat in categories"
            :key="cat"
            @click="appsCategory = cat"
            class="px-2 py-0.5 rounded text-2xs transition-colors"
            :class="
              appsCategory === cat
                ? 'bg-primary/10 text-primary'
                : 'text-dimmed hover:text-muted-foreground'
            "
          >
            {{ cat }}
          </button>
        </div>
        <div class="flex-1" />
        <div class="flex gap-0.5 p-0.5 bg-surface-3 rounded-md border border-border/20">
          <button
            @click="appsView = 'grid'"
            class="p-1 rounded transition-colors"
            :class="
              appsView === 'grid'
                ? 'bg-surface-4 text-foreground'
                : 'text-dimmed hover:text-muted-foreground'
            "
          >
            <LayoutGrid class="w-3 h-3" />
          </button>
          <button
            @click="appsView = 'table'"
            class="p-1 rounded transition-colors"
            :class="
              appsView === 'table'
                ? 'bg-surface-4 text-foreground'
                : 'text-dimmed hover:text-muted-foreground'
            "
          >
            <List class="w-3 h-3" />
          </button>
        </div>
      </div>

      <div class="flex flex-1 overflow-hidden">
        <!-- Grid view -->
        <div v-if="appsView === 'grid'" class="flex-1 overflow-y-auto p-4">
          <div
            class="grid grid-cols-4 gap-3"
            style="grid-template-columns: repeat(auto-fill, minmax(140px, 1fr))"
          >
            <button
              v-for="app in filteredApps"
              :key="app.id"
              @click="selectedApp = selectedApp?.id === app.id ? null : app"
              class="flex flex-col items-center gap-2.5 p-3 rounded-xl border transition-all text-center"
              :class="
                selectedApp?.id === app.id
                  ? 'border-primary/30 bg-primary/[0.06]'
                  : 'border-border/20 bg-surface-2/40 hover:border-border/40 hover:bg-surface-2/70'
              "
            >
              <div
                class="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg shrink-0"
                :style="{ backgroundColor: app.color }"
              >
                {{ app.label.charAt(0) }}
              </div>
              <div class="w-full">
                <div class="text-xs font-medium text-foreground truncate">{{ app.label }}</div>
                <div class="text-2xs text-dimmed mt-0.5">v{{ app.version }}</div>
                <div class="text-2xs text-muted-foreground mt-0.5">{{ app.size }}</div>
              </div>
              <span v-if="app.system" class="text-2xs px-1.5 py-px rounded bg-surface-3 text-dimmed"
                >system</span
              >
            </button>
          </div>
        </div>

        <!-- Table view -->
        <div v-else class="flex-1 overflow-auto">
          <table class="w-full text-2xs">
            <thead class="sticky top-0 z-10">
              <tr
                class="bg-surface-2/80 backdrop-blur-sm text-left text-dimmed uppercase tracking-wider border-b border-border/20"
              >
                <th class="px-3 py-2 font-medium w-8"></th>
                <th class="px-3 py-2 font-medium">App</th>
                <th class="px-3 py-2 font-medium">Package</th>
                <th class="px-3 py-2 font-medium">Version</th>
                <th class="px-3 py-2 font-medium">Size</th>
                <th class="px-3 py-2 font-medium">Category</th>
                <th class="px-3 py-2 font-medium w-24"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="app in filteredApps"
                :key="app.id"
                @click="selectedApp = selectedApp?.id === app.id ? null : app"
                class="border-b border-border/10 cursor-pointer transition-colors"
                :class="selectedApp?.id === app.id ? 'bg-primary/[0.04]' : 'data-row'"
              >
                <td class="px-3 py-2">
                  <div
                    class="w-6 h-6 rounded-md flex items-center justify-center text-white font-bold text-2xs"
                    :style="{ backgroundColor: app.color }"
                  >
                    {{ app.label.charAt(0) }}
                  </div>
                </td>
                <td class="px-3 py-2 text-xs font-medium text-foreground">{{ app.label }}</td>
                <td class="px-3 py-2 font-mono text-muted-foreground">{{ app.packageName }}</td>
                <td class="px-3 py-2 font-mono text-muted-foreground">{{ app.version }}</td>
                <td class="px-3 py-2 text-muted-foreground">{{ app.size }}</td>
                <td class="px-3 py-2 text-muted-foreground">{{ app.category }}</td>
                <td class="px-3 py-2">
                  <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Force Stop"
                      class="p-1 rounded text-dimmed hover:text-warning hover:bg-surface-3 transition-colors"
                    >
                      <StopCircle class="w-3 h-3" />
                    </button>
                    <button
                      title="Pull APK"
                      class="p-1 rounded text-dimmed hover:text-foreground hover:bg-surface-3 transition-colors"
                    >
                      <Download class="w-3 h-3" />
                    </button>
                    <button
                      title="Uninstall"
                      class="p-1 rounded text-dimmed hover:text-error hover:bg-surface-3 transition-colors"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- App detail panel -->
        <Transition
          enter-active-class="transition-[width,opacity] duration-150 overflow-hidden"
          enter-from-class="w-0 opacity-0"
          enter-to-class="w-[260px] opacity-100"
          leave-active-class="transition-[width,opacity] duration-150 overflow-hidden"
          leave-from-class="w-[260px] opacity-100"
          leave-to-class="w-0 opacity-0"
        >
          <div
            v-if="selectedApp"
            class="w-[260px] border-l border-border/30 bg-surface-1 shrink-0 flex flex-col overflow-hidden"
          >
            <div
              class="h-10 flex items-center justify-between px-3 border-b border-border/20 shrink-0"
            >
              <span class="text-xs font-medium text-foreground truncate">{{
                selectedApp.label
              }}</span>
              <button
                @click="selectedApp = null"
                class="p-1 rounded text-dimmed hover:text-foreground hover:bg-surface-3 transition-colors ml-2"
              >
                <X class="w-3 h-3" />
              </button>
            </div>
            <div class="flex-1 overflow-y-auto p-3 space-y-4">
              <!-- Icon + name -->
              <div class="flex flex-col items-center py-3">
                <div
                  class="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-bold text-2xl mb-2.5"
                  :style="{ backgroundColor: selectedApp.color }"
                >
                  {{ selectedApp.label.charAt(0) }}
                </div>
                <div class="text-sm font-semibold text-foreground">{{ selectedApp.label }}</div>
                <div class="text-2xs text-dimmed font-mono mt-0.5">
                  {{ selectedApp.packageName }}
                </div>
                <div
                  v-if="selectedApp.system"
                  class="mt-1.5 text-2xs px-2 py-0.5 rounded-full bg-surface-3 text-muted-foreground border border-border/20"
                >
                  System App
                </div>
              </div>

              <!-- Stats grid -->
              <div class="grid grid-cols-2 gap-1.5">
                <div
                  v-for="stat in [
                    { label: 'Version', value: selectedApp.version },
                    { label: 'Size', value: selectedApp.size },
                    { label: 'Target SDK', value: String(selectedApp.targetSdk) },
                    { label: 'Min SDK', value: String(selectedApp.minSdk) },
                    { label: 'Activities', value: String(selectedApp.activities) },
                    { label: 'Services', value: String(selectedApp.services) },
                    { label: 'Permissions', value: String(selectedApp.permissions) },
                    { label: 'Category', value: selectedApp.category },
                  ]"
                  :key="stat.label"
                  class="bg-surface-2/60 rounded-lg p-2 border border-border/15"
                >
                  <div class="text-2xs text-dimmed mb-0.5">{{ stat.label }}</div>
                  <div class="text-xs font-medium text-foreground">{{ stat.value }}</div>
                </div>
              </div>

              <!-- Actions -->
              <div class="space-y-1">
                <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">
                  Actions
                </div>
                <button
                  v-for="action in [
                    'Force Stop',
                    'Clear Cache',
                    'Clear Data',
                    'Pull APK',
                    'Uninstall',
                    'Launch Activity',
                  ]"
                  :key="action"
                  class="w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors"
                  :class="
                    action === 'Uninstall'
                      ? 'text-error hover:bg-error/10'
                      : 'text-secondary-foreground hover:bg-surface-2 hover:text-foreground'
                  "
                >
                  {{ action }}
                </button>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <!-- ── WEBVIEW ─────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'webview'" class="flex-1 overflow-y-auto p-4">
      <div class="max-w-2xl space-y-4">
        <div class="flex items-center gap-2 mb-1">
          <div class="w-1.5 h-1.5 rounded-full bg-primary glow-dot" />
          <span class="text-xs text-muted-foreground"
            >Remote Targets — Chrome DevTools Protocol</span
          >
        </div>

        <div
          v-for="process in webviewTargets"
          :key="process.pid"
          class="bg-surface-2/40 border border-border/20 rounded-xl overflow-hidden"
        >
          <!-- Process header -->
          <div
            class="flex items-center gap-3 px-3 py-2.5 bg-surface-2/60 border-b border-border/15"
          >
            <div
              class="w-7 h-7 rounded-lg bg-surface-3 border border-border/20 flex items-center justify-center"
            >
              <Smartphone class="w-3.5 h-3.5 text-primary" />
            </div>
            <div>
              <div class="text-xs font-medium text-foreground">{{ process.appLabel }}</div>
              <div class="text-2xs font-mono text-dimmed">
                {{ process.packageName }} · PID {{ process.pid }}
              </div>
            </div>
          </div>

          <!-- Targets -->
          <div class="divide-y divide-border/10">
            <div
              v-for="target in process.targets"
              :key="target.id"
              class="flex items-center gap-3 px-3 py-2.5 hover:bg-surface-2/60 transition-colors group"
            >
              <div
                class="w-5 h-5 rounded flex items-center justify-center shrink-0"
                :class="
                  target.type === 'page' ? 'bg-info/10 text-info' : 'bg-warning/10 text-warning'
                "
              >
                <Monitor v-if="target.type === 'page'" class="w-3 h-3" />
                <Zap v-else class="w-3 h-3" />
              </div>
              <div class="flex-1 min-w-0">
                <div class="text-xs font-medium text-foreground truncate">{{ target.title }}</div>
                <div class="text-2xs font-mono text-dimmed truncate mt-px">{{ target.url }}</div>
              </div>
              <span
                class="text-2xs text-dimmed px-1.5 py-0.5 rounded bg-surface-3 border border-border/15 shrink-0"
              >
                {{ target.type === "page" ? "page" : "sw" }}
              </span>
              <button
                class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-2xs font-medium opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/20 shrink-0"
              >
                <ExternalLink class="w-2.5 h-2.5" />
                Inspect
              </button>
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2 py-2">
          <button
            class="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <Search class="w-3 h-3" />
            Refresh targets
          </button>
        </div>
      </div>
    </div>

    <!-- ── FILES ──────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'files'" class="flex-1 flex overflow-hidden">
      <!-- Tree sidebar -->
      <div class="w-52 border-r border-border/30 bg-surface-1 flex flex-col shrink-0">
        <div class="h-8 flex items-center px-3 border-b border-border/20 gap-1.5">
          <FolderOpen class="w-3 h-3 text-warning/60" />
          <span class="text-2xs font-medium text-muted-foreground">/sdcard</span>
        </div>
        <div class="flex-1 overflow-y-auto py-1 text-2xs">
          <button
            @click="selectedDir = '/sdcard'"
            class="flex items-center gap-1.5 w-full px-3 py-[5px] transition-colors"
            :class="
              selectedDir === '/sdcard'
                ? 'text-primary bg-primary/[0.06]'
                : 'text-muted-foreground hover:text-foreground hover:bg-surface-2'
            "
          >
            <ChevronRight class="w-3 h-3 opacity-0" />
            <FolderOpen class="w-3 h-3 text-warning/50" />
            <span>/ (root)</span>
          </button>

          <template v-for="dir in flatDirs" :key="dir.path">
            <button
              @click="
                selectedDir = dir.path;
                toggleDir(dir.path);
              "
              class="flex items-center gap-1.5 w-full py-[5px] transition-colors"
              :style="{ paddingLeft: `${12 + dir.depth * 14}px` }"
              :class="
                selectedDir === dir.path
                  ? 'text-primary bg-primary/[0.06]'
                  : 'text-secondary-foreground hover:text-foreground hover:bg-surface-2'
              "
            >
              <component
                :is="expandedDirs.has(dir.path) ? ChevronDown : ChevronRight"
                class="w-3 h-3 shrink-0"
              />
              <FolderOpen class="w-3 h-3 text-warning/50 shrink-0" />
              <span class="truncate">{{ dir.name }}</span>
            </button>
          </template>
        </div>
      </div>

      <!-- File list -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div
          class="h-8 border-b border-border/20 bg-surface-1 flex items-center px-3 gap-2 shrink-0"
        >
          <span class="text-2xs font-mono text-muted-foreground truncate">{{ selectedDir }}</span>
          <div class="flex-1" />
          <button
            class="w-6 h-6 flex items-center justify-center rounded text-dimmed hover:text-foreground hover:bg-surface-3 transition-colors"
            title="Push file"
          >
            <ArrowUp class="w-3 h-3" />
          </button>
        </div>

        <div class="flex-1 overflow-auto">
          <div
            v-if="currentFiles.length === 0"
            class="flex flex-col items-center justify-center h-full text-center"
          >
            <FolderOpen class="w-8 h-8 text-muted-foreground/30 mb-2" />
            <p class="text-xs text-muted-foreground">No files in this directory</p>
          </div>
          <table v-else class="w-full text-2xs">
            <thead class="sticky top-0 z-10">
              <tr
                class="bg-surface-2/80 backdrop-blur-sm text-left text-dimmed uppercase tracking-wider border-b border-border/20"
              >
                <th class="px-3 py-2 font-medium">Name</th>
                <th class="px-3 py-2 font-medium w-20">Size</th>
                <th class="px-3 py-2 font-medium w-36">Modified</th>
                <th class="px-3 py-2 font-medium w-20"></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="file in currentFiles"
                :key="file.name"
                class="border-b border-border/10 data-row group"
              >
                <td class="px-3 py-2 flex items-center gap-2">
                  <component
                    :is="getFileIcon(file.ext)"
                    class="w-3 h-3 text-muted-foreground/60 shrink-0"
                  />
                  <span class="text-xs text-foreground">{{ file.name }}</span>
                </td>
                <td class="px-3 py-2 text-muted-foreground font-mono">{{ file.size }}</td>
                <td class="px-3 py-2 text-muted-foreground font-mono">{{ file.modified }}</td>
                <td class="px-3 py-2">
                  <div class="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      title="Pull to desktop"
                      class="p-1 rounded text-dimmed hover:text-foreground hover:bg-surface-3 transition-colors"
                    >
                      <ArrowDown class="w-3 h-3" />
                    </button>
                    <button
                      title="Delete"
                      class="p-1 rounded text-dimmed hover:text-error hover:bg-surface-3 transition-colors"
                    >
                      <Trash2 class="w-3 h-3" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ── SCREEN ─────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'screen'" class="flex-1 flex gap-4 p-5 overflow-y-auto">
      <!-- Preview area -->
      <div class="flex flex-col items-center gap-4">
        <div
          class="relative rounded-3xl border-2 border-border/40 bg-surface-2/60 overflow-hidden shadow-2xl"
          style="width: 200px; height: 355px"
        >
          <div class="absolute inset-0 flex items-center justify-center">
            <div class="text-center">
              <ScreenShare class="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p class="text-2xs text-dimmed">Live preview</p>
              <p class="text-2xs text-dimmed">not connected</p>
            </div>
          </div>
          <!-- Recording indicator -->
          <div
            v-if="isRecording"
            class="absolute top-3 right-3 flex items-center gap-1.5 bg-error/90 text-white rounded-full px-2 py-0.5 text-2xs font-medium"
          >
            <div class="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
            REC
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-2/60 border border-border/20 text-xs text-secondary-foreground hover:text-foreground hover:border-border/40 transition-all"
          >
            <Camera class="w-3.5 h-3.5" />
            Screenshot
          </button>
          <button
            @click="isRecording = !isRecording"
            class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            :class="
              isRecording
                ? 'bg-error/10 border border-error/30 text-error hover:bg-error/20'
                : 'bg-surface-2/60 border border-border/20 text-secondary-foreground hover:text-foreground hover:border-border/40'
            "
          >
            <Video class="w-3.5 h-3.5" />
            {{ isRecording ? "Stop Recording" : "Record" }}
          </button>
        </div>
      </div>

      <!-- Options -->
      <div class="flex-1 max-w-xs space-y-5">
        <div>
          <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">
            Recording Quality
          </div>
          <div class="flex gap-1.5">
            <button
              v-for="q in ['720p', '1080p', '1440p'] as const"
              :key="q"
              @click="recordQuality = q"
              class="flex-1 py-1.5 rounded-md text-xs font-medium border transition-all"
              :class="
                recordQuality === q
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border/20 bg-surface-2/40 text-muted-foreground hover:text-foreground'
              "
            >
              {{ q }}
            </button>
          </div>
        </div>

        <div>
          <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">
            Bitrate (Mbps)
          </div>
          <div class="flex gap-1.5">
            <button
              v-for="br in ['4', '8', '16', '20']"
              :key="br"
              @click="recordBitrate = br"
              class="flex-1 py-1.5 rounded-md text-xs font-medium border transition-all"
              :class="
                recordBitrate === br
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border/20 bg-surface-2/40 text-muted-foreground hover:text-foreground'
              "
            >
              {{ br }}
            </button>
          </div>
        </div>

        <div>
          <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">
            Output Format
          </div>
          <div class="flex gap-1.5">
            <button
              v-for="fmt in ['mp4', 'gif'] as const"
              :key="fmt"
              @click="recordFormat = fmt"
              class="flex-1 py-1.5 rounded-md text-xs font-medium border transition-all uppercase"
              :class="
                recordFormat === fmt
                  ? 'border-primary/30 bg-primary/10 text-primary'
                  : 'border-border/20 bg-surface-2/40 text-muted-foreground hover:text-foreground'
              "
            >
              {{ fmt }}
            </button>
          </div>
        </div>

        <div class="pt-2 border-t border-border/20 space-y-1.5">
          <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">
            ADB Commands
          </div>
          <button
            v-for="cmd in [
              'Rotate Left',
              'Rotate Right',
              'Home',
              'Back',
              'Recents',
              'Power',
              'Volume Up',
              'Volume Down',
            ]"
            :key="cmd"
            class="w-full text-left px-2.5 py-1.5 rounded-md text-xs text-secondary-foreground hover:text-foreground hover:bg-surface-2 transition-colors"
          >
            {{ cmd }}
          </button>
        </div>
      </div>
    </div>

    <!-- ── PERFORMANCE ─────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'perf'" class="flex-1 overflow-y-auto p-5">
      <div class="max-w-2xl space-y-3">
        <!-- CPU -->
        <div class="bg-surface-2/40 border border-border/20 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <Cpu class="w-4 h-4 text-primary" />
              <span class="text-xs font-medium text-foreground">CPU Usage</span>
            </div>
            <span class="text-xl font-bold font-mono" :class="cpuColor"
              >{{ Math.round(perf.cpu) }}%</span
            >
          </div>
          <div class="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="perf.cpu > 80 ? 'bg-error' : perf.cpu > 60 ? 'bg-warning' : 'bg-primary'"
              :style="{ width: `${perf.cpu}%` }"
            />
          </div>
          <div class="flex justify-between mt-1.5 text-2xs text-dimmed">
            <span>{{ device.cpu }}</span>
            <span>8 cores</span>
          </div>
        </div>

        <!-- RAM -->
        <div class="bg-surface-2/40 border border-border/20 rounded-xl p-4">
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <HardDrive class="w-4 h-4 text-info" />
              <span class="text-xs font-medium text-foreground">Memory</span>
            </div>
            <span class="text-xl font-bold font-mono" :class="ramColor"
              >{{ Math.round(perf.ram) }}%</span
            >
          </div>
          <div class="h-2 bg-surface-3 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-700"
              :class="perf.ram > 80 ? 'bg-error' : perf.ram > 60 ? 'bg-warning' : 'bg-info'"
              :style="{ width: `${perf.ram}%` }"
            />
          </div>
          <div class="flex justify-between mt-1.5 text-2xs text-dimmed">
            <span>{{ ((perf.ram / 100) * 8).toFixed(1) }} GB used</span>
            <span>{{ device.ram }} total</span>
          </div>
        </div>

        <!-- Battery + FPS row -->
        <div class="grid grid-cols-2 gap-3">
          <div class="bg-surface-2/40 border border-border/20 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <Battery class="w-4 h-4 text-success" />
              <span class="text-xs font-medium text-foreground">Battery</span>
            </div>
            <div
              class="text-2xl font-bold font-mono"
              :class="
                perf.battery < 20
                  ? 'text-error'
                  : perf.battery < 40
                    ? 'text-warning'
                    : 'text-success'
              "
            >
              {{ perf.battery }}%
            </div>
            <div class="text-2xs text-dimmed mt-1">Discharging</div>
          </div>

          <div class="bg-surface-2/40 border border-border/20 rounded-xl p-4">
            <div class="flex items-center gap-2 mb-2">
              <Activity class="w-4 h-4 text-warning" />
              <span class="text-xs font-medium text-foreground">Frame Rate</span>
            </div>
            <div class="text-2xl font-bold font-mono" :class="fpsColor">{{ perf.fps }}</div>
            <div class="text-2xs text-dimmed mt-1">FPS target: 60</div>
          </div>
        </div>

        <!-- Network -->
        <div class="bg-surface-2/40 border border-border/20 rounded-xl p-4">
          <div class="flex items-center gap-2 mb-3">
            <WifiIcon class="w-4 h-4 text-info" />
            <span class="text-xs font-medium text-foreground">Network</span>
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <ArrowDown class="w-3 h-3 text-success" />
                <span class="text-2xs text-muted-foreground">Download</span>
              </div>
              <div class="text-lg font-bold font-mono text-success">
                {{ Math.round(perf.rxKbps) }}
                <span class="text-xs font-normal text-muted-foreground">KB/s</span>
              </div>
            </div>
            <div>
              <div class="flex items-center gap-1.5 mb-1">
                <ArrowUp class="w-3 h-3 text-primary" />
                <span class="text-2xs text-muted-foreground">Upload</span>
              </div>
              <div class="text-lg font-bold font-mono text-primary">
                {{ Math.round(perf.txKbps) }}
                <span class="text-xs font-normal text-muted-foreground">KB/s</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
