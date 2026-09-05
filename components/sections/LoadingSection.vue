<template>
  <section
    ref="loadingSectionRef"
    class="fixed inset-0 -z-1000 h-[100svh] w-full overflow-hidden bg-white text-primary"
    aria-label="Chargement du site"
  >
    <div class="relative flex h-full flex-col items-center justify-between px-6 py-8 sm:px-8">
      <Logo color="var(--color-primary)" />

      <div
        ref="loadingRowRef"
        class="grid w-full max-w-[38rem] grid-cols-[1fr_clamp(6rem,10vw,8.5rem)_1fr] items-center gap-5 opacity-0 sm:gap-10"
      >
        <p class="text-right text-xl font-medium uppercase tracking-[3.84px] lg:text-2xl">
          Chargement
        </p>

        <div class="aspect-square w-full" aria-live="polite">
          <ThreeFruitLoadingAnimator
            :progress="progress"
            :pair="true"
            :randomize="false"
          />
        </div>

        <p class="min-w-[5rem] text-left text-xl font-medium tabular-nums tracking-[3.84px] lg:text-2xl">
          {{ displayProgress }}%
        </p>
      </div>

      <p class="text-serif-size text-center font-serif leading-none text-primary">
        un projet pour la prévention du cancer du sein
      </p>
    </div>
  </section>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import Logo from "~/components/ui/Logo.vue";
import ThreeFruitLoadingAnimator from "~/components/ui/ThreeFruitLoadingAnimator.vue";
import { useAnimationsStore } from "~/stores";
import { INTRO_ASSETS } from "~/utils/intro-sequence";
import { useAssetPreloader } from "~/composables/useAssetPreloader";

const store = useAnimationsStore();
const progress = ref(0);
const loadingSectionRef = ref<HTMLElement | null>(null);
const loadingRowRef = ref<HTMLElement | null>(null);
const displayProgress = computed(() => Math.round(progress.value));

let masterTimeline: gsap.core.Timeline | null = null;

const startLoadingSequence = () => {
  masterTimeline?.kill();
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  masterTimeline = gsap.timeline();
  masterTimeline.set(loadingRowRef.value, { opacity: 1 });
  masterTimeline.to(progress, {
    value: 100,
    duration: reducedMotion ? 0.01 : 2.5,
    ease: "none",
    onComplete: () => {
      progress.value = 100;
      store.updateSectionState("loading", "isAnimating");
    },
  });
};

onMounted(async () => {
  gsap.set(loadingRowRef.value, { opacity: 0 });

  try {
    const { preloadAllAssets } = useAssetPreloader({
      onError: (error) => console.warn("Asset preloading failed:", error),
    });
    await Promise.all([
      preloadAllAssets(),
      ...INTRO_ASSETS.map((src) => {
        const image = new Image();
        image.src = src;
        return image.decode().catch(() => undefined);
      }),
    ]);
  } catch (error) {
    console.warn("Asset preloading encountered issues:", error);
  }

  startLoadingSequence();
});

onUnmounted(() => {
  masterTimeline?.kill();
  masterTimeline = null;
});
</script>
