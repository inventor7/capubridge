<script setup lang="ts">
import { ref, computed } from "vue";
import {
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Database,
  Puzzle,
  GitBranch,
  HardDrive,
  ChevronRight,
  ArrowUpRight,
  Layers,
  Shield,
  Wifi,
  Camera,
  Bell,
  Fingerprint,
  Map,
  Share2,
  Trash2,
  Play,
  RotateCcw,
} from "lucide-vue-next";
import PanelHeader from "@/components/layout/PanelHeader.vue";
import { syncQueueRecords } from "@/data/mock-data";

type Tab = "sync" | "plugins" | "migrations" | "persistence";
const tab = ref<Tab>("sync");

const tabs = [
  { id: "sync" as const, label: "Sync Queue" },
  { id: "plugins" as const, label: "Plugins" },
  { id: "migrations" as const, label: "Migrations" },
  { id: "persistence" as const, label: "Persistence" },
];

// ── Sync Queue ───────────────────────────────────────────────────────────────
const syncRecords = ref(syncQueueRecords.map((r) => ({ ...r })));

const syncStats = computed(() => ({
  pending: syncRecords.value.filter((r) => r.status === "pending").length,
  failed: syncRecords.value.filter((r) => r.status === "failed").length,
  synced: syncRecords.value.filter((r) => r.status === "synced").length,
}));

const syncTypeColor: Record<string, string> = {
  CREATE: "text-success bg-success/10 border-success/20",
  UPDATE: "text-info bg-info/10 border-info/20",
  DELETE: "text-error bg-error/10 border-error/20",
};

const syncStatusIcon: Record<string, typeof Clock> = {
  pending: Clock,
  failed: XCircle,
  synced: CheckCircle,
};

const syncStatusColor: Record<string, string> = {
  pending: "text-warning",
  failed: "text-error",
  synced: "text-success",
};

// ── Plugins ───────────────────────────────────────────────────────────────────
const plugins = [
  {
    name: "Camera",
    package: "@capacitor/camera",
    version: "5.0.9",
    status: "ok",
    icon: Camera,
    perms: ["CAMERA"],
  },
  {
    name: "Push Notifications",
    package: "@capacitor/push-notifications",
    version: "5.1.2",
    status: "ok",
    icon: Bell,
    perms: ["POST_NOTIFICATIONS"],
  },
  {
    name: "Geolocation",
    package: "@capacitor/geolocation",
    version: "5.0.7",
    status: "ok",
    icon: Map,
    perms: ["ACCESS_FINE_LOCATION", "ACCESS_COARSE_LOCATION"],
  },
  {
    name: "Biometrics",
    package: "capacitor-biometric-auth",
    version: "5.1.0",
    status: "warn",
    icon: Fingerprint,
    perms: ["USE_BIOMETRIC"],
  },
  {
    name: "Network",
    package: "@capacitor/network",
    version: "5.0.5",
    status: "ok",
    icon: Wifi,
    perms: [],
  },
  {
    name: "Share",
    package: "@capacitor/share",
    version: "2.0.2",
    status: "outdated",
    icon: Share2,
    perms: [],
  },
  {
    name: "Preferences",
    package: "@capacitor/preferences",
    version: "5.0.7",
    status: "ok",
    icon: HardDrive,
    perms: [],
  },
  {
    name: "Filesystem",
    package: "@capacitor/filesystem",
    version: "5.2.1",
    status: "ok",
    icon: Layers,
    perms: ["READ_EXTERNAL_STORAGE", "WRITE_EXTERNAL_STORAGE"],
  },
];

const pluginStatusColor: Record<string, string> = {
  ok: "text-success",
  warn: "text-warning",
  outdated: "text-info",
};

const pluginStatusLabel: Record<string, string> = {
  ok: "Registered",
  warn: "Config Issue",
  outdated: "Update Available",
};

// ── Migrations ────────────────────────────────────────────────────────────────
const migrations = [
  {
    id: "M001",
    name: "init_schema",
    db: "appDatabase",
    version: 1,
    status: "applied",
    ts: "2024-01-15",
    duration: "12ms",
  },
  {
    id: "M002",
    name: "add_sync_queue",
    db: "appDatabase",
    version: 2,
    status: "applied",
    ts: "2024-02-01",
    duration: "8ms",
  },
  {
    id: "M003",
    name: "add_offline_cache",
    db: "appDatabase",
    version: 3,
    status: "applied",
    ts: "2024-03-01",
    duration: "45ms",
  },
  {
    id: "M004",
    name: "add_user_preferences",
    db: "jeep-sqlite",
    version: 1,
    status: "applied",
    ts: "2024-03-10",
    duration: "5ms",
  },
  {
    id: "M005",
    name: "add_metadata_index",
    db: "appDatabase",
    version: 4,
    status: "pending",
    ts: "—",
    duration: "—",
  },
  {
    id: "M006",
    name: "normalize_timestamps",
    db: "appDatabase",
    version: 5,
    status: "pending",
    ts: "—",
    duration: "—",
  },
];

// ── Persistence ───────────────────────────────────────────────────────────────
const storageAPIs = [
  {
    name: "IndexedDB",
    status: "available",
    quota: "14.2 MB / 2.4 GB",
    icon: Database,
    color: "text-primary",
  },
  {
    name: "LocalStorage",
    status: "available",
    quota: "18 keys / ~200 KB",
    icon: HardDrive,
    color: "text-info",
  },
  {
    name: "OPFS",
    status: "available",
    quota: "4 files / 5.1 MB",
    icon: Layers,
    color: "text-success",
  },
  {
    name: "Cache API",
    status: "available",
    quota: "2 caches / 2.6 MB",
    icon: Shield,
    color: "text-warning",
  },
];
</script>

<template>
  <div class="flex flex-col h-full overflow-hidden">
    <PanelHeader title="Hybrid Tools" subtitle="Capacitor · Ionic" />

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

    <!-- ── SYNC QUEUE ─────────────────────────────────────────────────────── -->
    <div v-if="tab === 'sync'" class="flex-1 flex flex-col overflow-hidden">
      <!-- Stats bar -->
      <div class="flex items-stretch border-b border-border/20 bg-surface-2/30 shrink-0">
        <div
          v-for="stat in [
            {
              label: 'Pending',
              value: syncStats.pending,
              color: 'text-warning',
              bg: 'bg-warning/5',
            },
            { label: 'Failed', value: syncStats.failed, color: 'text-error', bg: 'bg-error/5' },
            { label: 'Synced', value: syncStats.synced, color: 'text-success', bg: 'bg-success/5' },
          ]"
          :key="stat.label"
          class="flex-1 flex flex-col items-center justify-center py-3 border-r border-border/15 last:border-r-0"
          :class="stat.bg"
        >
          <span class="text-xl font-bold font-mono" :class="stat.color">{{ stat.value }}</span>
          <span class="text-2xs text-dimmed mt-0.5">{{ stat.label }}</span>
        </div>
        <div class="flex items-center px-3 border-l border-border/15">
          <button
            class="flex items-center gap-1.5 text-2xs text-muted-foreground hover:text-foreground transition-colors px-2 py-1 rounded-md hover:bg-surface-3"
          >
            <RefreshCw class="w-3 h-3" />
            Flush all
          </button>
        </div>
      </div>

      <!-- Queue list -->
      <div class="flex-1 overflow-y-auto p-3 space-y-1.5">
        <div
          v-for="record in syncRecords"
          :key="record.id"
          class="flex items-start gap-3 p-3 rounded-xl border transition-colors"
          :class="
            record.status === 'failed'
              ? 'border-error/20 bg-error/[0.03]'
              : record.status === 'synced'
                ? 'border-border/10 bg-surface-2/20 opacity-60'
                : 'border-border/20 bg-surface-2/40'
          "
        >
          <!-- Status icon -->
          <div class="shrink-0 mt-0.5">
            <component
              :is="syncStatusIcon[record.status]"
              class="w-4 h-4"
              :class="syncStatusColor[record.status]"
            />
          </div>

          <!-- Content -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-1">
              <span
                class="text-2xs font-medium font-mono px-1.5 py-0.5 rounded border"
                :class="syncTypeColor[record.type]"
              >
                {{ record.type }}
              </span>
              <span class="text-xs text-foreground font-medium">{{ record.entity }}</span>
              <span class="text-2xs font-mono text-dimmed">{{ record.entityId }}</span>
              <span class="ml-auto text-2xs font-mono text-dimmed">{{
                record.timestamp.slice(11, 19)
              }}</span>
            </div>

            <div
              v-if="record.payload"
              class="font-mono text-2xs text-muted-foreground/70 bg-surface-0/50 rounded-md px-2 py-1.5 border border-border/10"
            >
              {{ JSON.stringify(record.payload) }}
            </div>

            <div v-if="record.retries > 0" class="flex items-center gap-1 mt-1.5">
              <AlertTriangle class="w-2.5 h-2.5 text-error" />
              <span class="text-2xs text-error"
                >{{ record.retries }} failed attempt{{ record.retries > 1 ? "s" : "" }}</span
              >
            </div>
          </div>

          <!-- Actions -->
          <div class="flex gap-0.5 shrink-0">
            <button
              v-if="record.status === 'failed'"
              title="Retry"
              class="p-1 rounded text-dimmed hover:text-warning hover:bg-surface-3 transition-colors"
            >
              <RotateCcw class="w-3 h-3" />
            </button>
            <button
              title="Delete"
              class="p-1 rounded text-dimmed hover:text-error hover:bg-surface-3 transition-colors"
            >
              <Trash2 class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── PLUGINS ────────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'plugins'" class="flex-1 overflow-y-auto p-4">
      <div class="max-w-2xl space-y-2">
        <div
          v-for="plugin in plugins"
          :key="plugin.name"
          class="flex items-center gap-3 p-3 rounded-xl border border-border/20 bg-surface-2/40 hover:border-border/40 transition-all group"
        >
          <!-- Icon -->
          <div
            class="w-9 h-9 rounded-lg bg-surface-3 border border-border/20 flex items-center justify-center shrink-0"
          >
            <component :is="plugin.icon" class="w-4 h-4 text-primary/70" />
          </div>

          <!-- Info -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <span class="text-xs font-medium text-foreground">{{ plugin.name }}</span>
              <span class="text-2xs font-medium" :class="pluginStatusColor[plugin.status]">
                {{ pluginStatusLabel[plugin.status] }}
              </span>
            </div>
            <div class="text-2xs font-mono text-dimmed mt-0.5">
              {{ plugin.package }} · v{{ plugin.version }}
            </div>
            <div v-if="plugin.perms.length > 0" class="flex gap-1 mt-1.5 flex-wrap">
              <span
                v-for="perm in plugin.perms"
                :key="perm"
                class="text-2xs font-mono px-1.5 py-0.5 rounded bg-surface-3 text-muted-foreground border border-border/15"
              >
                {{ perm }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              v-if="plugin.status === 'outdated'"
              class="flex items-center gap-1 px-2 py-1 rounded-md bg-info/10 text-info text-2xs font-medium hover:bg-info/20 transition-colors"
            >
              <ArrowUpRight class="w-2.5 h-2.5" />
              Update
            </button>
            <button
              class="flex items-center gap-1 px-2 py-1 rounded-md text-2xs text-muted-foreground hover:text-foreground hover:bg-surface-3 transition-colors"
            >
              <ChevronRight class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- ── MIGRATIONS ─────────────────────────────────────────────────────── -->
    <div v-else-if="tab === 'migrations'" class="flex-1 overflow-y-auto p-4">
      <div class="max-w-xl">
        <!-- Header -->
        <div class="flex items-center justify-between mb-4">
          <div class="text-xs text-muted-foreground">
            {{ migrations.filter((m) => m.status === "applied").length }} applied ·
            {{ migrations.filter((m) => m.status === "pending").length }} pending
          </div>
          <button
            class="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            <Play class="w-3 h-3" />
            Run pending
          </button>
        </div>

        <!-- Timeline -->
        <div class="relative">
          <div class="absolute left-[19px] top-0 bottom-0 w-px bg-border/30" />

          <div v-for="(m, i) in migrations" :key="m.id" class="relative flex gap-4 pb-4 last:pb-0">
            <!-- Timeline dot -->
            <div class="relative z-10 shrink-0">
              <div
                class="w-[38px] h-[38px] rounded-lg border flex items-center justify-center"
                :class="
                  m.status === 'applied'
                    ? 'bg-success/10 border-success/20'
                    : 'bg-surface-3 border-border/30'
                "
              >
                <CheckCircle v-if="m.status === 'applied'" class="w-4 h-4 text-success" />
                <Clock v-else class="w-4 h-4 text-muted-foreground" />
              </div>
            </div>

            <!-- Content -->
            <div
              class="flex-1 rounded-xl border p-3 mb-0"
              :class="
                m.status === 'applied'
                  ? 'border-border/15 bg-surface-2/30'
                  : 'border-border/25 bg-surface-2/50'
              "
            >
              <div class="flex items-center gap-2 mb-1">
                <span class="font-mono text-2xs text-dimmed">{{ m.id }}</span>
                <GitBranch class="w-2.5 h-2.5 text-dimmed" />
                <span class="text-xs font-medium text-foreground">{{ m.name }}</span>
              </div>
              <div class="flex items-center gap-3 text-2xs text-dimmed">
                <span class="font-mono">{{ m.db }}</span>
                <span>v{{ m.version }}</span>
                <span v-if="m.status === 'applied'" class="text-muted-foreground">{{ m.ts }}</span>
                <span v-if="m.duration !== '—'" class="font-mono">{{ m.duration }}</span>
                <span
                  class="ml-auto font-medium"
                  :class="m.status === 'applied' ? 'text-success' : 'text-muted-foreground'"
                >
                  {{ m.status }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ── PERSISTENCE ─────────────────────────────────────────────────────── -->
    <div v-else class="flex-1 overflow-y-auto p-4">
      <div class="max-w-xl space-y-3">
        <div
          v-for="api in storageAPIs"
          :key="api.name"
          class="flex items-center gap-4 p-4 rounded-xl border border-border/20 bg-surface-2/40 hover:border-border/40 transition-all"
        >
          <div
            class="w-10 h-10 rounded-xl bg-surface-3 border border-border/20 flex items-center justify-center shrink-0"
            :class="api.color"
          >
            <component :is="api.icon" class="w-5 h-5" />
          </div>
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2 mb-0.5">
              <span class="text-xs font-medium text-foreground">{{ api.name }}</span>
              <span class="text-2xs font-medium text-success">{{ api.status }}</span>
            </div>
            <div class="text-2xs text-muted-foreground font-mono">{{ api.quota }}</div>
          </div>
          <div class="w-1.5 h-1.5 rounded-full bg-success glow-dot" />
        </div>

        <!-- OPFS detail -->
        <div class="mt-4 p-3 bg-surface-2/30 border border-border/15 rounded-xl">
          <div class="text-2xs text-muted-foreground uppercase tracking-wider mb-2">OPFS Files</div>
          <div class="space-y-1">
            <div
              v-for="file in [
                { name: 'mydb.sqlite', size: '4.2 MB', type: 'database' },
                { name: 'temp-upload.bin', size: '890 KB', type: 'binary' },
              ]"
              :key="file.name"
              class="flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-surface-2 transition-colors"
            >
              <Database class="w-3 h-3 text-primary/60 shrink-0" />
              <span class="text-xs font-mono text-foreground flex-1">{{ file.name }}</span>
              <span class="text-2xs text-dimmed">{{ file.size }}</span>
              <span class="text-2xs text-dimmed px-1.5 py-0.5 rounded bg-surface-3">{{
                file.type
              }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
