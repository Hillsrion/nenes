<template>
  <section ref="sectionRef" class="relative w-full bg-white">
    <div
      ref="revealTrackRef"
      class="entry-reveal-track relative h-[360svh] w-full"
    >
      <div
        ref="revealStageRef"
        class="sticky top-0 h-[100svh] w-full overflow-hidden rounded-t-4xl bg-white"
      >
        <picture class="absolute inset-0 z-0 block h-full w-full">
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
            alt="Quatre femmes réunies dans un salon"
            class="absolute inset-0 h-full w-full object-cover"
          />
        </picture>

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
      class="relative z-40 min-h-[220svh] w-full bg-primary px-8"
    >
      <div
        class="container mx-auto grid min-h-[220svh] w-full max-w-[70rem] grid-cols-5 content-around py-[35svh] lg:grid-cols-6"
      >
        <div
          v-for="(element, index) in contentElements"
          :key="element.content"
          :class="[
            index % 2 === 0
              ? 'col-span-4'
              : 'col-start-2 col-span-4 lg:col-start-3',
          ]"
        >
          <p
            :ref="(elementRef) => setContentRef(elementRef, index)"
            class="text-3xl font-medium leading-title text-secondary lg:text-5xl"
          >
            {{ element.content }}
          </p>
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
const numberWhiteRef = ref(null);
const numberBlueRef = ref(null);
const numberMaskRef = ref(null);
const numberTargetRef = ref(null);
const phrasePartRefs = ref([]);
const contentSectionRef = ref(null);
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
});

const {
  initializeAnimation: initializeContentElementsAnimation,
  cleanup: cleanupContentElementsAnimation,
} = useNewContentElementsAnimation({
  sectionRef: contentSectionRef,
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
