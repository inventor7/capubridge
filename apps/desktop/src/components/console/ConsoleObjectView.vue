<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronRight, Loader2 } from "lucide-vue-next";
import type { ConsoleArgObject, ConsoleProp } from "@/types/console.types";
import { useConsoleStore } from "@/stores/console.store";
import ConsolePropView from "./ConsolePropView.vue";

const props = defineProps<{
  arg: ConsoleArgObject;
  defaultExpanded?: boolean;
}>();

const consoleStore = useConsoleStore();

const expanded = ref(props.defaultExpanded ?? false);
const fetched = ref(false);
const fetching = ref(false);
const fetchedProps = ref<ConsoleProp[] | null>(null);

const isArray = computed(
  () => props.arg.subtype === "array" || props.arg.description.startsWith("Array"),
);

function isAnonymousType(desc: string): boolean {
  if (desc === "Object" || desc === "object" || desc === "function") return true;
  if (/^Array\(\d+\)$/.test(desc) || desc === "Array") return true;
  return false;
}

const typeLabel = computed(() =>
  isAnonymousType(props.arg.description) ? "" : props.arg.description,
);

const displayProperties = computed(() => fetchedProps.value ?? props.arg.properties);
const hasFetcher = computed(() => typeof consoleStore.fetchObjectProperties === "function");
const canExpand = computed(
  () => props.arg.properties.length > 0 || (!!props.arg.objectId && hasFetcher.value),
);

function previewText(text: string, max = 24): string {
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const inlinePreview = computed(() => {
  if (props.arg.properties.length === 0) return "";
  const items = props.arg.properties.slice(0, isArray.value ? 5 : 3).map((p) => {
    if (p.value.kind === "object") {
      return isArray.value ? p.value.description : `${p.name}: ${p.value.description}`;
    }
    const v = previewText(p.value.text);
    return isArray.value ? v : `${p.name}: ${v}`;
  });
  const more = props.arg.overflow || props.arg.properties.length > items.length ? ", …" : "";
  return isArray.value ? `[${items.join(", ")}${more}]` : `{${items.join(", ")}${more}}`;
});

async function toggle(e: MouseEvent) {
  e.stopPropagation();
  expanded.value = !expanded.value;
  if (expanded.value && !fetched.value && props.arg.objectId && hasFetcher.value) {
    fetched.value = true;
    fetching.value = true;
    try {
      const fresh = await consoleStore.fetchObjectProperties(props.arg.objectId);
      if (fresh.length > 0) {
        fetchedProps.value = fresh;
      }
    } catch {
      void 0;
    } finally {
      fetching.value = false;
    }
  }
}
</script>

<template>
  <span class="inline-block align-top max-w-full">
    <span
      class="inline-flex items-baseline gap-0.5 cursor-pointer hover:bg-surface-2/40 rounded-sm pr-1"
      @click="toggle"
    >
      <ChevronRight
        v-if="canExpand"
        class="w-3 h-3 shrink-0 self-center text-muted-foreground/55 transition-transform"
        :class="expanded ? 'rotate-90' : ''"
      />
      <span v-else class="w-3 h-3 shrink-0" />
      <span v-if="typeLabel" class="text-violet-300/90 font-medium">{{ typeLabel }}</span>
      <span
        v-if="!expanded && (arg.properties.length > 0 || (!typeLabel && canExpand))"
        class="text-muted-foreground/55 truncate max-w-[420px]"
        >{{ typeLabel ? " " : "" }}{{ inlinePreview || (isArray ? "[…]" : "{…}") }}</span
      >
    </span>

    <div v-if="expanded" class="block pl-4 mt-0.5 border-l border-border/15 ml-1.5">
      <div
        v-if="fetching && displayProperties.length === 0"
        class="flex items-center gap-1.5 text-muted-foreground/50 italic"
      >
        <Loader2 class="w-3 h-3 animate-spin" /> loading…
      </div>
      <div
        v-for="(prop, i) in displayProperties"
        :key="i"
        class="flex items-baseline gap-1 leading-relaxed"
      >
        <span class="text-violet-300/75 shrink-0">{{ prop.name }}:</span>
        <ConsolePropView :value="prop.value" />
      </div>
      <div v-if="arg.overflow && !fetchedProps" class="text-muted-foreground/40 pl-1">…</div>
      <div
        v-if="!fetching && displayProperties.length === 0"
        class="text-muted-foreground/40 italic"
      >
        empty
      </div>
    </div>
  </span>
</template>
