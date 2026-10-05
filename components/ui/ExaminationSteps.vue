<template>
  <div ref="stepsContainerRef" class="relative w-full" :data-video-step="steps[currentStepIndex]?.id ?? currentStepIndex">
    <!-- Video and Post-It Stage -->
    <div
      ref="stageRef"
      class="relative w-full flex flex-col items-start opacity-0"
    >
      <!-- Landscape Video Container -->
      <div
        ref="videoContainerRef"
        class="relative w-full max-w-[520px] lg:max-w-[580px] aspect-video rounded-2xl sm:rounded-3xl overflow-hidden shadow-[0_18px_40px_rgba(36,66,219,0.12)] border border-black/[0.06] bg-[#f0f2f6]"
      >
        <video
          ref="videoRef"
          :src="actualVideoUrl || undefined"
          class="w-full h-full object-cover"
          autoplay
          muted
          loop
          preload="auto"
          playsinline
        >
          <!-- iOS sources -->
          <template v-if="isIOSDevice">
            <source
              :src="getCurrentStepVideoSource('mp4', 'mobile')"
              type="video/mp4"
              media="(max-width: 768px)"
            />
            <source
              :src="getCurrentStepVideoSource('mp4', 'desktop')"
              type="video/mp4"
              media="(min-width: 769px)"
            />
          </template>

          <!-- Non-iOS sources -->
          <template v-else>
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
            <source
              :src="getCurrentStepVideoSource('webm', 'desktop')"
              type="video/webm"
              media="(min-width: 769px)"
            />
            <source
              :src="getCurrentStepVideoSource('mp4', 'desktop')"
              type="video/mp4"
              media="(min-width: 769px)"
            />
          </template>

          <!-- Default fallback -->
          <source :src="actualVideoUrl" type="video/mp4" />
        </video>

        <!-- Video transition overlay -->
        <div
          ref="overlayRef"
          class="absolute inset-0 bg-black pointer-events-none opacity-0"
        />

        <!-- Loading spinner -->
        <div
          v-if="videoLoading"
          class="absolute inset-0 flex items-center justify-center bg-black/20 backdrop-blur-[2px] pointer-events-none"
        >
          <div
            class="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"
          />
        </div>
      </div>

      <!-- Post-It Cards Deck (Overlapping bottom-left of video) -->
      <div
        class="examination-cards relative -mt-16 sm:-mt-22 lg:-mt-26 -ml-2 sm:-ml-6 lg:-ml-10 w-full max-w-[390px] sm:max-w-[450px] lg:max-w-[480px] min-h-[300px] sm:min-h-[340px] lg:min-h-[370px] pointer-events-auto"
      >
        <div
          v-for="(step, index) in steps"
          :key="`card-${index}`"
          :ref="(el) => setCardRef(el, index)"
          class="examination-card absolute top-0 left-0 w-full"
          :class="{ 'is-active': index === currentStepIndex }"
          :aria-hidden="index !== currentStepIndex"
          :style="{ zIndex: 10 + index }"
        >
          <ExaminationPostIt
            :active="index === currentStepIndex"
            :step-number="index + 1"
            :content="step.content"
            :color-scheme="getCardColorScheme(index)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useAnimationsStore } from "~/stores";
import { useVideos } from "~/composables/useVideos";
import { useExaminationVideoSources } from "~/composables/examination/useExaminationVideoSources";
import { useExaminationCardSequence } from "~/composables/examination/useExaminationCardSequence";
import ExaminationPostIt from "./ExaminationPostIt.vue";

declare const useNuxtApp: () => { $gsap: any };

interface Step {
  id?: string;
  content: string;
  videoUrl?: string;
  mobileUrl?: string;
  desktopUrl?: string;
}

interface Props {
  steps: Step[];
  parentSection?: HTMLElement;
}

const props = defineProps<Props>();
const emit = defineEmits<{ (event: "step-change", index: number): void }>();

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();

// Refs
const stepsContainerRef = ref<HTMLElement | null>(null);
const stageRef = ref<HTMLElement | null>(null);
const videoContainerRef = ref<HTMLElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const overlayRef = ref<HTMLDivElement | null>(null);
const cardRefs = ref<(HTMLElement | null)[]>([]);

const currentStepIndex = ref(0);
watch(currentStepIndex, index => emit("step-change", index), { immediate: true });
const fallbackVideoUrl = ref("");
const isIOSDevice = ref(false);

const setCardRef = (el: any, index: number) => {
  if (el) cardRefs.value[index] = el;
};

// Video sources setup
const { getVideoSourceFor, getCurrentStepVideoSource } =
  useExaminationVideoSources({
    currentStepIndex,
    fallbackVideoUrl,
  });

let settleVideoOverlayTween: (() => void) | null = null;

const handleVideoTransition = (
  phase: "cover" | "reveal"
): Promise<void> => {
  const overlay = overlayRef.value;
  if (!overlay) return Promise.resolve();

  settleVideoOverlayTween?.();
  $gsap.killTweensOf(overlay);

  return new Promise((resolve) => {
    let settled = false;
    const settle = () => {
      if (settled) return;
      settled = true;
      if (settleVideoOverlayTween === settle) {
        settleVideoOverlayTween = null;
      }
      resolve();
    };

    settleVideoOverlayTween = settle;
    $gsap.to(overlay, {
      opacity: phase === "cover" ? 1 : 0,
      duration: 0.3,
      ease: "power2.inOut",
      onComplete: settle,
      onInterrupt: settle,
    });
  });
};

const { videoLoading, actualVideoUrl } = useVideos({
  steps: props.steps,
  currentStepIndex,
  videoRef,
  overlayRef,
  transitionCallback: handleVideoTransition,
  getVideoSource: (stepIndex, format, resolution) =>
    getVideoSourceFor(stepIndex, format, resolution),
});

// Color scheme rotation for post-it notes
const getCardColorScheme = (
  index: number
): "white" | "grey" | "rose" | "cream" | "blush" => {
  const schemes: ("white" | "grey" | "rose" | "cream" | "blush")[] = [
    "white",
    "grey",
    "rose",
    "cream",
    "blush",
  ];
  return schemes[index % schemes.length];
};

const { initializeAnimations, cleanup } = useExaminationCardSequence({
  $gsap, stepsContainerRef, stageRef, cardRefs, currentStepIndex,
  getParentSection: () => props.parentSection,
  getStepsCount: () => props.steps.length,
});

// Device check on mount
onMounted(() => {
  isIOSDevice.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (store.getSectionState("loading") === "isComplete") {
    nextTick(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          initializeAnimations();
        });
      }, 100);
    });
  }
});

// Watch loading state to initialize animations
watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete") {
      nextTick(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            initializeAnimations();
          });
        }, 80);
      });
    }
  },
  { immediate: true }
);

// Watch for video URL updates
watch(actualVideoUrl, (newUrl) => {
  fallbackVideoUrl.value = newUrl || "";
  if (newUrl && videoRef.value) {
    videoRef.value.load();
  }
}, { flush: "post" });

onUnmounted(() => {
  settleVideoOverlayTween?.();
  if (overlayRef.value) $gsap.killTweensOf(overlayRef.value);
  cleanup();
});
</script>
