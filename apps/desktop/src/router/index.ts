import { createRouter, createWebHashHistory } from "vue-router";
import type { RouteRecordRaw } from "vue-router";

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: "/devices" },
  {
    path: "/devices",
    component: () => import("@/modules/devices/DevicesPanel.vue"),
  },
  {
    path: "/storage",
    component: () => import("@/modules/storage/StoragePanel.vue"),
    children: [
      { path: "", redirect: "idb" },
      {
        path: "idb/:db?/:store?",
        component: () => import("@/modules/storage/idb/IDBExplorer.vue"),
      },
      {
        path: "localstorage",
        component: () => import("@/modules/storage/localstorage/LSExplorer.vue"),
      },
      {
        path: "cache",
        component: () => import("@/modules/storage/cache/CacheExplorer.vue"),
      },
      {
        path: "opfs",
        component: () => import("@/modules/storage/opfs/OPFSExplorer.vue"),
      },
    ],
  },
  {
    path: "/network",
    component: () => import("@/modules/network/NetworkPanel.vue"),
  },
  {
    path: "/console",
    component: () => import("@/modules/console/ConsolePanel.vue"),
  },
  {
    path: "/hybrid",
    component: () => import("@/modules/hybrid/HybridPanel.vue"),
  },
  {
    path: "/settings",
    component: () => import("@/modules/settings/SettingsPanel.vue"),
  },
];

export default createRouter({
  history: createWebHashHistory(),
  routes,
});
