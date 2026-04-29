<script setup lang="ts">
import BlurText from "@/components/BlurText/BlurText.vue";
import Grainient from "@/components/Grainient/Grainient.vue";
import { Motion } from "motion-v";

const problems = [
  {
    icon: "$",
    title: "adb in terminal",
    description: "Manage devices with command-line tools. No GUI. No visual context.",
    pain: "Fragmented workflow",
  },
  {
    icon: "[]",
    title: "chrome://inspect",
    description: "Find WebView targets in a browser tab. Copy ports manually.",
    pain: "Manual port management",
  },
  {
    icon: "O",
    title: "Floating DevTools window",
    description: "Debug in a separate window. Lose the phone view. Context switch constantly.",
    pain: "Connection conflicts",
  },
  {
    icon: "#",
    title: "Scattered storage",
    description: "IndexedDB in one tab, LocalStorage in another. No unified view of app state.",
    pain: "No storage map",
  },
  {
    icon: "~",
    title: "No team evidence",
    description:
      "Terminal output is local only. Cannot share the debugging session with teammates.",
    pain: "Isolated context",
  },
];

const selectProblem = (key: string) => {
  const el = document.getElementById(`problem-${key}`);
  el?.scrollIntoView({ behavior: "smooth", block: "center" });
};
</script>

<template>
  <section id="problem" class="relative overflow-hidden px-3 py-16 md:px-5 md:py-24">
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,#09090b_0%,#0b0f14_45%,#09090b_100%)]"
    />
    <div class="absolute inset-0 opacity-[0.88]">
      <Grainient
        class-name="h-full w-full"
        color1="#1a2936"
        color2="#0d1318"
        color3="#161a1d"
        :time-speed="0.08"
        :color-balance="-0.18"
        :warp-strength="0.7"
        :warp-frequency="3.2"
        :warp-speed="1.2"
        :warp-amplitude="38"
        :blend-angle="-22"
        :blend-softness="0.22"
        :rotation-amount="180"
        :noise-scale="1.4"
        :grain-amount="0.06"
        :grain-scale="1.8"
        :grain-animated="false"
        :contrast="1.12"
        :gamma="1"
        :saturation="0.7"
        :center-x="0.85"
        :center-y="0.15"
        :zoom="1"
      />
    </div>
    <div
      class="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.94)_0%,rgba(9,9,11,0.58)_34%,rgba(9,9,11,0.12)_62%,rgba(9,9,11,0.48)_100%)]"
    />
    <div
      class="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:42px_42px]"
    />
    <div
      class="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.96))]"
    />

    <div class="relative z-10 mx-auto max-w-[1440px]">
      <div class="mb-12 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p class="text-[10px] uppercase tracking-[0.2em] text-[var(--accent)]">
            The broken workflow
          </p>
          <BlurText
            text="Four tools to debug one WebView."
            tag="h2"
            animate-by="words"
            direction="top"
            :delay="85"
            class-name="mt-3 font-[var(--font-display)] text-[32px] leading-[0.92] text-white md:text-[52px]"
          />
        </div>
        <p class="max-w-[380px] text-[13px] leading-6 text-white/[0.56] md:text-right">
          Debugging WebView apps today means jumping between terminal, browser, and floating
          windows. Each tool owns one piece. None owns the whole picture.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Motion
          v-for="(problem, index) in problems"
          :key="problem.title"
          tag="div"
          :initial="{ opacity: 0, y: 24, scale: 0.98 }"
          :while-in-view="{ opacity: 1, y: 0, scale: 1 }"
          :viewport="{ once: true, margin: '-48px' }"
          :transition="{ duration: 0.52, delay: index * 0.08 }"
        >
          <article
            :id="`problem-${index}`"
            class="group relative rounded-xl border border-white/[0.08] bg-[#0c0e14]/[0.62] p-5 backdrop-blur-xl transition duration-300 hover:border-white/[0.16]"
          >
            <div
              class="absolute inset-0 rounded-xl bg-[linear-gradient(180deg,rgba(232,118,90,0.04)_0%,transparent_100%)] opacity-0 transition duration-300 group-hover:opacity-100"
            />
            <div class="relative">
              <div
                class="mb-4 inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.1] bg-black/[0.32] text-[20px] font-thin text-white/[0.72]"
              >
                {{ problem.icon }}
              </div>

              <h3 class="text-[15px] font-semibold leading-[1.2] text-white">
                {{ problem.title }}
              </h3>
              <p class="mt-2 text-[12px] leading-5 text-white/[0.52]">
                {{ problem.description }}
              </p>

              <div
                class="mt-4 inline-flex items-center gap-2 rounded-full border border-white/[0.1] bg-black/[0.24] px-2.5 py-1"
              >
                <span class="h-1.5 w-1.5 rounded-full bg-[var(--accent)]/[0.6]" />
                <span class="text-[9px] uppercase tracking-[0.16em] text-white/[0.42]">
                  {{ problem.pain }}
                </span>
              </div>
            </div>
          </article>
        </Motion>
      </div>
    </div>
  </section>
</template>
