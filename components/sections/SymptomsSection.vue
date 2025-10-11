<template>
  <section
    class="min-h-screen py-16 h-[100svh] relative z-30 flex justify-center bg-white"
    ref="sectionRef"
  >
    <div class="max-w-6xl mx-auto px-8">
      <Title ref="titleRef" :title="title" />
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { gsap } from "gsap";
import Title from "~/components/ui/Title.vue";

const props = defineProps({
  title: {
    type: String,
    required: true,
  },
});

const sectionRef = ref<HTMLElement | null>(null);
const titleRef = ref<{ titleElement: HTMLElement } | null>(null);

let titleAnimation: any = null;

onMounted(() => {
  if (!sectionRef.value || !titleRef.value?.titleElement) return;

  // Register ScrollTrigger
  gsap.registerPlugin(gsap.ScrollTrigger);

  // Create scroll-triggered animation
  titleAnimation = gsap.fromTo(
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
        end: "top 50%+=300px", // End when section center reaches viewport center
        scrub: 1,
      },
    }
  );
});

onUnmounted(() => {
  if (titleAnimation && titleAnimation.scrollTrigger) {
    titleAnimation.scrollTrigger.kill();
  }
  if (titleAnimation && titleAnimation.kill) {
    titleAnimation.kill();
  }
});
</script> 