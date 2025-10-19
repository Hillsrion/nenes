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
const loadedVideos = ref<Set<string>>(new Set());
const videoLoading = ref(false);

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

// Video loading methods
const loadVideo = async (url: string): Promise<void> => {
  if (!url || loadedVideos.value.has(url)) return;

  return new Promise((resolve) => {
    const video = document.createElement("video");
    video.preload = "metadata";

    const onLoadedData = () => {
      loadedVideos.value.add(url);
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      resolve();
    };

    const onError = () => {
      video.removeEventListener("loadeddata", onLoadedData);
      video.removeEventListener("error", onError);
      console.warn(`Failed to preload video: ${url}`);
      resolve();
    };

    video.addEventListener("loadeddata", onLoadedData);
    video.addEventListener("error", onError);

    // Set the appropriate source based on device type
    if (url.includes("mobile") || url.includes("desktop")) {
      video.src = url;
    } else {
      // For legacy video URLs, we need to set the source attribute directly
      video.src = url;
    }
  });
};

const preloadUpcomingVideos = async () => {
  const currentIndex = currentStepIndex.value;
  const upcomingIndices = [
    currentIndex + 1,
    currentIndex + 2,
    Math.max(0, currentIndex - 1),
  ].filter(
    (index) =>
      index >= 0 && index < props.steps.length && index !== currentIndex
  );

  const preloadPromises = upcomingIndices.map((index) => {
    const step = props.steps[index];
    if (!step) return Promise.resolve();

    const url = isMobileOrTablet.value
      ? step.mobileUrl || step.desktopUrl || step.videoUrl
      : step.desktopUrl || step.videoUrl;

    return url ? loadVideo(url) : Promise.resolve();
  });

  await Promise.allSettled(preloadPromises);
};

// Video transition function using GSAP timeline
const transitionToVideo = async () => {
  if (!overlayRef.value || !videoRef.value || !currentVideoUrl.value) return;

  const videoUrl = currentVideoUrl.value;

  // Load the video if not already loaded
  if (!loadedVideos.value.has(videoUrl)) {
    videoLoading.value = true;
    await loadVideo(videoUrl);
    videoLoading.value = false;
  }

  // Update the actual video URL for the transition
  actualVideoUrl.value = videoUrl;

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
      if (videoRef.value) {
        videoRef.value.currentTime = 0;
      }
    })
    .to(overlayRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
    });

  // Preload upcoming videos after the current transition
  setTimeout(() => {
    preloadUpcomingVideos();
  }, 500);
};

// Watch for video URL changes and trigger transition
watch(currentVideoUrl, (newUrl, oldUrl) => {
  if (newUrl !== oldUrl && !isTransitioning.value) {
    transitionToVideo();
  }
});

// Initialize all animations with GSAP ScrollTrigger
const initializeAnimations = async () => {
  if (!containerRef.value || !videoRef.value) return;

  // Set initial video state
  $gsap.set(videoRef.value, { scale: 0 });

  // Initialize the first step
  currentStepIndex.value = 0;

  // Preload the first video immediately
  const firstStep = props.steps[0];
  if (firstStep) {
    const firstVideoUrl = isMobileOrTablet.value
      ? firstStep.mobileUrl || firstStep.desktopUrl || firstStep.videoUrl
      : firstStep.desktopUrl || firstStep.videoUrl;

    if (firstVideoUrl) {
      await loadVideo(firstVideoUrl);
      actualVideoUrl.value = firstVideoUrl;
    }
  }

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
              onEnter: async () => {
                currentStepIndex.value = index;
                // Preload videos around this step for better performance
                setTimeout(() => {
                  preloadUpcomingVideos();
                }, 100);
              },
              onEnterBack: async () => {
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

  // Reset state
  loadedVideos.value.clear();
  videoLoading.value = false;
  actualVideoUrl.value = "";
});
</script>