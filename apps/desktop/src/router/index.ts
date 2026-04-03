import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/devices" },

  // ── Devices ──────────────────────────────────────────────────────────────
  {
    path: "/devices",
    component: () => import("@/modules/devices/DevicesPanel.vue"),
    redirect: "/devices/overview",
    children: [
      {
        path: "overview",
        name: "devices-overview",
        component: () => import("@/modules/devices/DeviceOverview.vue"),
      },
      {
        path: "logcat",
        name: "devices-logcat",
        component: () => import("@/modules/devices/DeviceLogcat.vue"),
      },
      {
        path: "apps",
        name: "devices-apps",
        component: () => import("@/modules/devices/DeviceApps.vue"),
      },
      {
        path: "webview",
        name: "devices-webview",
        component: () => import("@/modules/devices/DeviceWebview.vue"),
      },
      {
        path: "files",
        name: "devices-files",
        component: () => import("@/modules/devices/DeviceFiles.vue"),
      },
      {
        path: "screen",
        name: "devices-screen",
        component: () => import("@/modules/devices/DeviceScreen.vue"),
      },
      {
        path: "perf",
        name: "devices-perf",
        component: () => import("@/modules/devices/DevicePerf.vue"),
      },
    ],
  },

  // ── Storage ──────────────────────────────────────────────────────────────
  {
    path: "/storage",
    component: () => import("@/modules/storage/StoragePanel.vue"),
    redirect: "/storage/indexeddb",
    children: [
      {
        path: "indexeddb/:db?/:store?",
        name: "storage-indexeddb",
        component: () => import("@/modules/storage/indexeddb/IDBExplorer.vue"),
      },
      {
        path: "localstorage",
        name: "storage-localstorage",
        component: () => import("@/modules/storage/localstorage/LSExplorer.vue"),
      },
      {
        path: "cache",
        name: "storage-cache",
        component: () => import("@/modules/storage/cache/CacheExplorer.vue"),
      },
      {
        path: "opfs",
        name: "storage-opfs",
        component: () => import("@/modules/storage/opfs/OPFSExplorer.vue"),
      },
    ],
  },

  // ── Network ──────────────────────────────────────────────────────────────
  {
    path: "/network",
    component: () => import("@/modules/network/NetworkPanel.vue"),
    redirect: "/network/requests",
    children: [
      {
        path: "requests",
        name: "network-requests",
        component: () => import("@/modules/network/NetworkRequests.vue"),
      },
      {
        path: "websocket",
        name: "network-websocket",
        component: () => import("@/modules/network/NetworkWebSocket.vue"),
      },
      {
        path: "throttle",
        name: "network-throttle",
        component: () => import("@/modules/network/NetworkThrottle.vue"),
      },
      {
        path: "mock",
        name: "network-mock",
        component: () => import("@/modules/network/NetworkMock.vue"),
      },
    ],
  },

  // ── Console ──────────────────────────────────────────────────────────────
  {
    path: "/console",
    component: () => import("@/modules/console/ConsolePanel.vue"),
    redirect: "/console/output",
    children: [
      {
        path: "output",
        name: "console-output",
        component: () => import("@/modules/console/ConsoleOutput.vue"),
      },
      {
        path: "repl",
        name: "console-repl",
        component: () => import("@/modules/console/ConsoleRepl.vue"),
      },
      {
        path: "exceptions",
        name: "console-exceptions",
        component: () => import("@/modules/console/ConsoleExceptions.vue"),
      },
    ],
  },

  // ── Hybrid ───────────────────────────────────────────────────────────────
  {
    path: "/hybrid",
    component: () => import("@/modules/hybrid/HybridPanel.vue"),
    redirect: "/hybrid/sync",
    children: [
      {
        path: "sync",
        name: "hybrid-sync",
        component: () => import("@/modules/hybrid/HybridSync.vue"),
      },
      {
        path: "plugins",
        name: "hybrid-plugins",
        component: () => import("@/modules/hybrid/HybridPlugins.vue"),
      },
      {
        path: "migrations",
        name: "hybrid-migrations",
        component: () => import("@/modules/hybrid/HybridMigrations.vue"),
      },
      {
        path: "persistence",
        name: "hybrid-persistence",
        component: () => import("@/modules/hybrid/HybridPersistence.vue"),
      },
    ],
  },

  // ── Settings ─────────────────────────────────────────────────────────────
  {
    path: "/settings",
    component: () => import("@/modules/settings/SettingsPanel.vue"),
    redirect: "/settings/general",
    children: [
      {
        path: "general",
        name: "settings-general",
        component: () => import("@/modules/settings/SettingsGeneral.vue"),
      },
      {
        path: "adb",
        name: "settings-adb",
        component: () => import("@/modules/settings/SettingsAdb.vue"),
      },
      {
        path: "theme",
        name: "settings-theme",
        component: () => import("@/modules/settings/SettingsTheme.vue"),
      },
      {
        path: "shortcuts",
        name: "settings-shortcuts",
        component: () => import("@/modules/settings/SettingsShortcuts.vue"),
      },
    ],
  },

  // ── Catch-all ────────────────────────────────────────────────────────────
  { path: "/:pathMatch(.*)*", redirect: "/devices" },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
