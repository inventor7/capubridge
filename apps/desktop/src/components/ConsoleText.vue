<script setup lang="ts">
import { computed } from "vue";
import { parseConsoleFormat } from "@/lib/console-format";

const props = defineProps<{
  text: string;
}>();

const segments = computed(() => parseConsoleFormat(props.text));
</script>

<template>
  <div class="min-w-0 break-all whitespace-pre-wrap leading-relaxed">
    <span v-for="(seg, i) in segments" :key="i" :style="seg.style || undefined">{{
      seg.text
    }}</span>
  </div>
</template>
