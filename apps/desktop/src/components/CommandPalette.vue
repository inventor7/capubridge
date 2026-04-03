<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { useRouter } from "vue-router";
import {
  Search,
  Smartphone,
  Database,
  Globe,
  Terminal,
  Puzzle,
  Settings,
  ScreenShare,
  RefreshCw,
  Wifi,
  Camera,
  Power,
} from "lucide-vue-next";

const props = defineProps<{ open: boolean }>();
const emit = defineEmits<{ close: [] }>();

const router = useRouter();
const query = ref("");
const selected = ref(0);
const inputRef = ref<HTMLInputElement>();

const commands = [
  {
    group: "Navigate",
    icon: Smartphone,
    label: "Devices",
    action: () => router.push("/devices"),
    keys: "D",
  },
  {
    group: "Navigate",
    icon: Database,
    label: "Storage",
    action: () => router.push("/storage"),
    keys: "S",
  },
  {
    group: "Navigate",
    icon: Globe,
    label: "Network",
    action: () => router.push("/network"),
    keys: "N",
  },
  {
    group: "Navigate",
    icon: Terminal,
    label: "Console",
    action: () => router.push("/console"),
    keys: "C",
  },
  {
    group: "Navigate",
    icon: Puzzle,
    label: "Hybrid Tools",
    action: () => router.push("/hybrid"),
    keys: "H",
  },
  {
    group: "Navigate",
    icon: Settings,
    label: "Settings",
    action: () => router.push("/settings"),
    keys: "",
  },
  { group: "Device", icon: ScreenShare, label: "Take Screenshot", action: () => {}, keys: "" },
  { group: "Device", icon: RefreshCw, label: "Restart ADB", action: () => {}, keys: "" },
  { group: "Device", icon: Wifi, label: "Enable WiFi Debug", action: () => {}, keys: "" },
  { group: "Device", icon: Camera, label: "Start Screen Record", action: () => {}, keys: "" },
  { group: "Device", icon: Power, label: "Reboot Device", action: () => {}, keys: "" },
];

const filtered = computed(() => {
  if (!query.value) return commands;
  const q = query.value.toLowerCase();
  return commands.filter(
    (c) => c.label.toLowerCase().includes(q) || c.group.toLowerCase().includes(q),
  );
});

const grouped = computed(() => {
  const map = new Map<string, typeof commands>();
  for (const cmd of filtered.value) {
    if (!map.has(cmd.group)) map.set(cmd.group, []);
    map.get(cmd.group)!.push(cmd);
  }
  return map;
});

const flatFiltered = computed(() => filtered.value);

watch(
  () => filtered.value,
  () => {
    selected.value = 0;
  },
);

function run(idx: number) {
  const cmd = flatFiltered.value[idx];
  if (cmd) {
    cmd.action();
    emit("close");
  }
}

function onKey(e: KeyboardEvent) {
  if (e.key === "ArrowDown") {
    e.preventDefault();
    selected.value = Math.min(selected.value + 1, flatFiltered.value.length - 1);
  }
  if (e.key === "ArrowUp") {
    e.preventDefault();
    selected.value = Math.max(selected.value - 1, 0);
  }
  if (e.key === "Enter") {
    e.preventDefault();
    run(selected.value);
  }
  if (e.key === "Escape") {
    emit("close");
  }
}

watch(
  () => props.open,
  async (val) => {
    if (val) {
      query.value = "";
      selected.value = 0;
      await nextTick();
      inputRef.value?.focus();
    }
  },
);

function globalIndex(group: string, localIdx: number): number {
  let offset = 0;
  for (const [g, cmds] of grouped.value) {
    if (g === group) return offset + localIdx;
    offset += cmds.length;
  }
  return 0;
}
</script>

<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-all duration-150"
      enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100"
      leave-active-class="transition-all duration-100"
      leave-from-class="opacity-100 scale-100"
      leave-to-class="opacity-0 scale-95"
    >
      <div v-if="open" class="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <!-- Backdrop -->
        <div class="absolute inset-0 bg-black/50 backdrop-blur-sm" @click="emit('close')" />

        <!-- Palette -->
        <div
          class="relative w-[520px] bg-surface-1 border border-border/40 rounded-xl shadow-2xl overflow-hidden"
        >
          <!-- Input -->
          <div class="flex items-center gap-3 px-4 py-3 border-b border-border/20">
            <Search class="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref="inputRef"
              v-model="query"
              @keydown="onKey"
              class="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              placeholder="Type a command or search…"
            />
            <kbd
              class="text-2xs text-dimmed bg-surface-3 px-1.5 py-0.5 rounded border border-border/30"
              >esc</kbd
            >
          </div>

          <!-- Results -->
          <div class="max-h-[320px] overflow-y-auto py-1">
            <template v-for="[group, cmds] in grouped" :key="group">
              <div class="px-3 py-1.5 text-2xs text-dimmed uppercase tracking-wider font-medium">
                {{ group }}
              </div>
              <button
                v-for="(cmd, i) in cmds"
                :key="cmd.label"
                @click="run(globalIndex(group, i))"
                @mouseenter="selected = globalIndex(group, i)"
                class="w-full flex items-center gap-3 px-3 py-2 text-sm transition-colors"
                :class="
                  selected === globalIndex(group, i)
                    ? 'bg-primary/[0.08] text-foreground'
                    : 'text-secondary-foreground hover:bg-surface-2/60'
                "
              >
                <component
                  :is="cmd.icon"
                  class="w-4 h-4 shrink-0"
                  :class="
                    selected === globalIndex(group, i) ? 'text-primary' : 'text-muted-foreground'
                  "
                />
                <span class="flex-1 text-left text-xs">{{ cmd.label }}</span>
                <span
                  v-if="cmd.keys"
                  class="text-2xs font-mono text-dimmed bg-surface-3 px-1.5 py-0.5 rounded border border-border/30"
                  >{{ cmd.keys }}</span
                >
              </button>
            </template>

            <div v-if="flatFiltered.length === 0" class="py-8 text-center">
              <p class="text-xs text-muted-foreground">No commands found</p>
              <p class="text-2xs text-dimmed mt-1">Try a different search term</p>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
