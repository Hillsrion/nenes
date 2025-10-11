<template>
  <section class="py-16 h-[300svh] relative z-30 bg-white" ref="sectionRef">
    <div class="max-w-6xl mx-auto px-8">
      <Title ref="titleRef" :title="title" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useNuxtApp } from "nuxt/app";
import { ref, onUnmounted, watch } from "vue";
import Title from "~/components/ui/Title.vue";
import { useAnimationsStore } from "~/stores";

const props = defineProps({
  title: {
    type: String,
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
      scale: 2,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration: 0.8,
      ease: "cubic-bezier(0.25, 0.46, 0.45, 0.94)",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top 50%", // Start when section top reaches 80% of viewport height
        end: "center center", // End when section center reaches viewport center
        scrub: 1,
        markers: true,
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