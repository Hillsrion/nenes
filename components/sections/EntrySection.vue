<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Entry Cover Image -->
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

    <!-- Statistics Section -->
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1"></div>
    <div
      class="relative h-[300svh] w-full min-h-screen bg-white transition-all duration-300 ease-out rounded-t-4xl"
      ref="whiteSectionRef"
      :class="{ 'rounded-t-4xl': !isLoadingComplete }"
    >
      <Logo
        class="fixed top-8 left-1/2 transform -translate-x-1/2"
        :color="
          isCoverFullyVisible
            ? 'var(--color-nenes-pink-light)'
            : 'var(--color-primary)'
        "
      />

      <div
        class="max-w-[42rem] h-[100svh] w-full px-8 sticky top-0 left-1/2 transform -translate-x-1/2 z-10 mx-auto flex flex-col justify-center"
      >
        <div
          ref="statisticsTextRef"
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative"
        >
          <template v-for="(line, index) in statisticsText" :key="index">
            <span class="inline-block">
              <template v-if="index === statisticsText.length - 1">
                <!-- Split last line: first word goes left, rest goes right -->
                <span class="inline-block animate-split-word-left mr-2.75">
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

      <div class="container w-full mx-auto px-8 relative z-100 mt-[55svh]">
        <div
          class="max-w-[70rem] mx-auto mt-24 grid grid-cols-3 gap-y-96 auto-rows-auto"
        >
          <div
            v-for="(element, index) in contentElements"
            :key="index"
            :ref="(el) => setTextRef(el, index)"
            :class="[
              index % 2 === 0
                ? 'col-span-1'
                : 'col-start-2 col-span-2 row-start-2 pr-4',
            ]"
          >
            <p
              class="text-nenes-pink-light font-medium text-5xl leading-[1.33]"
            >
              {{ element.content }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <ScrollIndicator
      class="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary"
    />
  </section>
</template>

<script setup>
import { ScrollTrigger } from "gsap/ScrollTrigger";
import SplitType from "split-type";
import { useSectionVisibility } from "~/composables/useSectionVisibility";
import { useTextUtils } from "~/composables/useTextUtils";
import { useStatisticsAnimation } from "~/composables/useStatisticsAnimation";
import { useEntryCoverAnimation } from "~/composables/useEntryCoverAnimation";
import { useSplitTextAnimation } from "~/composables/useSplitTextAnimation";

// Use global GSAP instance (should be available through Nuxt GSAP module)
const { $gsap } = useNuxtApp();

// Props
const props = defineProps({
  backgroundGradient: {
    type: String,
    default: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  },
  statisticsText: {
    type: Array,
    default: () => [],
  },
  isLoadingComplete: {
    type: Boolean,
    default: false,
  },
  contentElements: {
    type: Array,
    default: () => [],
  },
});

// Refs
const { sectionRef, isVisible } = useSectionVisibility(0.2);
const whiteSectionRef = ref(null);
const statisticsTextRef = ref(null);
const entryCoverRef = ref(null);
const textRefs = ref([]);

// Text utility functions
const textUtils = useTextUtils();

// Animation composables
const {
  firstTwoLinesFaded,
  initializeAnimations: initializeStatisticsAnimations,
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
});

const { setTextRef, initializeAnimations: initializeSplitTextAnimations } =
  useSplitTextAnimation({
    textRefs,
  });

// Initialize animations on mount
onMounted(() => {
  console.log("Component mounted, checking conditions...");
  console.log("sectionRef available:", !!sectionRef.value);
  console.log("statisticsText length:", props.statisticsText.length);

  if (sectionRef.value && props.statisticsText.length > 0) {
    // Initialize statistics animations
    initializeStatisticsAnimations();

    // Initialize entry cover animation
    initializeEntryCoverAnimation();

    console.log("Animations initialized");
  } else {
    console.log("Conditions not met for animation initialization");
  }

  // Initialize split text animations for content elements
  initializeSplitTextAnimations();
});

// Note: All animation logic has been moved to composables for better organization

// Cleanup on unmount
onUnmounted(() => {
  // Kill all ScrollTriggers to prevent memory leaks
  ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
});
</script>
