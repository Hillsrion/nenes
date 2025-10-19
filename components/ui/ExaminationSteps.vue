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
      <source
        media="(max-width: 768px)"
        :src="currentStep?.mobileUrl || currentStep?.videoUrl || ''"
      />
      <source
        media="(min-width: 769px)"
        :src="currentStep?.desktopUrl || currentStep?.videoUrl || ''"
      />
    </video>

    <!-- Black overlay for video transitions -->
    <div
      ref="overlayRef"
      class="fixed top-0 left-0 w-full h-full bg-black pointer-events-none opacity-0 z-0"
    ></div>

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
const isTransitioning = ref(false);
const actualVideoUrl = ref("");

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

// Current step tracking
const currentStepIndex = ref(0);

// Current step data
const currentStep = computed(() => {
  return props.steps[currentStepIndex.value] || null;
});

// No need to split steps - single loop handles positioning

// Detect if we're on mobile/tablet (768px and below)
const isMobileOrTablet = ref(false);
let resizeHandler: (() => void) | null = null;

// Initialize mobile/tablet detection
onMounted(() => {
  const checkDevice = () => {
    isMobileOrTablet.value = window.innerWidth <= 768;
  };

  resizeHandler = checkDevice;
  checkDevice();
  window.addEventListener("resize", checkDevice);
});

// Cleanup
onUnmounted(() => {
  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
  }
});

// Current video URL based on current step and device type
const currentVideoUrl = computed(() => {
  const currentStep = props.steps[currentStepIndex.value];
  if (!currentStep) return "";

  // Check for responsive URLs first
  if (currentStep.mobileUrl || currentStep.desktopUrl) {
    return isMobileOrTablet.value
      ? currentStep.mobileUrl
      : currentStep.desktopUrl;
  }

  // Fall back to legacy videoUrl for backward compatibility
  return currentStep.videoUrl || "";
});

// Video transition function using GSAP timeline
const transitionToVideo = () => {
  if (!overlayRef.value || !videoRef.value) return;

  isTransitioning.value = true;

  const timeline = $gsap.timeline({
    onComplete: () => {
      isTransitioning.value = false;
    },
  });

  timeline
    .to(overlayRef.value, {
      opacity: 1,
      duration: 0.3,
      ease: "power2.inOut",
    })
    .call(() => {
      // Force video reload by changing currentTime to trigger source switch
      videoRef.value!.currentTime = 0;
    })
    .to(overlayRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
    });
};

// Watch for video URL changes and trigger transition
watch(currentVideoUrl, (newUrl, oldUrl) => {
  if (newUrl !== oldUrl && !isTransitioning.value) {
    transitionToVideo();
  }
});

// Initialize all animations with GSAP ScrollTrigger
const initializeAnimations = () => {
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
              },
              onEnterBack: () => {
                currentStepIndex.value = index;
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