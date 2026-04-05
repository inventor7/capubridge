<script setup lang="ts">
import { ref } from "vue";
import { Globe, FolderOpen, Settings } from "lucide-vue-next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CHROME_CDP_PORT } from "@/config/ports";

const customChromePath = ref("");
const chromePort = ref(CHROME_CDP_PORT);
const customArgs = ref("");
</script>

<template>
  <div class="flex-1 overflow-y-auto p-5">
    <div class="max-w-xl space-y-6">
      <div>
        <h3 class="text-sm font-medium text-foreground mb-3">Chrome Debug Configuration</h3>
        <div class="space-y-3">
          <div class="flex items-center justify-between p-3 bg-accent border border-border">
            <div class="flex items-center gap-3">
              <Globe class="w-4 h-4 text-muted-foreground" />
              <div>
                <Label class="text-xs font-medium text-foreground">CDP Port</Label>
                <p class="text-2xs text-muted-foreground">Port Chrome will expose for debugging</p>
              </div>
            </div>
            <Input
              v-model.number="chromePort"
              type="number"
              class="w-20 h-8 font-mono text-xs text-center"
              :min="1024"
              :max="65535"
            />
          </div>

          <div class="flex items-center justify-between p-3 bg-accent border border-border">
            <div class="flex items-center gap-3">
              <FolderOpen class="w-4 h-4 text-muted-foreground" />
              <div>
                <Label class="text-xs font-medium text-foreground">Chrome Path</Label>
                <p class="text-2xs text-muted-foreground">
                  Custom Chrome executable (leave empty for auto-detect)
                </p>
              </div>
            </div>
            <Input
              v-model="customChromePath"
              class="w-56 h-8 font-mono text-xs"
              placeholder="auto-detect"
            />
          </div>

          <div class="p-3 bg-accent border border-border">
            <div class="flex items-center gap-3 mb-2">
              <Settings class="w-4 h-4 text-muted-foreground" />
              <div>
                <Label class="text-xs font-medium text-foreground">Extra Launch Args</Label>
                <p class="text-2xs text-muted-foreground">
                  Additional flags passed when launching Chrome
                </p>
              </div>
            </div>
            <Input
              v-model="customArgs"
              class="w-full h-8 font-mono text-xs mt-2"
              placeholder="--disable-extensions --disable-gpu"
            />
          </div>

          <div class="p-3 bg-accent border border-border">
            <span class="text-xs font-medium text-foreground">Launch Mode</span>
            <p class="text-2xs text-muted-foreground mb-2">
              Auto-launch starts a new Chrome instance. Manual connect attaches to an existing one
              started with
              <code class="text-[10px] bg-surface-3 px-1 py-0.5 rounded"
                >--remote-debugging-port</code
              >.
            </p>
            <div class="flex gap-1.5">
              <Button variant="default" size="sm"> Auto-launch </Button>
              <Button variant="outline" size="sm"> Manual connect </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
