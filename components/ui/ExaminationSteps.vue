<template>
  <div ref="stepsContainerRef" class="relative w-full">
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
              :src="getCurrentStepVideoSource('webm', '1440p')"
              type="video/webm"
              media="(min-width: 1920px)"
            />
            <source
              :src="getCurrentStepVideoSource('webm', '1080p')"
              type="video/webm"
              media="(min-width: 769px)"
            />
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

        <!-- Video transition overlay -->
        <div
          ref="overlayRef"
          class="absolute inset-0 bg-black/40 pointer-events-none opacity-0 transition-opacity duration-300"
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
        class="relative -mt-16 sm:-mt-22 lg:-mt-26 -ml-2 sm:-ml-6 lg:-ml-10 w-full max-w-[390px] sm:max-w-[450px] lg:max-w-[480px] min-h-[300px] sm:min-h-[340px] lg:min-h-[370px] pointer-events-auto"
      >
        <div
          v-for="(step, index) in steps"
          :key="`card-${index}`"
          :ref="(el) => setCardRef(el, index)"
          class="absolute top-0 left-0 w-full"
          :style="{ zIndex: 10 + index }"
        >
          <ExaminationPostIt
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
import ExaminationPostIt from "./ExaminationPostIt.vue";

declare const useNuxtApp: () => { $gsap: any };

interface Step {
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

const handleVideoTransition = (url: string) => {
  if (!overlayRef.value) return;
  const tl = $gsap.timeline();
  tl.to(overlayRef.value, {
    opacity: 1,
    duration: 0.25,
    ease: "power2.inOut",
  })
    .to({}, { duration: 0.15 })
    .to(overlayRef.value, {
      opacity: 0,
      duration: 0.25,
      ease: "power2.inOut",
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

// Resting offsets for stacking cards organically
const restingOffsets = [
  { x: 0, y: 0, rotate: -1.2 },
  { x: -16, y: 18, rotate: 1.8 },
  { x: 12, y: 36, rotate: -1.5 },
  { x: -10, y: 54, rotate: 1.4 },
  { x: 14, y: 72, rotate: -0.9 },
];

let scrollTimeline: any = null;

const initializeAnimations = () => {
  const trigger = props.parentSection || stepsContainerRef.value;
  if (!trigger || !stageRef.value) return;

  scrollTimeline?.scrollTrigger?.kill();
  scrollTimeline?.kill();

  const totalSteps = props.steps.length;

  // Set initial state for Card 0 (resting at base offset)
  if (cardRefs.value[0]) {
    const o0 = restingOffsets[0];
    $gsap.set(cardRefs.value[0], {
      opacity: 1,
      x: o0.x,
      y: o0.y,
      rotation: o0.rotate,
      scale: 1,
    });
  }

  // Set initial state for subsequent cards (hidden below)
  for (let i = 1; i < totalSteps; i++) {
    const card = cardRefs.value[i];
    if (card) {
      const o = restingOffsets[i % restingOffsets.length];
      $gsap.set(card, {
        opacity: 0,
        x: o.x,
        y: o.y + 45,
        rotation: o.rotate + 2.5,
        scale: 0.95,
      });
    }
  }

  // Set initial stage state
  $gsap.set(stageRef.value, { opacity: 0, y: 30 });

  // Main scroll-scrubbed timeline calibrated for lengthened scroll
  const tl = $gsap.timeline({
    scrollTrigger: {
      trigger,
      start: "top top",
      end: "bottom bottom",
      scrub: 0.8,
      onUpdate: (self: any) => {
        const progress = self.progress;

        if (totalSteps <= 1) {
          currentStepIndex.value = 0;
          return;
        }

        // 0 to 0.20 is Step 0 (during paragraph reveal & stage entrance)
        if (progress < 0.20) {
          if (currentStepIndex.value !== 0) currentStepIndex.value = 0;
          return;
        }

        // Remaining steps 1..totalSteps-1 distributed over 0.20 to 0.90
        const stepSpan = 0.70 / (totalSteps - 1);
        const stepIdx = Math.min(
          totalSteps - 1,
          1 + Math.floor((progress - 0.20) / stepSpan)
        );

        if (currentStepIndex.value !== stepIdx) {
          currentStepIndex.value = stepIdx;
        }
      },
    },
  });

  // 1. Entrance of the stage (video + base card 0)
  tl.to(
    stageRef.value,
    {
      opacity: 1,
      y: 0,
      duration: 0.12,
      ease: "power2.out",
    },
    0.08
  );

  // 2. Sequential stacking animations for cards 1..N-1
  if (totalSteps > 1) {
    const stepDuration = 0.70 / (totalSteps - 1);

    for (let i = 1; i < totalSteps; i++) {
      const card = cardRefs.value[i];
      if (!card) continue;

      const o = restingOffsets[i % restingOffsets.length];
      const startTime = 0.20 + (i - 1) * stepDuration;

      tl.to(
        card,
        {
          opacity: 1,
          x: o.x,
          y: o.y,
          rotation: o.rotate,
          scale: 1,
          duration: stepDuration * 0.65,
          ease: "power2.out",
        },
        startTime
      );
    }
  }

  // Hold briefly at end
  tl.to({}, { duration: 0.08 });

  scrollTimeline = tl;
};

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
});

onUnmounted(() => {
  scrollTimeline?.scrollTrigger?.kill();
  scrollTimeline?.kill();
  scrollTimeline = null;
});
</script>
