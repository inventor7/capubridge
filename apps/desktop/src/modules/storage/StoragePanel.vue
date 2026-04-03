<script setup lang="ts">
import { RouterView } from "vue-router";
import StorageTabs from "@/components/layout/StorageTabs.vue";
</script>

<template>
  <div class="flex h-full flex-col overflow-hidden">
    <StorageTabs />
    <div class="flex-1 overflow-hidden">
      <RouterView />
    </div>
  </div>
</template>
