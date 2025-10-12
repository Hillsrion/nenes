<template>
  <div ref="containerRef" class="relative pt-[400svh] container mx-auto">
    <!-- Fixed video at center of viewport -->
    <video
      ref="videoRef"
      :src="currentVideoUrl"
      class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full h-full object-cover"
      autoplay
      muted
      loop
      playsinline
    ></video>

    <!-- Examination Cards in normal document flow -->
    <div
      v-for="(step, index) in steps"
      :key="`card-${index}`"
      class="min-h-screen flex items-center py-16"
      :class="[index % 2 === 0 ? 'justify-start' : 'justify-end']"
    >
      <ExaminationCard
        :step-number="`${index + 1}`"
        :description="step.content"
        ref="cardRefs"
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

// Register ScrollTrigger plugin
const ScrollTrigger = $gsap.ScrollTrigger;

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

// Animation instances
let masterTimeline: any = null;

// Initialize all animations with ScrollTrigger
const initializeAnimations = () => {
  if (!containerRef.value || !videoRef.value) return;

  // Kill any existing timeline
  if (masterTimeline) {
    masterTimeline.kill();
  }

  // Set initial video state
  $gsap.set(videoRef.value, { scale: 0 });

  // Video entrance animation
  $gsap.to(videoRef.value, {
    scale: 1,
    duration: 0.8,
    ease: "power2.out",
  });

  // Card entrance animations - trigger when each card comes into view
  nextTick(() => {
    cardRefs.value.forEach((card, index) => {
      if (card) {
        $gsap.set(card, { opacity: 0, y: 32 });

        ScrollTrigger.create({
          trigger: card,
          start: "top 80%",
          end: "top 60%",
          onEnter: () => {
            $gsap.to(card, {
              opacity: 1,
              y: 0,
              duration: 0.6,
              ease: "power2.out",
            });
          },
          onLeaveBack: () => {
            $gsap.to(card, {
              opacity: 0,
              y: 32,
              duration: 0.3,
              ease: "power2.out",
            });
          },
        });
      }
    });

    // Video URL switching - trigger when each card section is in view
    props.steps.forEach((_, index) => {
      const cardElement = cardRefs.value[index];
      if (cardElement) {
        ScrollTrigger.create({
          trigger: cardElement,
          start: "top 50%",
          end: "bottom 50%",
          onEnter: () => {
            currentStepIndex.value = index;
          },
          onEnterBack: () => {
            currentStepIndex.value = index;
          },
        });
      }
    });
  });
};

// Watch for header completion to start entry animation
watch(
  () => store.getSectionState("self-examination-header"),
  (headerState) => {
    if (headerState === "isComplete") {
      nextTick(() => {
        initializeAnimations();
      });
    }
  }
);

// Cleanup
onUnmounted(() => {
  // Kill all ScrollTriggers associated with this component
  ScrollTrigger.getAll().forEach((trigger) => {
    if (trigger.vars.trigger && cardRefs.value.includes(trigger.vars.trigger)) {
      trigger.kill();
    }
  });
});
</script>

<style scoped>
/* Ensure video covers the viewport properly */
video {
  min-width: 100%;
  min-height: 100%;
}
</style>