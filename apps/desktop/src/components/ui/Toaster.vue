<script setup lang="ts">
import { Toaster as SonnerToaster } from "vue-sonner";
</script>

<template>
  <SonnerToaster
    position="bottom-right"
    theme="dark"
    :rich-colors="true"
    :visible-toasts="5"
    :toast-options="{
      duration: 4000,
    }"
  />
</template>
