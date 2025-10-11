<template>
  <section
    class="py-16 h-[300svh] relative z-20 bg-white -mt-[25svh]"
    ref="sectionRef"
  >
    <div
      class="h-[100svh] w-full px-8 sticky top-0 left-1/2 z-10 mx-auto flex flex-col justify-center"
    >
      <Title ref="titleRef" :title="title" />
    </div>
    <ul class="relative z-20">
      <SymptomCard
        v-for="card in cards"
        :key="card.title"
        :title="card.title"
        :description="card.description"
        :image="card.image"
      />
    </ul>
  </section>
</template>

<script setup lang="ts">
import { useNuxtApp } from "nuxt/app";
import { ref, onUnmounted, watch, PropType } from "vue";
import Title from "~/components/ui/Title.vue";
import { useAnimationsStore } from "~/stores";
import { Card } from "~/types";
import SymptomCard from "~/components/ui/SymptomCard.vue";

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

const { $gsap } = useNuxtApp();

const sectionRef = ref<HTMLElement | null>(null);
const titleRef = ref<{ titleElement: HTMLElement } | null>(null);
let titleAnimation: any = null;

const store = useAnimationsStore();

const initializeTitleAnimation = () => {
  if (!titleRef.value?.titleElement) return;
  titleAnimation = $gsap.fromTo(
    titleRef.value.titleElement,
    {
      scale: 5,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top 30%",
        end: "30% bottom",
        scrub: 1,
      },
    }
  );
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      initializeTitleAnimation();
    }
  }
);

onUnmounted(() => {
  if (titleAnimation && titleAnimation.scrollTrigger) {
    titleAnimation.scrollTrigger.kill();
  }
  if (titleAnimation && titleAnimation.kill) {
    titleAnimation.kill();
  }
});
</script> 