<script setup lang="ts">
import { ref } from "vue";
import { Sun, Moon, Monitor } from "lucide-vue-next";
import { Button } from "@/components/ui/button";

const theme = ref<"light" | "dark" | "system">("dark");
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5">
    <div class="max-w-xl space-y-6">
      <div>
        <h3 class="text-sm font-medium text-foreground mb-3">Theme Mode</h3>
        <div class="grid grid-cols-3 gap-3">
          <Button
            v-for="mode in [
              { icon: Sun, label: 'Light', value: 'light' as const },
              { icon: Moon, label: 'Dark', value: 'dark' as const },
              { icon: Monitor, label: 'System', value: 'system' as const },
            ]"
            :key="mode.value"
            :variant="theme === mode.value ? 'default' : 'outline'"
            size="lg"
            class="flex flex-col items-center gap-2 h-auto py-6"
            @click="theme = mode.value"
          >
            <component :is="mode.icon" class="w-5 h-5" />
            <span class="text-xs font-medium">{{ mode.label }}</span>
          </Button>
        </div>
      </div>
    </div>
  </div>
</template>
