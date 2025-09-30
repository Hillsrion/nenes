<template>
  <section
    class="flex items-center justify-center relative"
    ref="sectionRef"
  >
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1" />
    <div class="relative h-full w-full min-h-screen bg-white transition-all duration-300 ease-out place-content-center" :class="{ 'rounded-t-4xl': !isLoadingComplete }">
      <Logo class="absolute top-8 left-1/2 transform -translate-x-1/2" :color="isCoverFullyVisible ? 'var(--color-nenes-pink-light)' : 'var(--color-primary)'" />
      <div class="max-w-[42rem] w-full px-8 relative z-10 mx-auto flex flex-col items-center">
          <div class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative">
            <span
              class="inline-block transition-opacity duration-500 ease-out"
              :class="{ 'opacity-30': scrollProgress > 0.2 }"
            >
              Chaque année en France,
            </span>
            <span
              class="inline-block transition-opacity duration-500 ease-out"
              :class="{ 'opacity-30': scrollProgress > 0.5 }"
            >
              le cancer du sein touche
            </span>
            <span class="inline-block">
              plus de 60000 femmes.
            </span>
          </div>

          <div class="absolute hidden">
              <div
                v-for="(image, index) in images"
                :key="index"
                class="absolute w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 opacity-0 translate-y-12 scale-75 transition-all duration-700 ease-out"
                :class="{ 'opacity-100 translate-y-0 scale-100': isVisible }"
                :style="getImageStyle(index)"
              ></div>
            </div>
      </div>
    </div>
    <ScrollIndicator
          text="scroll"
          class="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary"
          />
  </section>
</template>

<script setup>
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";
import { useAnimationsStore } from "~/stores";
import Logo from "~/components/ui/Logo.vue";
import { onMounted, onUnmounted, computed, watch, ref } from "vue";

const { sectionRef, isVisible } = useSectionVisibility(0.3);

// Reset scroll progress when section becomes visible
watch(isVisible, (visible) => {
  if (visible) {
    resetScrollProgress();
  }
});
const store = useAnimationsStore();
const isLoadingComplete = ref(false);
const images = ref([...Array(8)]); // 8 floating images from the design
const isCoverFullyVisible = ref(false);
const scrollProgress = ref(0);

// Watch for loading completion from store
watch(
  () => store.sections.loading?.state,
  (newState) => {
    if (newState === "isComplete") {
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        isLoadingComplete.value = true;
        // Reset scroll progress when loading completes
        resetScrollProgress();
      }, 200);
    }
  },
  { immediate: true }
);

const getImageStyle = (index) => {
  const positions = [
    { x: "80%", y: "15%" },
    { x: "5%", y: "15%" },
    { x: "15%", y: "25%" },
    { x: "25%", y: "15%" },
    { x: "45%", y: "35%" },
    { x: "70%", y: "25%" },
    { x: "85%", y: "45%" },
    { x: "10%", y: "50%" },
  ];

  return {
    left: positions[index]?.x || "50%",
    top: positions[index]?.y || "50%",
    animationDelay: `${index * 0.2}s`,
  };
};

// Scroll intent tracking (tracks scroll attempts, not actual scroll position)
let accumulatedScrollDelta = 0;
const maxScrollDistance = 500; // Maximum scroll distance to reach 100% progress

const resetScrollProgress = () => {
  accumulatedScrollDelta = 0;
  scrollProgress.value = 0;
};

const updateScrollProgress = (event) => {
  if (event) {
    // Accumulate scroll delta (wheel events, touch events, etc.)
    const delta = Math.abs(event.deltaY || event.wheelDelta || 0);
    accumulatedScrollDelta += delta;

    // Convert accumulated scroll to progress (0-1) with smoothing
    const rawProgress = Math.min(1, accumulatedScrollDelta / maxScrollDistance);
    scrollProgress.value = Math.min(1, Math.max(0, rawProgress));
  }
};

let lenisInstance = null;

const lenis = useLenis((lenis) => {
  lenisInstance = lenis;
  // Note: We don't listen to Lenis scroll events anymore since we're tracking scroll intent
});

// Watch for loading completion and stop Lenis
watch(isLoadingComplete, (isComplete) => {
  if (isComplete && lenisInstance) {
    lenisInstance.stop();
  }
}, { immediate: true });

// Listen for scroll intent events (wheel, touch, etc.)
const handleScrollIntent = (event) => {
  updateScrollProgress(event);
};

onMounted(() => {
  // Listen for wheel events (mouse wheel, trackpad)
  window.addEventListener('wheel', handleScrollIntent, { passive: true });

  // Listen for touch events (mobile scrolling)
  window.addEventListener('touchmove', handleScrollIntent, { passive: true });

  // Listen for keyboard events (arrow keys, page up/down)
  window.addEventListener('keydown', (event) => {
    if (['ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End'].includes(event.key)) {
      // Simulate scroll delta for keyboard navigation
      updateScrollProgress({ deltaY: 100 });
    }
  });
});

onUnmounted(() => {
  window.removeEventListener('wheel', handleScrollIntent);
  window.removeEventListener('touchmove', handleScrollIntent);
  window.removeEventListener('keydown', handleScrollIntent);
});
</script>