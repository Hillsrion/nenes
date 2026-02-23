<template>
  <section
    class="py-16 h-[450svh] relative z-20 bg-white sm:-mt-[25svh]"
    ref="sectionRef"
    :class="{
      'opacity-0': !showSymptomsSection,
    }"
  >
    <div v-if="isIOS" class="h-svh"></div>
    <div
      class="h-[100svh] w-full px-8 top-0 z-10 mx-auto flex flex-col justify-center overflow-hidden"
      :class="{
        sticky: !isIOS,
        fixed: isIOS,
      }"
    >
      <div ref="titleWrapperRef">
        <Title ref="titleRef" :title="title" />
      </div>
      <div class="absolute inset-0">
        <div
          v-for="(card, index) in cards"
          :key="card.title"
          :ref="(el) => setCardRef(el, index)"
          class="w-[600%] aspect-square absolute top-1/2 -left-[250%] sm:w-[500%] sm:-left-[200%] lg:w-[300%] lg:-left-[100%]"
        >
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25vw] min-w-[400px]"
          >
            <SymptomCard
              :title="card.title"
              :description="card.description"
              :image="card.image"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import { useAnimationsStore } from "~/stores";
import { Card } from "~/types";
import Title from "~/components/ui/Title.vue";
import SymptomCard from "~/components/ui/SymptomCard.vue";
import { useIsIOS } from "~/composables/useIsIOS";
import { useSymptomsTitleAnimation } from "~/composables/symptoms/useSymptomsTitleAnimation";
import { useSymptomsCarouselAnimation } from "~/composables/symptoms/useSymptomsCarouselAnimation";

declare const useNuxtApp: () => { $gsap: any };

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  cards: {
    type: Array as PropType<Card[]>,
    required: true,
  },
});

// Check if iOS
const { isIOS } = useIsIOS();

const { $gsap } = useNuxtApp();

const sectionRef = ref<HTMLElement | null>(null);
const titleWrapperRef = ref<HTMLElement | null>(null);
const titleRef = ref<{ titleElement: HTMLElement } | null>(null);
const cardRefs = ref<(HTMLElement | null)[]>([]);

const store = useAnimationsStore();

const showSymptomsSection = ref(false);

// Store card refs
const setCardRef = (el: Element | null, index: number) => {
  if (el instanceof HTMLElement) {
    cardRefs.value[index] = el;
  }
};

const { initializeTitleAnimation, cleanupTitleAnimation } =
  useSymptomsTitleAnimation({
    $gsap,
    sectionRef,
    titleWrapperRef,
  });

const { initializeCarouselAnimation, cleanupCarouselAnimation } =
  useSymptomsCarouselAnimation({
    $gsap,
    sectionRef,
    cardRefs,
    titleRef,
  });

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      nextTick(() => {
        $gsap.delayedCall(1.5, () => {
          showSymptomsSection.value = true;
        });
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              initializeTitleAnimation();
              initializeCarouselAnimation();
            });
          });
        }, 50);
      });
    }
  }
);

onUnmounted(() => {
  cleanupTitleAnimation();
  cleanupCarouselAnimation();
});
</script> 
