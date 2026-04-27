<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Replayer } from "rrweb";
import type { eventWithTime } from "@rrweb/types";
import type { RrwebCapuEvent } from "@/types/replay.types";

const props = defineProps<{
  events: RrwebCapuEvent[];
  /** Original app origin — used to resolve relative asset URLs (fonts, images, icons) */
  targetUrl?: string | null;
}>();

const containerRef = ref<HTMLElement | null>(null);
let replayer: Replayer | null = null;
let resizeObs: ResizeObserver | null = null;

function applyScale(container: HTMLElement, wrapper: HTMLElement) {
  const cw = container.offsetWidth;
  const ch = container.offsetHeight;
  const rw = wrapper.offsetWidth;
  const rh = wrapper.offsetHeight;
  if (!cw || !ch || !rw || !rh) return;
  const scale = Math.min(cw / rw, ch / rh);
  const tx = Math.round((cw - rw * scale) / 2);
  const ty = Math.round((ch - rh * scale) / 2);
  wrapper.style.position = "absolute";
  wrapper.style.top = "0";
  wrapper.style.left = "0";
  wrapper.style.transformOrigin = "0 0";
  wrapper.style.transform = `translate(${tx}px, ${ty}px) scale(${scale})`;
}

/**
 * Inject a <base> tag into the rrweb iframe so relative asset URLs
 * (fonts, images, icons, scripts) resolve to the original app's origin
 * instead of Tauri's https://localhost.
 *
 * This is called after every full-snapshot rebuild because rrweb rebuilds
 * the entire <head> on each FullSnapshot event, removing any previously
 * injected tags.
 */
function injectBaseTag() {
  if (!props.targetUrl || !replayer) return;
  try {
    const iframe = (replayer as unknown as { iframe?: HTMLIFrameElement }).iframe;
    const doc = iframe?.contentDocument;
    if (!doc?.head) return;

    const origin = new URL(props.targetUrl).origin;
    // Remove any existing base tags (rrweb may have serialised one from the recording)
    doc.querySelectorAll("base").forEach((b) => b.remove());
    const base = doc.createElement("base");
    base.href = origin + "/";
    doc.head.prepend(base);
  } catch {
    // URL parse failed or iframe not ready — silently ignore
  }
}

onMounted(() => {
  if (!containerRef.value || props.events.length === 0) return;

  const rawEvents = props.events.map((e) => e.data) as eventWithTime[];

  replayer = new Replayer(rawEvents, {
    root: containerRef.value,
    skipInactive: true,
    speed: 1,
    mouseTail: false,
    // Silence "Node not found" and other rrweb internal warnings — they are
    // expected artefacts of partial recordings (no reload) and clutter the console.
    showWarning: false,
    showDebug: false,
  } as any);

  // Re-inject base tag every time rrweb rebuilds the iframe DOM from a full snapshot
  replayer.on("fullsnapshot-reconstructed", () => {
    // Small timeout — rrweb finishes head setup synchronously after the event,
    // but prepend after event tick to avoid racing with its own head writes.
    setTimeout(injectBaseTag, 0);
  });

  replayer.pause(0);
  // Initial injection after the first snapshot is applied
  setTimeout(injectBaseTag, 100);

  const wrapper = containerRef.value.querySelector(".replayer-wrapper") as HTMLElement | null;
  if (!wrapper) return;

  const container = containerRef.value;
  applyScale(container, wrapper);

  resizeObs = new ResizeObserver(() => applyScale(container, wrapper));
  resizeObs.observe(container);
});

onUnmounted(() => {
  resizeObs?.disconnect();
  resizeObs = null;
  replayer?.destroy();
  replayer = null;
});

function seekTo(ms: number) {
  replayer?.pause(ms);
}

function play(fromMs?: number) {
  if (fromMs !== undefined) {
    replayer?.play(fromMs);
  } else {
    replayer?.play();
  }
}

function pause(atMs?: number) {
  replayer?.pause(atMs);
}

defineExpose({ seekTo, play, pause });
</script>

<template>
  <div class="relative w-full h-full overflow-hidden bg-black rounded-md">
    <div ref="containerRef" class="absolute inset-0" />

    <div
      v-if="events.length === 0"
      class="absolute inset-0 flex flex-col items-center justify-center gap-2 text-muted-foreground/40"
    >
      <p class="text-sm">No DOM events recorded</p>
      <p class="text-[11px]">Enable the DOM replay track when recording</p>
    </div>
  </div>
</template>
