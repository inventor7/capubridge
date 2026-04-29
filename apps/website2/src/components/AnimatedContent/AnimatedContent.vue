<script setup lang="ts">
import { Motion } from "motion-v";

defineProps<{
  distance?: number;
  direction?: "vertical" | "horizontal" | "diagonal";
  duration?: number;
  delay?: number;
}>();
</script>

<template>
  <Motion
    tag="div"
    :initial="{
      opacity: 0,
      y: direction === 'vertical' ? (distance ?? 50) : 0,
      x: direction === 'horizontal' ? (distance ?? 50) : 0,
    }"
    :while-in-view="{
      opacity: 1,
      y: 0,
      x: 0,
    }"
    :viewport="{ once: true, margin: '-24px' }"
    :transition="{ duration: duration ?? 0.5, delay: delay ?? 0 }"
  >
    <slot />
  </Motion>
</template>
