<template>
  <div
    ref="containerRef"
    class="relative mt-[250svh] pt-[300svh] container mx-auto"
  >
    <!-- Fixed video at center of viewport with multiple sources -->
    <video
      ref="videoRef"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-[100lvh] object-cover scale-0 origin-center"
      autoplay
      muted
      loop
      preload="auto"
      playsinline
    >
      <!-- iOS: MP4 first (native hardware acceleration) -->
      <template v-if="isIOSDevice">
        <!-- Mobile MP4 for iOS -->
        <source
          :src="getCurrentStepVideoSource('mp4', 'mobile')"
          type="video/mp4"
          media="(max-width: 768px)"
        />
        <!-- Desktop MP4 sources for iOS -->
        <source
          :src="getCurrentStepVideoSource('mp4', '1440p')"
          type="video/mp4"
          media="(min-width: 1920px)"
        />
        <source
          :src="getCurrentStepVideoSource('mp4', '1080p')"
          type="video/mp4"
          media="(min-width: 769px)"
        />
      </template>

      <!-- Non-iOS: WebM first (better compression), MP4 fallback -->
      <template v-else>
        <!-- Mobile WebM sources -->
        <source
          :src="getCurrentStepVideoSource('webm', 'mobile')"
          type="video/webm"
          media="(max-width: 768px)"
        />
        <source
          :src="getCurrentStepVideoSource('mp4', 'mobile')"
          type="video/mp4"
          media="(max-width: 768px)"
        />

        <!-- Desktop WebM sources -->
        <source
          :src="getCurrentStepVideoSource('webm', '1440p')"
          type="video/webm"
          media="(min-width: 1920px)"
        />
        <source
          :src="getCurrentStepVideoSource('webm', '1080p')"
          type="video/webm"
          media="(min-width: 769px)"
        />

        <!-- Desktop MP4 fallback -->
        <source
          :src="getCurrentStepVideoSource('mp4', '1440p')"
          type="video/mp4"
          media="(min-width: 1920px)"
        />
        <source
          :src="getCurrentStepVideoSource('mp4', '1080p')"
          type="video/mp4"
          media="(min-width: 769px)"
        />
      </template>

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
import { useVideos } from "../../composables/useVideos";
import { useExaminationVideoSources } from "~/composables/examination/useExaminationVideoSources";
import { useExaminationScrollTriggers } from "~/composables/examination/useExaminationScrollTriggers";
import ExaminationCard from "./ExaminationCard.vue";
// GSAP with ScrollTrigger is registered globally in the app

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

// Refs
const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const cardRefs = ref<(HTMLElement | null)[]>([]);
const overlayRef = ref<HTMLDivElement | null>(null);

const currentStepIndex = ref(0);
const stepsCount = computed(() => props.steps.length);
const fallbackVideoUrl = ref("");

const { getVideoSourceFor, getCurrentStepVideoSource } =
  useExaminationVideoSources({
    currentStepIndex,
    fallbackVideoUrl,
  });

// Transition callback to handle fade effect with overlay
const handleVideoTransition = (url: string) => {
  if (!overlayRef.value) return;

  // Create GSAP timeline for smooth fade transition
  const tl = $gsap.timeline();

  // Fade in overlay (to black)
  tl.to(overlayRef.value, {
    opacity: 1,
    duration: 0.3,
    ease: "power2.inOut",
  })
    // Keep black for a moment while video switches
    .to({}, { duration: 0.2 })
    // Fade out overlay (reveal new video)
    .to(overlayRef.value, {
      opacity: 0,
      duration: 0.3,
      ease: "power2.inOut",
    });
};

// Use the videos composable
const {
  videoLoading,
  actualVideoUrl,
} = useVideos({
  steps: props.steps,
  currentStepIndex: currentStepIndex,
  videoRef,
  overlayRef,
  transitionCallback: handleVideoTransition,
  getVideoSource: (stepIndex, format, resolution) =>
    getVideoSourceFor(stepIndex, format, resolution),
});

const { initializeStepScrollTriggers, cleanupStepScrollTriggers } =
  useExaminationScrollTriggers({
    $gsap,
    cardRefs,
    stepsCount,
    currentStepIndex,
  });

// iOS device detection for conditional source ordering
const isIOSDevice = ref(false);
onMounted(() => {
  isIOSDevice.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
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
      onUpdate: function () {
        const shouldShow = this.progress() < 0.55;
        if (store.getLogoState !== shouldShow) {
          store.updateLogoColor(shouldShow);
        }
      },
      scrollTrigger: {
        trigger: triggerElement.value,
        start: "center 10%",
        end: "60% 70%",
        scrub: 1,
      },
    }
  );

  initializeStepScrollTriggers();
};

// Watch for video URL changes and reload video
watch(actualVideoUrl, (newUrl) => {
  fallbackVideoUrl.value = newUrl || "";
  if (newUrl && videoRef.value) {
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
      nextTick(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              initializeAnimations();
              // ScrollTrigger.refresh(); // This line was removed as per the edit hint
            });
          });
        }, 50);
      });
    }
  }
);

// Cleanup
onUnmounted(() => {
  // Kill all GSAP animations and ScrollTriggers
  cleanupStepScrollTriggers();
  $gsap.killTweensOf([videoRef.value, overlayRef.value, ...cardRefs.value]);
});
</script>
