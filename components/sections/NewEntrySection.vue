<template>
  <section ref="sectionRef" class="relative w-full bg-white">
    <div
      ref="revealTrackRef"
      class="entry-reveal-track relative h-[960svh] w-full"
    >
      <div
        ref="revealStageRef"
        class="sticky top-0 h-[100svh] w-full overflow-hidden rounded-t-4xl bg-white"
      >
        <div ref="entryCoverRef" class="absolute inset-0 z-0 h-full w-full">
          <IntroPhotoSequence ref="photoSequenceRef" />
        </div>

        <div
          ref="whiteSectionRef"
          class="absolute inset-x-0 top-full z-10 h-full bg-white will-change-transform"
          aria-hidden="true"
        />

        <div class="pointer-events-none absolute inset-0 z-20" aria-hidden="true">
          <span
            ref="numberWhiteRef"
            class="statistic-number absolute left-1/2 top-1/2 block text-white"
          >
            {{ statisticNumber }}
          </span>

          <div
            ref="numberMaskRef"
            class="absolute inset-0 overflow-hidden"
            style="clip-path: inset(100% 0 0 0)"
          >
            <span
              ref="numberBlueRef"
              class="statistic-number absolute left-1/2 top-1/2 block text-primary"
            >
              {{ statisticNumber }}
            </span>
          </div>
        </div>

        <div
          ref="statisticsTextRef"
          class="pointer-events-none absolute inset-0 z-30 mx-auto flex h-full w-full max-w-[42rem] flex-col justify-center px-8 text-center text-2xl font-medium leading-snug text-primary xs:text-3xl lg:text-5xl lg:leading-[4rem]"
          :aria-label="fullStatisticsText"
        >
          <template v-for="(line, index) in statisticsText" :key="line">
            <span
              v-if="index < statisticsText.length - 1"
              :ref="(element) => setPhrasePartRef(element, index)"
              class="block opacity-0"
              aria-hidden="true"
            >
              {{ line }}
            </span>

            <span v-else class="block" aria-hidden="true">
              <span
                :ref="(element) => setPhrasePartRef(element, 2)"
                class="inline-block whitespace-pre opacity-0"
              >{{ lastLineParts.before }}</span>
              <span :ref="setNumberTargetRef" class="invisible inline-block">
                {{ statisticNumber }}
              </span>
              <span
                :ref="(element) => setPhrasePartRef(element, 3)"
                class="inline-block whitespace-pre opacity-0"
              >{{ lastLineParts.after }}</span>
            </span>
          </template>
        </div>
      </div>
    </div>

    <div
      ref="contentSectionRef"
      class="relative z-40 h-[280svh] w-full bg-white"
    >
      <div
        ref="contentStageRef"
        class="sticky top-0 h-[100svh] w-full overflow-hidden bg-white"
      >
        <ThreeFruitPile :active="fruitRainStarted" />

        <div
          class="absolute right-[7vw] top-[18vh] z-20 flex w-[min(48rem,56vw)] flex-col gap-6 max-md:left-6 max-md:right-6 max-md:w-auto"
        >
          <div
            v-for="(element, index) in contentElements"
            :key="element.content"
          >
          <p
            :ref="(elementRef) => setContentRef(elementRef, index)"
            class="text-3xl font-medium leading-title text-primary opacity-0 lg:text-5xl"
          >
            {{ element.content }}
          </p>
          </div>
        </div>
      </div>
    </div>

    <div
      class="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 font-serif text-serif-size text-secondary transition-opacity duration-500 xs:bottom-6 sm:bottom-8"
      :class="{
        'pointer-events-none opacity-0': animationsStore.cover.isScaling,
      }"
    >
      scroll
    </div>
  </section>
</template>

<script setup>
import IntroPhotoSequence from "~/components/ui/IntroPhotoSequence.vue";
import ThreeFruitPile from "~/components/ui/ThreeFruitPile.vue";
import { useEntryRevealAnimation } from "~/composables/useEntryRevealAnimation";
import { useNewContentElementsAnimation } from "~/composables/useNewContentElementsAnimation";
import { useAnimationsStore } from "~/stores";

const animationsStore = useAnimationsStore();

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

const sectionRef = ref(null);
const revealTrackRef = ref(null);
const revealStageRef = ref(null);
const whiteSectionRef = ref(null);
const statisticsTextRef = ref(null);
const entryCoverRef = ref(null);
const photoSequenceRef = ref(null);
const numberWhiteRef = ref(null);
const numberBlueRef = ref(null);
const numberMaskRef = ref(null);
const numberTargetRef = ref(null);
const phrasePartRefs = ref([]);
const contentSectionRef = ref(null);
const contentStageRef = ref(null);
const fruitRainStarted = ref(false);
const textRefs = ref([]);

const lastStatisticsLine = computed(
  () => props.statisticsText[props.statisticsText.length - 1] || "plus de 60000 femmes."
);

const statisticNumber = computed(
  () => lastStatisticsLine.value.match(/\d[\d\s]*/)?.[0].trim() || "60000"
);

const lastLineParts = computed(() => {
  const numberIndex = lastStatisticsLine.value.indexOf(statisticNumber.value);

  if (numberIndex < 0) {
    return { before: lastStatisticsLine.value, after: "" };
  }

  return {
    before: lastStatisticsLine.value.slice(0, numberIndex),
    after: lastStatisticsLine.value.slice(
      numberIndex + statisticNumber.value.length
    ),
  };
});

const fullStatisticsText = computed(() => props.statisticsText.join(" "));

const setPhrasePartRef = (element, index) => {
  if (element) phrasePartRefs.value[index] = element;
};

const setNumberTargetRef = (element) => {
  numberTargetRef.value = element || null;
};

const setContentRef = (element, index) => {
  if (element) textRefs.value[index] = element;
};

const {
  prepareInitialState,
  initializeAnimation: initializeEntryRevealAnimation,
  cleanup: cleanupEntryRevealAnimation,
} = useEntryRevealAnimation({
  revealTrackRef,
  revealStageRef,
  entryCoverRef,
  whiteSectionRef,
  numberWhiteRef,
  numberBlueRef,
  numberMaskRef,
  numberTargetRef,
  phrasePartRefs,
  onPhotoProgress: (progress) => photoSequenceRef.value?.setProgress(progress),
});

const {
  initializeAnimation: initializeContentElementsAnimation,
  cleanup: cleanupContentElementsAnimation,
} = useNewContentElementsAnimation({
  sectionRef: contentSectionRef,
  stageRef: contentStageRef,
  onEnter: () => { fruitRainStarted.value = true; },
  textRefs,
});

let animationsInitialized = false;

onMounted(() => {
  prepareInitialState();
});

watch(
  () => animationsStore.sections.loading?.state,
  (loadingState) => {
    if (loadingState === "isAnimating") {
      prepareInitialState();
    }

    if (loadingState === "isComplete" && !animationsInitialized) {
      nextTick(() => {
        initializeEntryRevealAnimation();
        initializeContentElementsAnimation();
      });
      animationsInitialized = true;
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  cleanupEntryRevealAnimation();
  cleanupContentElementsAnimation();
});
</script>

<style scoped>
.statistic-number {
  font-size: clamp(6rem, 28vw, 24rem);
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  line-height: 0.82;
  opacity: 0;
  white-space: nowrap;
  will-change: transform, opacity;
}

@media (prefers-reduced-motion: reduce) {
  .entry-reveal-track {
    height: 100svh;
  }

  .statistic-number,
  [class*="will-change"] {
    will-change: auto;
  }
}
</style>
