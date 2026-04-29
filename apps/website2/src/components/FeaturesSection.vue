<script setup lang="ts">
import { ref } from "vue";
import BlurText from "@/components/BlurText/BlurText.vue";
import Grainient from "@/components/Grainient/Grainient.vue";
import { Motion } from "motion-v";

const features = [
  {
    key: "devices",
    label: "Device Management",
    title: "One UI for every device",
    body: "Auto-detect USB and TCP/IP devices. Connect, pair, or restart ADB server from a single view. Per-device sessions with temperature tracking so you always know what's hot, warm, or cold.",
    metrics: ["USB + TCP", "Session temperature", "Shell access"],
    accent: "#e8765a",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203814.png",
  },
  {
    key: "cdp",
    label: "CDP Inspection",
    title: "All targets, one bridge",
    body: "Discover every debuggable WebView on the device. Ports forward automatically. No more manual `adb forward`. Attach to any target directly in the app or open external DevTools.",
    metrics: ["Auto-forward", "Multi-target", "No conflicts"],
    accent: "#71cbff",
    screenshot: "/screenshots/Screenshot%202026-04-28%20204307.png",
  },
  {
    key: "storage",
    label: "Storage Explorer",
    title: "State as a graph",
    body: "Walk IndexedDB, LocalStorage, Cache API, OPFS, and SQLite in one unified view. Edit, add, delete records directly on the device through CDP. No fake local mutations.",
    metrics: ["5 storage types", "CDP writes", "Graph view"],
    accent: "#8f86ff",
    screenshot: "/screenshots/Screenshot%202026-04-28%20204022.png",
  },
  {
    key: "logcat",
    label: "Logcat",
    title: "Live, lease-bound logs",
    body: "Stream device logs in real-time with xterm.js performance. Tag and level filtering that actually works. Lease-based lifecycle means logs stop when you leave the section.",
    metrics: ["Real-time", "Lease-bound", "Filtered"],
    accent: "#5ad39a",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203926.png",
  },
  {
    key: "perf",
    label: "Performance",
    title: "Metrics that move with you",
    body: "CPU, memory, and network metrics per app process. Live, lease-bound updates. Know the device state before you start investigating.",
    metrics: ["CPU + RAM + Net", "Live", "Lease-bound"],
    accent: "#f0c36b",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203716.png",
  },
  {
    key: "mirror",
    label: "Screen Mirror",
    title: "The phone on your screen",
    body: "Mirror via scrcpy. Touch, swipe, scroll, keyboard injection. Screenshot and recording. Detachable window. Clipboard sync between device and host.",
    metrics: ["scrcpy", "Touch input", "Recording"],
    accent: "#e8765a",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203814.png",
  },
  {
    key: "packages",
    label: "Package Manager",
    title: "Every app catalogued",
    body: "List all third-party or system packages. Icon resolution with persistent cache. Open details or launch apps directly from the list.",
    metrics: ["Icons cached", "Launch apps", "Details"],
    accent: "#71cbff",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203814.png",
  },
  {
    key: "files",
    label: "File Browser",
    title: "Protected paths handled",
    body: "Browse device filesystem. Pull files to host and open in native apps. Graceful fallbacks for `/storage/self` and `/storage/emulated`.",
    metrics: ["Full access", "Pull files", "Safe paths"],
    accent: "#8f86ff",
    screenshot: "/screenshots/Screenshot%202026-04-28%20203814.png",
  },
  {
    key: "recording",
    label: "Recording",
    title: "Session evidence",
    body: "Record DOM mutations, network requests, console logs, rrweb events. Replay with frame-by-frame scrubbing. Multi-lane synchronized view. Export as zip.",
    metrics: ["Multi-lane", "Scrubbing", "Zip export"],
    accent: "#f2efe9",
    screenshot: "/screenshots/Screenshot%202026-04-28%20204458.png",
  },
];

const activeKey = ref(features[0]?.key ?? "");
</script>

<template>
  <section id="features" class="relative overflow-hidden px-3 py-16 md:px-5 md:py-24">
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,#09090b_0%,#0b0f14_45%,#09090b_100%)]"
    />
    <div class="absolute inset-0 opacity-[0.88]">
      <Grainient
        class-name="h-full w-full"
        color1="#1a2028"
        color2="#0d151a"
        color3="#181c20"
        :time-speed="0.06"
        :color-balance="-0.2"
        :warp-strength="0.65"
        :warp-frequency="2.8"
        :warp-speed="1.4"
        :warp-amplitude="42"
        :blend-angle="18"
        :blend-softness="0.18"
        :rotation-amount="-200"
        :noise-scale="1.6"
        :grain-amount="0.05"
        :grain-scale="2"
        :grain-animated="false"
        :contrast="1.08"
        :gamma="1"
        :saturation="0.65"
        :center-x="0.2"
        :center-y="0.8"
        :zoom="1.1"
      />
    </div>
    <div
      class="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.92)_0%,rgba(9,9,11,0.54)_38%,rgba(9,9,11,0.08)_68%,rgba(9,9,11,0.52)_100%)]"
    />
    <div
      class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:44px_44px]"
    />
    <div
      class="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.96))]"
    />

    <div class="relative z-10 mx-auto max-w-[1440px]">
      <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            Nine capabilities
          </p>
          <BlurText
            text="Everything runs in one place."
            tag="h2"
            animate-by="words"
            direction="top"
            :delay="95"
            class-name="mt-3 font-[var(--font-display)] text-[32px] leading-[0.92] text-white md:text-[52px]"
          />
        </div>
        <p class="max-w-[380px] text-[13px] leading-6 text-white/[0.56] md:text-right">
          ADB, CDP, logcat, performance, mirror, storage, packages, files, and recording. All in one
          native desktop app that speaks the protocol.
        </p>
      </div>

      <div class="grid gap-3 lg:grid-cols-[1fr_1.4fr]">
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
          <Motion
            v-for="(feature, index) in features"
            :key="feature.key"
            tag="button"
            type="button"
            :initial="{ opacity: 0, x: -12 }"
            :while-in-view="{ opacity: 1, x: 0 }"
            :viewport="{ once: true, margin: '-24px' }"
            :transition="{ duration: 0.38, delay: index * 0.05 }"
            class="group w-full text-left"
            @mouseenter="activeKey = feature.key"
            @click="activeKey = feature.key"
          >
            <article
              class="relative overflow-hidden rounded-xl border px-4 py-3.5 transition duration-200"
              :class="[
                activeKey === feature.key
                  ? 'border-white/[0.18] bg-[#101218]'
                  : 'border-white/[0.08] bg-[#0c0e14]/[0.42] hover:border-white/[0.14]',
              ]"
              :style="
                activeKey === feature.key
                  ? { boxShadow: `0 0 48px ${feature.accent}12` }
                  : undefined
              "
            >
              <div class="flex items-center justify-between gap-3">
                <div>
                  <span
                    class="text-[9px] uppercase tracking-[0.16em]"
                    :style="{ color: feature.accent }"
                  >
                    {{ feature.label }}
                  </span>
                  <h3 class="mt-1 text-[14px] font-semibold text-white">
                    {{ feature.title }}
                  </h3>
                </div>
                <div
                  class="h-2 w-2 rounded-full transition duration-200"
                  :style="{
                    backgroundColor:
                      activeKey === feature.key ? feature.accent : 'rgba(255,255,255,0.18)',
                    boxShadow: activeKey === feature.key ? `0 0 18px ${feature.accent}` : 'none',
                  }"
                />
              </div>
            </article>
          </Motion>
        </div>

        <div
          class="relative min-h-[420px] overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0a0c10]/[0.72] p-5 backdrop-blur-xl"
        >
          <Transition name="feature-panel" mode="out-in">
            <article :key="activeKey" class="relative h-full flex flex-col spaec-y-4">
              <div>
                <div class="flex items-center gap-3">
                  <span
                    class="text-[9px] uppercase tracking-[0.16em]"
                    :style="{
                      color: features.find((f) => f.key === activeKey)?.accent,
                    }"
                  >
                    {{ features.find((f) => f.key === activeKey)?.label }}
                  </span>
                  <div class="h-px flex-1 bg-white/[0.08]" />
                </div>
                <h3
                  class="mt-4 font-[var(--font-display)] text-[24px] leading-[1] text-white md:text-[32px]"
                >
                  {{ features.find((f) => f.key === activeKey)?.title }}
                </h3>
                <p class="mt-3 max-w-[36ch] text-[13px] leading-6 text-white/[0.58]">
                  {{ features.find((f) => f.key === activeKey)?.body }}
                </p>
              </div>

              <div class="mt-6 flex flex-wrap gap-2">
                <span
                  v-for="metric in features.find((f) => f.key === activeKey)?.metrics ?? []"
                  :key="metric"
                  class="rounded-full border border-white/[0.12] bg-black/[0.28] px-3 py-2 text-[10px] uppercase tracking-[0.12em] text-white/[0.62]"
                >
                  {{ metric }}
                </span>
              </div>

              <div
                class="mt-auto flex-1 overflow-hidden rounded-lg border border-white/[0.1] bg-black/[0.24] p-1"
              >
                <img
                  :src="features.find((f) => f.key === activeKey)?.screenshot"
                  :alt="features.find((f) => f.key === activeKey)?.title"
                  class="h-full w-full rounded-md object-contain"
                  loading="eager"
                  decoding="async"
                />
              </div>
            </article>
          </Transition>
        </div>
      </div>
    </div>
  </section>
</template>
