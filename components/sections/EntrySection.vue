<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Entry Cover Image -->
    <picture>
      <!-- Portrait image for mobile devices (768px and below) -->
      <source
        media="(max-width: 768px)"
        srcset="/images/entry-cover-portrait.jpg"
      />
      <!-- Landscape image for desktop devices (769px and above) -->
      <img
        ref="entryCoverRef"
        src="/images/entry-cover.jpg"
        alt="Entry Cover"
        class="fixed z-5 pointer-events-none"
        :style="{
          width: '100vw',
          height: '100vh',
          transformOrigin: 'center center',
          objectFit: 'cover',
          willChange: 'transform',
          top: 0,
          left: 0,
        }"
      />
    </picture>

    <!-- Statistics Section -->
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1"></div>
    <div
      class="relative h-[300svh] w-full min-h-screen bg-white transition-all duration-300 ease-out rounded-t-4xl overflow-x-clip"
      ref="whiteSectionRef"
      :class="{
        'rounded-t-4xl':
          animationsStore?.sections?.loading?.state === 'isComplete',
      }"
    >
      <div
        class="max-w-[42rem] h-[100svh] w-full px-8 sticky top-0 z-10 mx-auto flex flex-col justify-center"
      >
        <div
          ref="statisticsTextRef"
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative w-full break-words"
        >
          <template v-for="(line, index) in statisticsText" :key="index">
            <span class="inline-block">
              <template v-if="index === statisticsText.length - 1">
                <!-- Split last line: first word goes left, rest goes right -->
                <span class="inline-block animate-split-word-left mr-3 lg:mr-4">
                  {{ textUtils.getFirstWord(line) }}
                </span>
                <span class="inline-block animate-split-word-right">
                  {{ textUtils.getRemainingWords(line) }}
                </span>
              </template>
              <template v-else>
                {{ line }}
              </template>
            </span>
          </template>
        </div>
      </div>

      <div class="container w-full mx-auto px-8 relative z-100">
        <div
          class="max-w-[70rem] mx-auto mt-24 grid grid-cols-3 gap-y-[60vh] auto-rows-auto"
        >
          <div
            v-for="(element, index) in contentElements"
            :key="index"
            :ref="
              (el) => {
                if (el) textRefs[index] = el;
              }
            "
            :class="[
              index % 2 === 0
                ? 'col-span-2'
                : 'col-start-2 col-span-2 row-start-2 pr-4',
            ]"
          >
            <p
              class="text-secondary font-medium lg:text-5xl text-3xl leading-title"
            >
              {{ element.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Serif Scroll Indicator -->
    <div
      class="fixed bottom-8 left-1/2 -translate-x-1/2 z-20 font-serif text-serif-size text-primary transition-opacity duration-500"
      :class="{
        'opacity-0 pointer-events-none': animationsStore.cover.isScaling,
      }"
    >
      scroll
    </div>
  </section>
</template>

<script setup>
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useTextUtils } from "~/composables/useTextUtils";
import { useStatisticsAnimation } from "~/composables/useStatisticsAnimation";
import { useEntryCoverAnimation } from "~/composables/useEntryCoverAnimation";
import { useContentElementsAnimation } from "~/composables/useContentElementsAnimation";
import { useAnimationsStore } from "~/stores";

// Use global GSAP instance (should be available through Nuxt GSAP module)
const { $gsap } = useNuxtApp();

// Animations store
const animationsStore = useAnimationsStore();

// Props
const props = defineProps({
  statisticsText: {
    type: Array,
    default: () => [],
  },
  contentElements: {
    type: Array,
    default: () => [],
  },
});

// Refs
const sectionRef = ref(null);
const whiteSectionRef = ref(null);
const statisticsTextRef = ref(null);
const entryCoverRef = ref(null);
const textRefs = ref([]);

// Text utility functions
const textUtils = useTextUtils();

// Animation composables
const {
  firstTwoLinesFaded,
  lastLineCentered,
  initializeAnimations: initializeStatisticsAnimations,
  getTimeline,
} = useStatisticsAnimation({
  sectionRef,
  statisticsTextRef,
  statisticsText: props.statisticsText,
});

const {
  isCoverFullyVisible,
  initializeAnimation: initializeEntryCoverAnimation,
} = useEntryCoverAnimation({
  sectionRef,
  entryCoverRef,
  statisticsTextRef,
  getTimeline,
});

const { initializeAnimation: initializeContentElementsAnimation } =
  useContentElementsAnimation({
    textRefs,
    sectionRef,
    getTimeline,
  });

// Track if animations have been initialized
let animationsInitialized = false;

// Set initial state for cover image - must be scale 0 and hidden
onMounted(() => {
  if (entryCoverRef.value) {
    const { $gsap } = useNuxtApp();
    $gsap.set(entryCoverRef.value, {
      scale: 0,
      opacity: 0,
    });
  }
});

// Wait for loading to complete before initializing any animations
watch(
  () => animationsStore?.sections?.loading?.state,
  (loadingState) => {
    if (loadingState === "isComplete" && !animationsInitialized) {
      // Initialize statistics animations first (creates the timeline)
      if (sectionRef.value && props.statisticsText.length > 0) {
        initializeStatisticsAnimations();

        // Then add animations to the same timeline
        // Use nextTick to ensure the timeline is fully created
        nextTick(() => {
          initializeEntryCoverAnimation();
          initializeContentElementsAnimation();
        });
      }

      animationsInitialized = true;
    }
  },
  { immediate: true }
);

// Note: All animation logic has been moved to composables for better organization

// Cleanup on unmount
onUnmounted(() => {
  // Kill all ScrollTriggers to prevent memory leaks
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
});
</script>
