<script setup lang="ts">
import { ref } from "vue";
import BlurText from "@/components/BlurText/BlurText.vue";
import Grainient from "@/components/Grainient/Grainient.vue";
import { Motion } from "motion-v";

const props = defineProps<{
  screenshots: { src: string; title: string; caption: string; mode: string }[];
}>();

const activeIndex = ref(0);

const next = () => {
  if (activeIndex.value < props.screenshots.length - 1) {
    activeIndex.value++;
  } else {
    activeIndex.value = 0;
  }
};

const prev = () => {
  if (activeIndex.value > 0) {
    activeIndex.value--;
  } else {
    activeIndex.value = props.screenshots.length - 1;
  }
};
</script>

<template>
  <section id="screenshots" class="relative overflow-hidden px-3 py-20 md:px-5 md:py-28">
    <div
      class="absolute inset-0 bg-[linear-gradient(180deg,#09090b_0%,#0b0f14_42%,#09090b_100%)]"
    />
    <div class="absolute inset-0 opacity-[0.84]">
      <Grainient
        class-name="h-full w-full"
        color1="#1a242e"
        color2="#0d1418"
        color3="#161a1d"
        :time-speed="0.065"
        :color-balance="-0.24"
        :warp-strength="0.68"
        :warp-frequency="2.9"
        :warp-speed="1.35"
        :warp-amplitude="44"
        :blend-angle="22"
        :blend-softness="0.16"
        :rotation-amount="-185"
        :noise-scale="1.45"
        :grain-amount="0.045"
        :grain-scale="2.1"
        :grain-animated="false"
        :contrast="1.14"
        :gamma="1"
        :saturation="0.72"
        :center-x="0.35"
        :center-y="0.7"
        :zoom="1.05"
      />
    </div>
    <div
      class="absolute inset-0 bg-[linear-gradient(90deg,rgba(9,9,11,0.9)_0%,rgba(9,9,11,0.48)_34%,rgba(9,9,11,0.08)_60%,rgba(9,9,11,0.5)_100%)]"
    />
    <div
      class="absolute inset-x-0 bottom-0 h-32 bg-[linear-gradient(180deg,rgba(9,9,11,0),rgba(9,9,11,0.96))]"
    />

    <div class="relative z-10 mx-auto max-w-[1440px]">
      <div class="mb-8 text-center">
        <BlurText
          text="Every surface."
          tag="h2"
          animate-by="words"
          direction="top"
          :delay="90"
          class-name="font-[var(--font-display)] text-[38px] leading-[0.9] text-white md:text-[62px]"
        />
      </div>

      <Motion
        tag="div"
        :initial="{ opacity: 0, y: 32 }"
        :while-in-view="{ opacity: 1, y: 0 }"
        :viewport="{ once: true }"
        :transition="{ duration: 0.6 }"
        class="relative mx-auto max-w-[960px]"
      >
        <div
          class="relative overflow-hidden rounded-2xl border border-white/[0.12] bg-[#0a0c10]/[0.72] shadow-2xl"
        >
          <div class="absolute inset-0 z-10 flex items-center justify-center gap-2">
            <div v-for="(shot, index) in screenshots" :key="index" class="flex items-center gap-2">
              <button
                type="button"
                class="h-1.5 rounded-full transition-all duration-300"
                :class="[
                  index === activeIndex
                    ? 'w-8 bg-[var(--accent)]'
                    : 'w-1.5 bg-white/[0.12] hover:bg-white/[0.24]',
                ]"
                :aria-label="`Go to screenshot ${index + 1}`"
                @click="activeIndex = index"
              />
            </div>
          </div>

          <div class="absolute left-4 top-1/2 z-20 -translate-y-1/2">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-black/[0.52] text-white/[0.52] backdrop-blur transition-all duration-300 hover:border-white/[0.2] hover:text-white"
              @click="prev"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
          </div>

          <div class="absolute right-4 top-1/2 z-20 -translate-y-1/2">
            <button
              type="button"
              class="flex h-10 w-10 items-center justify-center rounded-full border border-white/[0.1] bg-black/[0.52] text-white/[0.52] backdrop-blur transition-all duration-300 hover:border-white/[0.2] hover:text-white"
              @click="next"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </button>
          </div>

          <Transition name="screenshot-fade" mode="out-in">
            <div :key="activeIndex" class="relative aspect-[16/10]">
              <img
                :src="screenshots[activeIndex].src"
                :alt="screenshots[activeIndex].title"
                class="h-full w-full object-contain"
                loading="eager"
                decoding="async"
              />
            </div>
          </Transition>
        </div>
      </Motion>
    </div>
  </section>
</template>
