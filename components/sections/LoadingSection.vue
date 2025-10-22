<template>
  <section
    ref="loadingSectionRef"
    class="min-h-screen w-full overflow-hidden bg-primary fixed inset-0 -z-10"
  >
    <!-- Blue background section -->
    <div
      ref="blueSectionRef"
      class="flex items-center justify-between flex-col gap-8 h-screen p-8"
    >
      <!-- Logo in blue section -->
      <div ref="logoBlueRef">
        <Logo color="var(--color-secondary)" class="w-[113px] h-8" />
      </div>
      <div>
        <!-- Absolutely positioned CHARGEMENT text to the left -->
        <div
          class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:block hidden"
        >
          <div
            ref="chargementTextRef"
            class="text-secondary font-medium lg:text-2xl text-xl tracking-[3.84px] uppercase opacity-0 lg:-translate-x-72 md:-translate-x-60 -translate-x-50"
          >
            CHARGEMENT
          </div>
        </div>

        <!-- Absolutely positioned image in center -->
        <div
          class="sm:absolute left-1/2 top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div
            ref="imageContainerRef"
            class="relative lg:size-36 md:size-30 sm:size-28 size-36 opacity-0"
          >
            <ImageSequenceAnimator :progress="progress" />
          </div>
        </div>

        <!-- Absolutely positioned percentage text to the right -->
        <div
          class="sm:absolute left-1/2 top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
        >
          <div
            ref="percentageTextRef"
            class="text-secondary font-medium lg:text-2xl text-xl tracking-[3.84px] uppercase opacity-0 min-w-[80px] sm:text-right text-center lg:translate-x-72 md:translate-x-60 sm:translate-x-50"
          >
            {{ progress }}%
          </div>
        </div>
      </div>
      <p class="font-serif text-secondary text-center text-serif-size">
        un projet pour la prévention du cancer du sein
      </p>
    </div>
  </section>
</template>

<script setup>
import { gsap } from "gsap";
import Logo from "~/components/ui/Logo.vue";
import { useAnimationsStore } from "~/stores";
import { useAssetPreloader } from "~/composables/useAssetPreloader";
import ImageSequenceAnimator from "~/components/ui/ImageSequenceAnimator.vue";

const progress = ref(0);
const isComplete = ref(false);

// Store
const store = useAnimationsStore();

// Refs for GSAP animations
const loadingSectionRef = ref(null);
const blueSectionRef = ref(null);
const logoBlueRef = ref(null);
const chargementTextRef = ref(null);
const percentageTextRef = ref(null);
const imageContainerRef = ref(null);

// Master timeline for coordinated loading sequence
let masterTimeline = null;

const startLoadingSequence = () => {
  // Create master timeline for the entire loading sequence
  masterTimeline = gsap.timeline();

  // Set all elements to visible immediately (no opacity animations)
  masterTimeline.set(
    [chargementTextRef.value, imageContainerRef.value, percentageTextRef.value],
    {
      opacity: 1,
    }
  );

  // Start the progress counter immediately
  masterTimeline.add(startProgressCounter());
};

onMounted(async () => {
  // Initial setup
  gsap.set(
    [chargementTextRef.value, percentageTextRef.value, imageContainerRef.value],
    {
      opacity: 0,
    }
  );

  try {
    // Preload all critical assets before starting the loading sequence
    const { preloadAllAssets, isComplete } = useAssetPreloader({
      onProgress: (loaded, total) => {
        console.log(`Preloading assets: ${loaded}/${total}`);
      },
      onComplete: () => {
        console.log("All critical assets preloaded successfully");
      },
      onError: (error) => {
        console.warn("Asset preloading failed:", error);
        // Continue with loading sequence even if preloading fails
      },
    });

    // Wait for assets to be preloaded
    await preloadAllAssets();

    // Start the coordinated loading sequence after preloading is complete
    startLoadingSequence();
  } catch (error) {
    console.warn(
      "Asset preloading encountered issues, continuing with loading sequence:",
      error
    );
    // Start loading sequence even if preloading fails
    startLoadingSequence();
  }
});

const startProgressCounter = () => {
  const duration = 2500;

  // Use GSAP to animate progress from 0 to 100
  return gsap.to(
    { progress: 0 },
    {
      progress: 100,
      duration: duration / 1000, // Convert to seconds
      ease: "none", // Linear progression
      onUpdate: function () {
        // Update progress value
        progress.value = Math.round(this.targets()[0].progress);
      },
      onComplete: function () {
        progress.value = 100;
        store.updateSectionState("loading", "isAnimating");
      },
    }
  );
};
</script>