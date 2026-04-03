<script setup lang="ts">
import { Gauge } from "lucide-vue-next";
</script>

<template>
  <div class="flex flex-1 items-center justify-center">
    <div class="text-center space-y-2">
      <Gauge class="w-8 h-8 text-muted-foreground/15 mx-auto" />
      <p class="text-xs text-muted-foreground/40">Network Throttle</p>
      <p class="text-2xs text-muted-foreground/25">Coming soon</p>
    </div>
  </div>
</template>
