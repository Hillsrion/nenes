<template>
  <section
    class="py-16 h-[450svh] relative z-20 sm:-mt-[25svh]"
    ref="sectionRef"
    :class="[
      useSharedModel ? 'bg-transparent' : 'bg-white',
      { 'opacity-0': !showSymptomsSection }
    ]"
  >
    <div v-if="isIOS" class="h-svh"></div>
    <div
      class="h-[100svh] w-full px-8 top-0 z-10 mx-auto flex flex-col justify-center overflow-hidden bg-transparent"
      :class="{
        sticky: !isIOS,
        fixed: isIOS,
      }"
    >
      <div v-if="!showProfileModel" ref="titleWrapperRef">
        <Title ref="titleRef" :title="title" />
      </div>
      <div
        v-if="showProfileModel && !useSharedModel"
        ref="profileModelRef"
        class="pointer-events-none absolute bottom-[-15svh] left-0 z-0 mx-0 h-[115svh] w-[min(78vw,42rem)] opacity-0 max-md:w-[95vw]"
        aria-hidden="true"
      >
        <ThreeBustViewer
          :profile-label="title"
          :profile-label-progress="profileLabelProgress"
          model-url="/models/bust-multiview-v2-symptoms.glb"
          :auto-rotate="false"
          :enable-zoom="false"
          :interactive="false"
          :initial-rotation-y="Math.PI / 2"
          :model-scale="1.18"
          model-horizontal-alignment="left"
          :show-backdrop="false"
          :show-loading-indicator="false"
          compact
        />
      </div>
      <div
        ref="cardStageRef"
        class="absolute inset-0"
        :class="{ 'opacity-0': showProfileModel }"
      >
        <div
          v-for="(card, index) in cards"
          :key="card.title"
          :ref="(el) => setCardRef(el, index)"
          class="w-[600%] aspect-square absolute top-1/2 -left-[250%] sm:w-[500%] sm:-left-[200%] lg:w-[300%] lg:-left-[100%]"
        >
          <div
            class="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[25vw] min-w-[360px]"
          >
            <SymptomCard
              :title="card.title"
              :subtitle="card.subtitle"
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
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useIsIOS } from "~/composables/useIsIOS";
import { useSymptomsTitleAnimation } from "~/composables/symptoms/useSymptomsTitleAnimation";
import { useSymptomsCarouselAnimation } from "~/composables/symptoms/useSymptomsCarouselAnimation";
import { useSymptomsProfileModelAnimation } from "~/composables/symptoms/useSymptomsProfileModelAnimation";

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
  showProfileModel: {
    type: Boolean,
    default: false,
  },
  useSharedModel: {
    type: Boolean,
    default: false,
  },
});

// Check if iOS
const { isIOS } = useIsIOS();

const { $gsap } = useNuxtApp();

const sectionRef = ref<HTMLElement | null>(null);
const titleWrapperRef = ref<HTMLElement | null>(null);
const titleRef = ref<{ titleElement: HTMLElement } | null>(null);
const emit = defineEmits<{ profileProgress: [progress: number] }>();
const profileLabelProgress = ref(0);
const cardRefs = ref<(HTMLElement | null)[]>([]);
const profileModelRef = ref<HTMLElement | null>(null);
const cardStageRef = ref<HTMLElement | null>(null);

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
    cardStageRef,
    showProfileModel: props.showProfileModel,
  });

const { initializeModelAnimation, cleanupModelAnimation } =
  useSymptomsProfileModelAnimation({
    $gsap,
    sectionRef,
    modelRef: profileModelRef,
    onTitleProgress: (progress: number) => {
      profileLabelProgress.value = progress;
      emit("profileProgress", progress);
    },
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
              if (props.showProfileModel) initializeModelAnimation();
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
  cleanupModelAnimation();
});
</script> 
