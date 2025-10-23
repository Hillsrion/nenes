<template>
  <div
    ref="containerRef"
    class="relative mt-[250svh] pt-[300svh] container mx-auto"
  >
    <!-- Fixed video at center of viewport with multiple sources -->
    <video
      ref="videoRef"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover scale-0 origin-center"
      autoplay
      muted
      loop
      playsinline
    >
      <!-- Mobile WebM sources (better compression, modern browsers) -->
      <source
        :src="getVideoSource('webm', 'mobile')"
        type="video/webm"
        media="(max-width: 768px)"
      />

      <!-- Mobile MP4 fallback -->
      <source
        :src="getVideoSource('mp4', 'mobile')"
        type="video/mp4"
        media="(max-width: 768px)"
      />

      <!-- Desktop WebM sources (better compression, modern browsers) -->
      <source
        :src="getVideoSource('webm', '1440p')"
        type="video/webm"
        media="(min-width: 1920px)"
      />
      <source
        :src="getVideoSource('webm', '1080p')"
        type="video/webm"
        media="(min-width: 1280px)"
      />

      <!-- Desktop MP4 sources (fallback, wider compatibility) -->
      <source
        :src="getVideoSource('mp4', '1440p')"
        type="video/mp4"
        media="(min-width: 1920px)"
      />
      <source
        :src="getVideoSource('mp4', '1080p')"
        type="video/mp4"
        media="(min-width: 1280px)"
      />

      <!-- Default fallback -->
      <source :src="actualVideoUrl" type="video/mp4" />
    </video>

    <!-- Black overlay for video transitions -->
    <div
      ref="overlayRef"
      class="fixed top-0 left-0 w-full h-full bg-black pointer-events-none opacity-0"
    ></div>

    <!-- Video loading indicator -->
    <div
      v-if="videoLoading"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
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
import { useContent } from "~/composables/useContent";
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
const { r2Config } = useContent();

// GSAP with ScrollTrigger is registered globally in the app

// Configuration: Track which steps have optimized videos on R2 (from centralized config)
// Add step indices here as you upload more folders to R2
// Example: [0, 1, 2, 3, 4] for all steps
const stepsWithOptimizedVideos = r2Config.stepsWithOptimizedVideos;

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

// Helper function to get video source URL based on format and resolution
const getVideoSource = (
  format: "mp4" | "webm",
  resolution: "1080p" | "1440p" | "mobile"
) => {
  // Format step number with leading zero (01, 02, 03, etc.)
  const stepNumber = String(currentStepIndex.value + 1).padStart(2, "0");
  const stepFolder = `step-${stepNumber}`;

  // Check if current step has optimized videos
  const hasOptimizedVideos = stepsWithOptimizedVideos.includes(
    currentStepIndex.value
  );

  if (hasOptimizedVideos) {
    // Use optimized video from R2 bucket
    // R2 URL: https://pub-xxxxx.r2.dev/step-0X/step-0X-{resolution}.{format}
    // For mobile: https://pub-xxxxx.r2.dev/step-0X/step-0X-mobile.{format}
    const r2PublicUrl = r2Config.baseUrl;

    if (resolution === "mobile") {
      return `${r2PublicUrl}/${stepFolder}/${stepFolder}-mobile.${format}`;
    }

    return `${r2PublicUrl}/${stepFolder}/${stepFolder}-${resolution}.${format}`;
  }

  // Fallback to original URL for steps without optimized videos
  return actualVideoUrl.value || "";
};

// Transition callback to handle fade effect with overlay
const handleVideoTransition = (url: string) => {
  if (!overlayRef.value) return;

  console.log("🎬 Handling fade transition for:", url);

  // Create GSAP timeline for smooth fade transition
  const tl = $gsap.timeline();

  // Fade in overlay (to black)
  tl.to(overlayRef.value, {
    opacity: 1,
    duration: 0.3,
    ease: "power2.inOut",
  })
    // Keep black for a moment while video switches
    .to({}, { duration: 0.1 })
    // Fade out overlay (reveal new video)
    .to(overlayRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
    });
};

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
  transitionCallback: handleVideoTransition,
  getVideoSource: (format, resolution) => getVideoSource(format, resolution),
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
                console.log(`🎯 ScrollTrigger onEnter - Step ${index + 1}`);
                currentStepIndex.value = index;
                // Preload videos around this step for better performance
                setTimeout(() => {
                  preloadUpcomingVideos();
                }, 100);
              },
              onEnterBack: () => {
                console.log(`🔙 ScrollTrigger onEnterBack - Step ${index + 1}`);
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

// Watch for current step index changes
watch(currentStepIndex, (newIndex, oldIndex) => {
  console.log(`📊 currentStepIndex changed from ${oldIndex} to ${newIndex}`);
  console.log(`🎥 Current step:`, props.steps[newIndex]);
});

// Watch for video URL changes and reload video
watch(actualVideoUrl, (newUrl) => {
  console.log("📹 Video URL changed to:", newUrl);
  if (newUrl && videoRef.value) {
    console.log("🔄 Reloading video element");
    videoRef.value.load();
  }
});

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