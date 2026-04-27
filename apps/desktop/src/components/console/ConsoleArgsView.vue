<script setup lang="ts">
import { computed } from "vue";
import type { ConsoleArg } from "@/types/console.types";
import ConsoleText from "@/components/ConsoleText.vue";
import ConsoleObjectView from "./ConsoleObjectView.vue";

const props = defineProps<{
  args: ConsoleArg[];
  textClass?: string;
}>();

const layout = computed(() => {
  const args = props.args;
  if (args.length === 0) return { format: null as string | null, remaining: [] as ConsoleArg[] };

  const first = args[0];
  if (first.kind === "primitive" && first.text.includes("%c")) {
    const cssCount = (first.text.match(/%c/g) ?? []).length;
    const cssParts: string[] = [];
    let idx = 1;
    while (cssParts.length < cssCount && idx < args.length) {
      const a = args[idx];
      if (a.kind !== "primitive") break;
      cssParts.push(a.text);
      idx++;
    }
    return {
      format: cssParts.length > 0 ? `${first.text} ${cssParts.join(" ")}` : first.text,
      remaining: args.slice(idx),
    };
  }

  return { format: null, remaining: args };
});
</script>

<template>
  <span class="inline align-baseline">
    <ConsoleText v-if="layout.format" :text="layout.format" :class="textClass" />
    <template v-for="(arg, i) in layout.remaining" :key="i">
      <span v-if="i > 0 || layout.format">&nbsp;</span>
      <ConsoleObjectView v-if="arg.kind === 'object'" :arg="arg" />
      <span v-else class="break-all" :class="textClass">{{ arg.text }}</span>
    </template>
  </span>
</template>
