<script setup lang="ts">
import StorageSidebar from "./StorageSidebar.vue";
</script>

<template>
  <div class="storage-panel">
    <StorageSidebar />
    <div class="storage-content">
      <RouterView />
    </div>
  </div>
</template>

<style scoped>
.storage-panel {
  height: 100%;
  display: flex;
  overflow: hidden;
}

.storage-content {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
</style>
