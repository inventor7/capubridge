<script setup lang="ts">
import { ref } from "vue";

defineProps<{
  modes: { key: string; label: string; title: string; summary: string }[];
}>();

const activeModeKey = ref("inspect");
</script>

<template>
  <section
    class="relative h-[100svh] min-h-[680px] overflow-hidden px-3 pb-3 pt-[4.25rem] md:min-h-[760px] md:px-5 md:pb-5 md:pt-[4.6rem]"
  >
    <div class="absolute inset-0 bg-[#080808]" />
    <div
      class="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(30,30,35,0.8)_0%,rgba(8,8,8,1)_70%)]"
    />

    <div class="relative z-10 flex h-full flex-col items-center justify-center">
      <h1
        class="font-[var(--font-display)] text-[48px] leading-[0.88] text-white md:text-[72px] lg:text-[96px]"
      >
        Capubridge
      </h1>
      <p
        class="mt-6 max-w-[600px] text-center text-[16px] leading-relaxed text-white/[0.6] md:text-[20px]"
      >
        Android WebView debugging, reimagined. All in one place.
      </p>

      <div class="mt-10 flex gap-4">
        <a
          href="#download"
          class="rounded-full bg-white px-8 py-3 text-[13px] font-semibold text-black transition hover:scale-105"
        >
          Download
        </a>
        <a
          href="#features"
          class="rounded-full border border-white/[0.2] px-8 py-3 text-[13px] font-semibold text-white transition hover:bg-white/[0.06]"
        >
          Learn more
        </a>
      </div>
    </div>

    <div class="absolute bottom-8 left-0 right-0 flex justify-center gap-8">
      <a
        v-for="mode in modes"
        :key="mode.key"
        href="#features"
        class="text-[11px] uppercase tracking-[0.16em] text-white/[0.42] transition hover:text-white"
      >
        {{ mode.label }}
      </a>
    </div>
  </section>
</template>
