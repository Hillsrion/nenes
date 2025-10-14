<template>
  <div ref="containerRef" class="relative mt-[450svh] container mx-auto">
    <!-- Fixed video at center of viewport -->
    <video
      ref="videoRef"
      :src="currentVideoUrl"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover scale-0 origin-center"
      autoplay
      muted
      loop
      playsinline
    ></video>

    <!-- Examination Cards in normal document flow -->
    <div
      v-for="(step, index) in steps"
      :key="`card-${index}`"
      class="min-h-screen flex items-center py-16 relative z-1"
      :class="[index % 2 === 0 ? 'justify-start' : 'justify-end']"
      ref="cardRefs"
    >
      <ExaminationCard
        :step-number="`${index + 1}`"
        :description="step.content"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from "vue";
import { useAnimationsStore } from "../../stores";
import ExaminationCard from "~/components/ui/ExaminationCard.vue";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

interface Step {
  content: string;
  videoUrl: string;
}

interface Props {
  steps: Step[];
}

const props = defineProps<Props>();

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();

// GSAP with ScrollTrigger is registered globally in the app

// Refs
const videoRef = ref<HTMLVideoElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const cardRefs = ref<(HTMLElement | null)[]>([]);

// Current step tracking
const currentStepIndex = ref(0);

// No need to split steps - single loop handles positioning

// Current video URL based on current step
const currentVideoUrl = computed(() => {
  if (props.steps[currentStepIndex.value]) {
    return props.steps[currentStepIndex.value].videoUrl;
  }
  return "";
});

// Initialize all animations with GSAP ScrollTrigger
const initializeAnimations = () => {
  if (!containerRef.value || !videoRef.value) return;

  // Set initial video state
  $gsap.set(videoRef.value, { scale: 0 });

  // Video entrance animation using GSAP with ScrollTrigger
  $gsap.fromTo(
    videoRef.value,
    { scale: 0 },
    {
      scale: 1,
      duration: 0.8,
      ease: "power2.out",
      scrollTrigger: {
        trigger: containerRef.value,
        start: "top center",
        end: "center center",
        scrub: 1,
      },
    }
  );

  // Video URL switching using GSAP with ScrollTrigger
  nextTick(() => {
    props.steps.forEach((_, index) => {
      const cardElement = cardRefs.value[index];
      if (cardElement) {
        $gsap.fromTo(
          {},
          {},
          {
            scrollTrigger: {
              trigger: cardElement,
              start: "top 50%",
              end: "bottom 50%",
              onEnter: () => {
                currentStepIndex.value = index;
              },
              onEnterBack: () => {
                currentStepIndex.value = index;
              },
            },
          }
        );
      }
    });
  });
};

// Watch for loading completion to start animations
watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      containerRef.value &&
      containerRef.value.parentElement
    ) {
      setTimeout(() => {
        initializeAnimations();
      }, 1000);
    }
  }
);

// Cleanup
onUnmounted(() => {
  // Kill all GSAP animations and ScrollTriggers
  $gsap.killTweensOf([videoRef.value, ...cardRefs.value]);
});
</script>

<style scoped>
/* Ensure video covers the viewport properly */
video {
  min-width: 100%;
  min-height: 100%;
}
</style>