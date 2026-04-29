<script setup lang="ts">
import BlurText from "@/components/BlurText/BlurText.vue";
import Grainient from "@/components/Grainient/Grainient.vue";
import AnimatedContent from "@/components/AnimatedContent/AnimatedContent.vue";
import { Motion } from "motion-v";

const platforms = [
  {
    key: "macos-arm64",
    label: "macOS",
    arch: "Apple Silicon",
    format: ".dmg",
    status: "Ready",
    accent: "#e8765a",
  },
  {
    key: "macos-x64",
    label: "macOS",
    arch: "Intel",
    format: ".dmg",
    status: "Ready",
    accent: "#e8765a",
  },
  {
    key: "windows",
    label: "Windows",
    arch: "x64",
    format: ".exe",
    status: "Ready",
    accent: "#71cbff",
  },
  {
    key: "linux",
    label: "Linux",
    arch: "x64",
    format: ".AppImage",
    status: "Ready",
    accent: "#8f86ff",
  },
];
</script>

<template>
  <section id="download" class="relative overflow-hidden px-3 py-20 md:px-5 md:py-28">
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,#09090b_0%,#0b0f14_48%,#09090b_100%)]"
    />
    <div class="absolute inset-0 opacity-[0.88]">
      <Grainient
        class-name="h-full w-full"
        color1="#1e2a34"
        color2="#0e161c"
        color3="#171b20"
        :time-speed="0.055"
        :color-balance="-0.18"
        :warp-strength="0.75"
        :warp-frequency="3.4"
        :warp-speed="1.25"
        :warp-amplitude="46"
        :blend-angle="-24"
        :blend-softness="0.18"
        :rotation-amount="170"
        :noise-scale="1.35"
        :grain-amount="0.05"
        :grain-scale="1.95"
        :grain-animated="false"
        :contrast="1.16"
        :gamma="1"
        :saturation="0.74"
        :center-x="0.52"
        :center-y="0.32"
        :zoom="1"
      />
    </div>
    <div
      class="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.88)_0%,rgba(9,9,11,0.44)_32%,rgba(9,9,11,0.06)_58%,rgba(9,9,11,0.46)_100%)]"
    />
    <div
      class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:48px_48px]"
    />
    <div
      class="absolute inset-x-0 bottom-0 h-40 bg-[linear-gradient(180deg,transparent,rgba(9,9,11,0.98))]"
    />

    <div class="relative z-10 mx-auto max-w-[1440px]">
      <div class="mb-14 text-center">
        <p class="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">Free download</p>
        <BlurText
          text="Start debugging today."
          tag="h2"
          animate-by="words"
          direction="top"
          :delay="105"
          class-name="mt-3 font-[var(--font-display)] text-[36px] leading-[0.9] text-white md:text-[58px]"
        />
        <p class="mx-auto mt-4 max-w-[480px] text-[14px] leading-6 text-white/[0.52]">
          No account required. No trial. Open source and free forever. ADB must be in your PATH.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Motion
          v-for="(platform, index) in platforms"
          :key="platform.key"
          tag="a"
          :initial="{ opacity: 0, y: 20, scale: 0.96 }"
          :while-in-view="{ opacity: 1, y: 0, scale: 1 }"
          :viewport="{ once: true, margin: '-12px' }"
          :transition="{ duration: 0.42, delay: index * 0.07 }"
          href="#"
          class="group relative overflow-hidden rounded-xl border border-white/[0.1] bg-[#0c0e14]/[0.52] p-4 transition-all duration-300 hover:border-white/[0.22]"
        >
          <div
            class="absolute inset-0 bg-gradient-to-br opacity-0 transition duration-500 group-hover:opacity-100"
            :class="[
              platform.key === 'windows'
                ? 'from-[#71cbff]/[0.08] to-transparent'
                : platform.key === 'linux'
                  ? 'from-[#8f86ff]/[0.08] to-transparent'
                  : 'from-[#e8765a]/[0.08] to-transparent',
            ]"
          />

          <div
            class="absolute inset-x-0 bottom-0 h-px origin-left scale-x-0 scale-y-50 transition-all duration-500 group-hover:scale-x-100 group-hover:scale-y-100"
            :style="{
              background: `linear-gradient(90deg, transparent, ${platform.accent}, transparent)`,
            }"
          />

          <div
            class="absolute -left-12 top-1/2 h-24 w-24 -translate-y-1/2 rotate-12 opacity-0 blur-3xl transition-all duration-700 group-hover:opacity-100 group-hover:rotate-0"
            :style="{ background: platform.accent }"
          />

          <div class="relative flex items-center justify-between">
            <div>
              <p class="text-[10px] uppercase tracking-[0.14em] text-white/[0.42]">
                {{ platform.label }}
              </p>
              <p class="mt-1 text-[13px] font-semibold text-white">
                {{ platform.arch }}
              </p>
              <p class="text-[11px] text-white/[0.36]">{{ platform.format }}</p>
            </div>
            <div
              class="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.12] bg-black/[0.32] transition-all duration-300 group-hover:border-transparent group-hover:bg-[var(--accent)] group-hover:scale-110"
              :style="{ '--tw-border-color': platform.accent + '40' }"
            >
              <svg
                class="h-4 w-4 text-white/[0.52] transition-all duration-300 group-hover:text-black"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </div>
          </div>
        </Motion>
      </div>

      <AnimatedContent :distance="36" direction="vertical" :duration="0.48" :delay="0.12">
        <div class="mt-12 flex flex-col items-center justify-center gap-4 md:flex-row">
          <p class="text-[12px] uppercase tracking-[0.14em] text-white/[0.36]">Requires</p>
          <div class="flex flex-wrap justify-center gap-2">
            <span
              class="rounded-full border border-white/[0.1] bg-black/[0.32] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/[0.52]"
            >
              Android device
            </span>
            <span
              class="rounded-full border border-white/[0.1] bg-black/[0.32] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/[0.52]"
            >
              USB debugging
            </span>
            <span
              class="rounded-full border border-white/[0.1] bg-black/[0.32] px-3 py-1.5 text-[10px] uppercase tracking-[0.12em] text-white/[0.52]"
            >
              ADB in PATH
            </span>
          </div>
        </div>
      </AnimatedContent>
    </div>
  </section>
</template>
