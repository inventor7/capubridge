<script setup lang="ts">
import { ref } from "vue";
import { Terminal } from "lucide-vue-next";
import { Input } from "@/components/ui/input";

const replInput = ref("");
</script>

<template>
  <div class="flex flex-1 flex-col overflow-hidden">
    <div class="flex-1 overflow-y-auto font-mono text-2xs leading-[20px] p-3">
      <div class="text-muted-foreground/40 mb-2">
        <Terminal class="w-4 h-4 inline mr-1" />
        JavaScript REPL — evaluate expressions against the active CDP target
      </div>
      <div class="text-dimmed text-xs">
        <p class="mb-1">Type an expression and press Enter to evaluate.</p>
        <p>Results from the last expression will appear below.</p>
      </div>
    </div>

    <div
      class="h-9 border-t border-border/20 bg-surface-2/30 flex items-center px-3 shrink-0 gap-2"
    >
      <span class="text-primary text-xs font-mono font-bold select-none">›</span>
      <Input
        v-model="replInput"
        class="h-7 text-xs font-mono bg-transparent border-0 focus-visible:ring-0 px-0 placeholder:text-dimmed"
        placeholder="Evaluate expression…"
      />
      <kbd class="text-2xs text-dimmed bg-surface-3 px-1.5 py-0.5 rounded border border-border/30"
        >⏎</kbd
      >
    </div>
  </div>
</template>
