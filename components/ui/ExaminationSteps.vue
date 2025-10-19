<template>
  <div
    ref="containerRef"
    class="relative mt-[250svh] pt-[300svh] container mx-auto"
  >
    <!-- Fixed video at center of viewport -->
    <video
      ref="videoRef"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover scale-0 origin-center"
      autoplay
      muted
      loop
      playsinline
    >
      <source media="(max-width: 768px)" :src="actualVideoUrl || ''" />
      <source media="(min-width: 769px)" :src="actualVideoUrl || ''" />
    </video>

    <!-- Black overlay for video transitions -->
    <div
      ref="overlayRef"
      class="fixed top-0 left-0 w-full h-full bg-black pointer-events-none opacity-0 z-0"
    ></div>

    <!-- Video loading indicator -->
    <div
      v-if="videoLoading"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 flex items-center justify-center"
    >
      <div
        class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
      ></div>
    </div>

    <!-- Examination Cards in normal document flow -->
    <div
      v-for="(step, index) in steps"
      :key="`card-${index}`"
      class="min-h-screen flex items-center py-16 relative z-1"
      :class="[index % 2 === 0 ? 'justify-start' : 'justify-end']"
      ref="cardRefs"
    >
      <ExaminationCard
        :step-number="`${index + 1}`"
        :description="step.content"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useAnimationsStore } from "../../stores";
import { useVideos } from "~/composables/useVideos";
import ExaminationCard from "~/components/ui/ExaminationCard.vue";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

interface Step {
  content: string;
  videoUrl?: string; // For backward compatibility
  mobileUrl?: string;
  desktopUrl?: string;
}

interface Props {
  steps: Step[];
  parentSection?: HTMLElement;
}

const props = defineProps<Props>();

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();

// GSAP with ScrollTrigger is registered globally in the app

// Refs
const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const cardRefs = ref<(HTMLElement | null)[]>([]);
const overlayRef = ref<HTMLDivElement | null>(null);

// Current step tracking
const currentStepIndex = ref(0);

// Current step data
const currentStep = computed(() => {
  return props.steps[currentStepIndex.value] || null;
});

// Use the videos composable
const {
  loadedVideos,
  videoLoading,
  actualVideoUrl,
  isTransitioning,
  isMobileOrTablet,
  loadVideo,
  preloadUpcomingVideos,
  transitionToVideo,
  currentVideoUrl,
} = useVideos({
  steps: props.steps,
  currentStepIndex: currentStepIndex,
  videoRef,
  overlayRef,
});

// Computed trigger element (parent section or current section)
const triggerElement = computed(() => {
  // If parentSection prop is provided, use it
  if (props.parentSection) {
    return props.parentSection;
  }

  // Otherwise, try to find parent with bg-secondary-light class
  if (containerRef.value) {
    let parent = containerRef.value.parentElement;
    while (parent && !parent.classList.contains("bg-secondary-light")) {
      parent = parent.parentElement;
    }
    if (parent) {
      return parent;
    }
  }

  // Fallback to current section
  return containerRef.value;
});

// Initialize all animations with GSAP ScrollTrigger
const initializeAnimations = async () => {
  if (!containerRef.value || !videoRef.value) return;

  // Set initial video state
  $gsap.set(videoRef.value, { scale: 0 });

  // Initialize the first step
  currentStepIndex.value = 0;

  // Video entrance animation using GSAP with ScrollTrigger
  $gsap.fromTo(
    videoRef.value,
    { scale: 0 },
    {
      scale: 1,
      duration: 0.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: triggerElement.value,
        start: "center 10%",
        end: "60% 70%",
        scrub: 1,
      },
    }
  );

  // Video URL switching using GSAP with ScrollTrigger
  nextTick(() => {
    props.steps.forEach((_, index) => {
      const cardElement = cardRefs.value[index];
      if (cardElement) {
        $gsap.fromTo(
          {},
          {},
          {
            scrollTrigger: {
              trigger: cardElement,
              start: "top 50%",
              end: "bottom 50%",
              onEnter: () => {
                currentStepIndex.value = index;
                // Preload videos around this step for better performance
                setTimeout(() => {
                  preloadUpcomingVideos();
                }, 100);
              },
              onEnterBack: () => {
                currentStepIndex.value = index;
                // Preload videos around this step for better performance
                setTimeout(() => {
                  preloadUpcomingVideos();
                }, 100);
              },
            },
          }
        );
      }
    });
  });
};

// Watch for loading completion to start animations
watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      containerRef.value &&
      containerRef.value.parentElement
    ) {
      setTimeout(() => {
        initializeAnimations();
      }, 1000);
    }
  }
);

// Cleanup
onUnmounted(() => {
  // Kill all GSAP animations and ScrollTriggers
  $gsap.killTweensOf([videoRef.value, overlayRef.value, ...cardRefs.value]);
});
</script>