<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { RefreshCw, Layers3, AppWindow, Component as ComponentIcon } from "lucide-vue-next";
import { useInspectPlugins } from "../useInspectPlugins";
import { useCDP } from "@/composables/useCDP";

interface VueComponentSnapshot {
  uid: number;
  name: string;
  file: string | null;
  props: Record<string, unknown>;
  state: Record<string, unknown>;
  slots: string[];
  providesKeys: string[];
  children: VueComponentSnapshot[];
}

interface VueAppSnapshot {
  id: string;
  name: string;
  version: string | null;
  tree: VueComponentSnapshot | null;
}

interface VueSnapshot {
  hasDevtoolsHook: boolean;
  totalSerializedNodes: number;
  truncated: boolean;
  apps: VueAppSnapshot[];
}

interface FlatVueComponentEntry {
  key: string;
  appId: string;
  appName: string;
  depth: number;
  component: VueComponentSnapshot;
}

const SNAPSHOT_EXPRESSION = String.raw`(() => {
  const maxNodes = 300;
  let nodeCount = 0;
  const seenObjects = new WeakSet();

  const formatName = (type) => {
    if (!type || typeof type !== "object") return "Anonymous";
    if (typeof type.name === "string" && type.name) return type.name;
    if (typeof type.__name === "string" && type.__name) return type.__name;
    if (typeof type.displayName === "string" && type.displayName) return type.displayName;
    if (typeof type.__file === "string" && type.__file) {
      const fileName = type.__file.split("/").pop() || type.__file;
      return fileName.replace(/\.vue$/i, "");
    }
    return "Anonymous";
  };

  const serializeValue = (value, depth = 0) => {
    if (
      value == null ||
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean"
    ) {
      return value;
    }
    if (typeof value === "bigint") return String(value);
    if (typeof value === "function") {
      return "[Function " + (value.name || "anonymous") + "]";
    }
    if (value instanceof Date) return value.toISOString();
    if (value instanceof Map) return "[Map(" + value.size + ")]";
    if (value instanceof Set) return "[Set(" + value.size + ")]";
    if (Array.isArray(value)) {
      if (depth >= 2) return "[Array(" + value.length + ")]";
      return value.slice(0, 10).map((item) => serializeValue(item, depth + 1));
    }
    if (typeof value === "object") {
      if (seenObjects.has(value)) return "[Circular]";
      seenObjects.add(value);
      if (depth >= 2) {
        const ctor = value && value.constructor && value.constructor.name ? value.constructor.name : "Object";
        return "[Object " + ctor + "]";
      }
      const out = {};
      for (const key of Object.keys(value).slice(0, 20)) {
        try {
          out[key] = serializeValue(value[key], depth + 1);
        } catch (error) {
          out[key] = "[Error " + String(error) + "]";
        }
      }
      return out;
    }
    return String(value);
  };

  const collectDirectChildren = (instance) => {
    const children = [];
    const seenChildren = new Set();
    const queue = [instance.subTree];

    while (queue.length) {
      const vnode = queue.pop();
      if (!vnode || typeof vnode !== "object") continue;

      const component = vnode.component;
      if (component && component.parent === instance) {
        const key = String(component.uid);
        if (!seenChildren.has(key)) {
          seenChildren.add(key);
          children.push(component);
        }
        continue;
      }

      const vnodeChildren = Array.isArray(vnode.children) ? vnode.children : [];
      for (const child of vnodeChildren) {
        if (child && typeof child === "object") queue.push(child);
      }

      const dynamicChildren = Array.isArray(vnode.dynamicChildren) ? vnode.dynamicChildren : [];
      for (const child of dynamicChildren) {
        if (child && typeof child === "object") queue.push(child);
      }

      if (vnode.suspense && vnode.suspense.activeBranch) queue.push(vnode.suspense.activeBranch);
      if (vnode.ssContent) queue.push(vnode.ssContent);
      if (vnode.ssFallback) queue.push(vnode.ssFallback);
    }

    return children;
  };

  const serializeInstance = (instance) => {
    if (!instance || nodeCount >= maxNodes) return null;
    nodeCount += 1;

    const type = instance.type || {};
    const stateSource = Object.assign({}, instance.setupState || {}, instance.data || {});
    const children = collectDirectChildren(instance)
      .map((child) => serializeInstance(child))
      .filter(Boolean);

    return {
      uid: typeof instance.uid === "number" ? instance.uid : -1,
      name: formatName(type),
      file: typeof type.__file === "string" ? type.__file : null,
      props: serializeValue(instance.props || {}),
      state: serializeValue(stateSource),
      slots: Object.keys(instance.slots || {}),
      providesKeys: Object.keys(instance.provides || {}).slice(0, 20),
      children,
    };
  };

  const apps = [];
  const seenRoots = new Set();

  if (window.__VUE_DEVTOOLS_GLOBAL_HOOK__ && Array.isArray(window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps)) {
    for (const appRecord of window.__VUE_DEVTOOLS_GLOBAL_HOOK__.apps) {
      const app = appRecord && appRecord.app ? appRecord.app : appRecord;
      const instance = app && app._instance ? app._instance : null;
      if (!instance) continue;
      const id = String((appRecord && appRecord.uid) || (app && app._uid) || instance.uid || apps.length);
      if (seenRoots.has(id)) continue;
      seenRoots.add(id);
      const component = app && app._component ? app._component : instance.type;
      apps.push({
        id,
        name: formatName(component),
        version: app && typeof app.version === "string" ? app.version : null,
        tree: serializeInstance(instance),
      });
    }
  }

  if (!apps.length) {
    const elements = Array.from(document.querySelectorAll("*"));
    for (const element of elements) {
      const app = element.__vue_app__;
      const instance = (app && app._instance) || (element.__vueParentComponent && element.__vueParentComponent.root) || null;
      if (!instance) continue;
      const id = String((app && app._uid) || instance.uid || apps.length);
      if (seenRoots.has(id)) continue;
      seenRoots.add(id);
      const component = app && app._component ? app._component : instance.type;
      apps.push({
        id,
        name: formatName(component),
        version: app && typeof app.version === "string" ? app.version : null,
        tree: serializeInstance(instance),
      });
      if (apps.length >= 5) break;
    }
  }

  return JSON.stringify({
    hasDevtoolsHook: Boolean(window.__VUE_DEVTOOLS_GLOBAL_HOOK__),
    totalSerializedNodes: nodeCount,
    truncated: nodeCount >= maxNodes,
    apps,
  });
})()`;

const { evaluateOnTarget } = useInspectPlugins();
const { targetsStore } = useCDP();

const snapshot = ref<VueSnapshot | null>(null);
const selectedKey = ref<string | null>(null);
const isLoading = ref(false);
const loadError = ref<string | null>(null);

const flatComponents = computed<FlatVueComponentEntry[]>(() => {
  const entries: FlatVueComponentEntry[] = [];

  function visit(component: VueComponentSnapshot, appId: string, appName: string, depth: number) {
    entries.push({
      key: `${appId}:${component.uid}`,
      appId,
      appName,
      depth,
      component,
    });

    component.children.forEach((child) => visit(child, appId, appName, depth + 1));
  }

  snapshot.value?.apps.forEach((app) => {
    if (app.tree) {
      visit(app.tree, app.id, app.name, 0);
    }
  });

  return entries;
});

const selectedEntry = computed(
  () => flatComponents.value.find((entry) => entry.key === selectedKey.value) ?? null,
);

const selectedSummary = computed(() => {
  if (!selectedEntry.value) return [];
  return [
    {
      label: "Props",
      value: formatData(selectedEntry.value.component.props),
    },
    {
      label: "State",
      value: formatData(selectedEntry.value.component.state),
    },
  ];
});

function formatData(value: unknown) {
  if (value == null) return "null";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

async function refreshSnapshot() {
  isLoading.value = true;
  loadError.value = null;

  try {
    const raw = await evaluateOnTarget(SNAPSHOT_EXPRESSION);
    if (typeof raw !== "string") {
      snapshot.value = null;
      selectedKey.value = null;
      return;
    }
    snapshot.value = JSON.parse(raw) as VueSnapshot;
    const firstEntry = flatComponents.value[0] ?? null;
    selectedKey.value = firstEntry?.key ?? null;
  } catch (e) {
    loadError.value = e instanceof Error ? e.message : String(e);
  } finally {
    isLoading.value = false;
  }
}

watch(
  () => targetsStore.selectedTarget?.id ?? null,
  () => {
    void refreshSnapshot();
  },
  { immediate: true },
);

watch(flatComponents, (entries) => {
  if (!entries.length) {
    selectedKey.value = null;
    return;
  }
  if (!selectedKey.value || !entries.some((entry) => entry.key === selectedKey.value)) {
    selectedKey.value = entries[0]?.key ?? null;
  }
});
</script>

<template>
  <div class="h-full min-h-0 flex bg-surface-1">
    <aside class="w-92 min-w-72 max-w-120 border-r border-border/30 bg-surface-0 flex flex-col">
      <div class="flex items-center justify-between px-4 py-3 border-b border-border/30">
        <div>
          <div class="text-sm font-medium text-foreground">Vue DevTools</div>
          <div class="text-xs text-muted-foreground/70">
            Detected Vue runtime on the selected target
          </div>
        </div>
        <button
          class="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-border/40 bg-surface-2 text-muted-foreground/70 transition-colors hover:text-foreground hover:bg-surface-3 disabled:opacity-50"
          :disabled="isLoading"
          @click="refreshSnapshot"
        >
          <RefreshCw :size="14" :class="isLoading ? 'animate-spin' : ''" />
        </button>
      </div>

      <div class="grid grid-cols-3 gap-2 px-4 py-3 border-b border-border/20 text-xs">
        <div class="rounded-xl border border-border/30 bg-surface-2 px-3 py-2">
          <div class="text-muted-foreground/70">Apps</div>
          <div class="mt-1 text-base font-medium text-foreground">
            {{ snapshot?.apps.length ?? 0 }}
          </div>
        </div>
        <div class="rounded-xl border border-border/30 bg-surface-2 px-3 py-2">
          <div class="text-muted-foreground/70">Components</div>
          <div class="mt-1 text-base font-medium text-foreground">
            {{ snapshot?.totalSerializedNodes ?? 0 }}
          </div>
        </div>
        <div class="rounded-xl border border-border/30 bg-surface-2 px-3 py-2">
          <div class="text-muted-foreground/70">Hook</div>
          <div class="mt-1 text-base font-medium text-foreground">
            {{ snapshot?.hasDevtoolsHook ? "Ready" : "Fallback" }}
          </div>
        </div>
      </div>

      <div v-if="loadError" class="px-4 py-6 text-sm text-red-400">
        Failed to read Vue runtime: {{ loadError }}
      </div>

      <div
        v-else-if="!flatComponents.length && !isLoading"
        class="px-4 py-6 text-sm text-muted-foreground/70"
      >
        Vue was detected, but no component roots were serialized from the current page.
      </div>

      <div v-else class="flex-1 min-h-0 overflow-auto px-2 py-2">
        <div
          v-for="entry in flatComponents"
          :key="entry.key"
          class="mb-1 rounded-xl border px-3 py-2 text-sm transition-colors cursor-pointer"
          :class="
            selectedKey === entry.key
              ? 'border-border/60 bg-surface-3 text-foreground'
              : 'border-transparent text-muted-foreground/80 hover:border-border/30 hover:bg-surface-2 hover:text-foreground'
          "
          :style="{ paddingLeft: `${entry.depth * 16 + 12}px` }"
          @click="selectedKey = entry.key"
        >
          <div class="flex items-center gap-2 min-w-0">
            <ComponentIcon :size="13" class="shrink-0 opacity-60" />
            <span class="truncate">{{ entry.component.name }}</span>
          </div>
          <div
            class="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-muted-foreground/50"
          >
            <span>{{ entry.appName }}</span>
            <span>#{{ entry.component.uid }}</span>
          </div>
        </div>
      </div>
    </aside>

    <section class="flex-1 min-w-0 flex flex-col">
      <div
        class="flex items-center justify-between px-5 py-4 border-b border-border/30 bg-surface-0"
      >
        <div>
          <div class="text-sm font-medium text-foreground">
            {{ selectedEntry?.component.name ?? "Component details" }}
          </div>
          <div class="text-xs text-muted-foreground/70">
            {{
              selectedEntry
                ? `${selectedEntry.appName} / uid ${selectedEntry.component.uid}`
                : "Select a component from the tree"
            }}
          </div>
        </div>
        <div
          v-if="snapshot?.truncated"
          class="inline-flex items-center gap-2 rounded-full border border-border/30 bg-surface-2 px-3 py-1 text-xs text-muted-foreground/80"
        >
          <Layers3 :size="12" />
          Tree truncated at {{ snapshot.totalSerializedNodes }} nodes
        </div>
      </div>

      <div v-if="selectedEntry" class="flex-1 min-h-0 overflow-auto p-5 space-y-4">
        <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div class="rounded-2xl border border-border/30 bg-surface-0 p-4">
            <div class="flex items-center gap-2 text-sm font-medium text-foreground">
              <AppWindow :size="14" />
              Metadata
            </div>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">File</span>
                <span class="text-right text-foreground/90">
                  {{ selectedEntry.component.file ?? "Unknown" }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">Slots</span>
                <span class="text-right text-foreground/90">
                  {{
                    selectedEntry.component.slots.length
                      ? selectedEntry.component.slots.join(", ")
                      : "None"
                  }}
                </span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">Provides</span>
                <span class="text-right text-foreground/90">
                  {{
                    selectedEntry.component.providesKeys.length
                      ? selectedEntry.component.providesKeys.join(", ")
                      : "None"
                  }}
                </span>
              </div>
            </div>
          </div>

          <div class="rounded-2xl border border-border/30 bg-surface-0 p-4">
            <div class="text-sm font-medium text-foreground">Runtime status</div>
            <div class="mt-3 space-y-2 text-sm">
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">Vue apps</span>
                <span class="text-foreground/90">{{ snapshot?.apps.length ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">Serialized nodes</span>
                <span class="text-foreground/90">{{ snapshot?.totalSerializedNodes ?? 0 }}</span>
              </div>
              <div class="flex items-center justify-between gap-3">
                <span class="text-muted-foreground/70">Hook source</span>
                <span class="text-foreground/90">{{
                  snapshot?.hasDevtoolsHook ? "DevTools hook" : "DOM fallback"
                }}</span>
              </div>
            </div>
          </div>
        </div>

        <div
          v-for="section in selectedSummary"
          :key="section.label"
          class="rounded-2xl border border-border/30 bg-surface-0 overflow-hidden"
        >
          <div class="border-b border-border/20 px-4 py-3 text-sm font-medium text-foreground">
            {{ section.label }}
          </div>
          <pre class="max-h-88 overflow-auto px-4 py-4 text-xs leading-5 text-foreground/85">{{
            section.value
          }}</pre>
        </div>
      </div>

      <div v-else class="flex-1 flex items-center justify-center text-sm text-muted-foreground/60">
        Select a Vue component to inspect its props and reactive state.
      </div>
    </section>
  </div>
</template>
