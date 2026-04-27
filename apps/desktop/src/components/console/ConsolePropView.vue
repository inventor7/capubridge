<script setup lang="ts">
import type { ConsoleArg } from "@/types/console.types";
import ConsoleObjectView from "./ConsoleObjectView.vue";

defineProps<{ value: ConsoleArg }>();

function primitiveClass(text: string): string {
  if (text === "true" || text === "false") return "text-violet-300";
  if (text === "null" || text === "undefined") return "text-muted-foreground/50 italic";
  if (/^-?\d+(\.\d+)?$/.test(text)) return "text-blue-300";
  if (/^["'].*["']$/.test(text) || text.startsWith('"')) return "text-orange-200/85";
  return "text-foreground/85";
}
</script>

<template>
  <ConsoleObjectView v-if="value.kind === 'object'" :arg="value" />
  <span v-else class="break-all" :class="primitiveClass(value.text)">{{ value.text }}</span>
</template>
