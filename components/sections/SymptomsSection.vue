<template>
  <section
    class="py-16 h-[450svh] relative z-20 sm:-mt-[25svh]"
    ref="sectionRef"
    :data-active-symptom="activeSymptom"
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
      <div
        v-if="introCard"
        ref="introCardRef"
        class="relative z-0 mx-auto w-[min(28rem,80vw)] text-left"
      >
        <h3 class="text-primary text-2xl font-medium leading-title lg:text-3xl">
          {{ introCard.title }}
        </h3>
        <p class="text-primary text-base leading-normal lg:text-xl mt-4">
          {{ introCard.description }}
        </p>
      </div>
      <div
        v-if="showProfileModel && !useSharedModel"
        ref="profileModelRef"
        class="pointer-events-none absolute bottom-[-15svh] left-0 z-0 mx-0 h-[115svh] w-[min(100vw,56rem)] opacity-0 max-md:w-[100vw]"
        aria-hidden="true"
      >
        <ThreeBustViewer
          :profile-label="title"
          :profile-label-progress="profileLabelProgress"
          :model-url="getModelUrl(multiviewFileName)"
          :auto-rotate="false"
          :enable-zoom="false"
          :interactive="false"
          :initial-rotation-y="isProfileView ? Math.PI / 2 : 0"
          :symptom-type="activeSymptom"
          :model-scale="1.05"
          model-horizontal-alignment="left"
          :show-backdrop="false"
          :show-loading-indicator="false"
          compact
        />
      </div>
      <div
        ref="cardStageRef"
        class="absolute inset-0 z-10"
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
import type { SymptomType } from "~/components/ui/three-bust/symptom-effects";
import { useAnimationsStore } from "~/stores";
import type { SymptomCardData, IntroCard } from "~/types";
import SymptomCard from "~/components/ui/SymptomCard.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { useIsIOS } from "~/composables/useIsIOS";
import { useSymptomsCarouselAnimation } from "~/composables/symptoms/useSymptomsCarouselAnimation";
import { useSymptomsProfileModelAnimation } from "~/composables/symptoms/useSymptomsProfileModelAnimation";

const { multiviewFileName, getModelUrl } = useDemoBustModelUrls();

declare const useNuxtApp: () => { $gsap: any };

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
  introCard: {
    type: Object as PropType<IntroCard>,
    default: null,
  },
  cards: {
    type: Array as PropType<SymptomCardData[]>,
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
const introCardRef = ref<HTMLElement | null>(null);
const emit = defineEmits<{
  profileProgress: [progress: number];
  symptomChange: [symptom: SymptomType];
  profileViewChange: [isProfileView: boolean];
}>();
const activeSymptom = ref<SymptomType>("none");
const isProfileView = ref(true);
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

const { initializeCarouselAnimation, cleanupCarouselAnimation } =
  useSymptomsCarouselAnimation({
    $gsap,
    sectionRef,
    cardRefs,
    titleRef: introCardRef,
    cardStageRef,
    showProfileModel: props.showProfileModel,
    onActiveCardChange: (index) => {
      activeSymptom.value = props.cards[index]?.symptom ?? "none";
      isProfileView.value = index < 0;
      emit("symptomChange", activeSymptom.value);
      emit("profileViewChange", isProfileView.value);
    },
    onSequenceComplete: () => {
      // The sequence ends on a neutral, front-facing bust rather than
      // returning to the labelled profile view.
      isProfileView.value = false;
      // Notify the parent of the camera state first. Otherwise an existing
      // profile state can briefly receive the neutral symptom and rotate the
      // shared bust to profile before the front-facing update arrives.
      emit("profileViewChange", false);
      activeSymptom.value = "none";
      emit("symptomChange", activeSymptom.value);
    },
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
  cleanupCarouselAnimation();
  cleanupModelAnimation();
});
</script> 
