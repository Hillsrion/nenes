<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Entry Cover Image -->
    <picture>
      <!-- Portrait (<=768px) → AVIF, then WebP -->
      <source
        type="image/avif"
        media="(max-width: 768px)"
        srcset="
          /images/entry-cover-portrait/entry-cover-portrait@640.avif   640w,
          /images/entry-cover-portrait/entry-cover-portrait@828.avif   828w,
          /images/entry-cover-portrait/entry-cover-portrait@1080.avif 1080w,
          /images/entry-cover-portrait/entry-cover-portrait@1440.avif 1440w
        "
        sizes="100vw"
      />
      <source
        type="image/webp"
        media="(max-width: 768px)"
        srcset="
          /images/entry-cover-portrait/entry-cover-portrait@640.webp   640w,
          /images/entry-cover-portrait/entry-cover-portrait@828.webp   828w,
          /images/entry-cover-portrait/entry-cover-portrait@1080.webp 1080w,
          /images/entry-cover-portrait/entry-cover-portrait@1440.webp 1440w
        "
        sizes="100vw"
      />
      <!-- Landscape (>=769px) → AVIF, then WebP -->
      <source
        type="image/avif"
        media="(min-width: 769px)"
        srcset="
          /images/entry-cover/entry-cover@1024.avif 1024w,
          /images/entry-cover/entry-cover@1280.avif 1280w,
          /images/entry-cover/entry-cover@1920.avif 1920w,
          /images/entry-cover/entry-cover@2560.avif 2560w,
          /images/entry-cover/entry-cover@3840.avif 3840w
        "
        sizes="100vw"
      />
      <source
        type="image/webp"
        media="(min-width: 769px)"
        srcset="
          /images/entry-cover/entry-cover@1024.webp 1024w,
          /images/entry-cover/entry-cover@1280.webp 1280w,
          /images/entry-cover/entry-cover@1920.webp 1920w,
          /images/entry-cover/entry-cover@2560.webp 2560w,
          /images/entry-cover/entry-cover@3840.webp 3840w
        "
        sizes="100vw"
      />
      <img
        ref="entryCoverRef"
        src="/images/entry-cover/entry-cover@1280.webp"
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
      class="relative h-[350svh] w-full min-h-screen bg-white transition-all duration-300 ease-out overflow-x-clip"
      ref="whiteSectionRef"
      :class="{
        'rounded-t-4xl':
          animationsStore?.sections?.loading?.state === 'isAnimating' ||
          animationsStore?.sections?.loading?.state === 'idle',
      }"
    >
      <div v-if="isIOS" class="h-svh"></div>
      <div
        class="max-w-[42rem] h-[100svh] w-full px-8 top-0 z-10 mx-auto flex flex-col justify-center"
        :class="{
          sticky: !isIOS,
          fixed: isIOS,
        }"
      >
        <div
          ref="statisticsTextRef"
          class="text-2xl xs:text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative w-full break-words"
        >
          <template v-for="(line, index) in statisticsText" :key="index">
            <span class="inline-block">
              <template v-if="index === statisticsText.length - 1">
                <!-- Split last line: first word goes left, rest goes right -->
                <span
                  class="inline-block animate-split-word-left sm:mr-3 xs:mr-2 mr-1.5"
                >
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
          class="max-w-[70rem] mx-auto grid grid-cols-5 lg:grid-cols-6 lg:gap-y-[60vh] gap-y-[40vh] auto-rows-auto mt-[60vh]"
        >
          <div
            v-for="(element, index) in contentElements"
            :key="index"
            :class="[
              index % 2 === 0
                ? 'col-span-4'
                : 'col-start-2 lg:col-start-3 col-span-4 row-start-2',
            ]"
          >
            <p
              :ref="
                (el) => {
                  if (el) textRefs[index] = el;
                }
              "
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
      class="fixed sm:bottom-8 xs:bottom-6 bottom-4 left-1/2 -translate-x-1/2 z-20 font-serif text-serif-size text-primary transition-opacity duration-500"
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
import { gsap } from "gsap";

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
  // scrollContainer: { // Removed, as Lenis will handle the scrolling context
  //   type: [Object, Window],
  //   default: () => window,
  // },
});

// Check if iOS
const isIOS = computed(() => {
  return (
    navigator.userAgent.includes("iPhone") ||
    navigator.userAgent.includes("iPad")
  );
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
  // scrollContainer: props.scrollContainer, // Removed
});

const {
  isCoverFullyVisible,
  initializeAnimation: initializeEntryCoverAnimation,
} = useEntryCoverAnimation({
  sectionRef,
  entryCoverRef,
  statisticsTextRef,
  // scrollContainer: props.scrollContainer, // Removed
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
    gsap.set(entryCoverRef.value, {
      scale: 0,
      opacity: 0,
    });
  }

  // Old alert trigger and refresh logic removed
});

// Watch for loading completion before initializing other animations
watch(
  () => animationsStore?.sections?.loading?.state,
  (loadingState) => {
    if (loadingState === "isComplete" && !animationsInitialized) {
      if (sectionRef.value && props.statisticsText.length > 0) {
        // Re-enable original animation initialization
        initializeStatisticsAnimations();

        nextTick(() => {
          initializeEntryCoverAnimation();
          initializeContentElementsAnimation();

          // No longer need extra refresh here as composables handle their own
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
  // Removed ctx.revert() as ctx is no longer used for ScrollTriggers directly in EntrySection.vue
});
</script>
