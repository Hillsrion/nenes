<template>
  <section
    class="py-16 h-[300svh] relative z-20 bg-white -mt-[25svh] testimonialCardsTrigger"
    ref="sectionRef"
  >
    <div
      class="h-[100svh] w-full px-8 sticky top-0 left-1/2 z-10 mx-auto flex flex-col justify-center overflow-hidden"
    >
      <Title ref="titleRef" :title="title" />

      <!-- Cards Container -->
      <div class="absolute inset-0">
        <div
          v-for="(card, index) in cards"
          :key="card.title"
          :ref="(el) => setCardRef(el, index)"
          class="testimonial-wrapper w-[600%] aspect-square absolute top-1/2 -left-[250%] sm:w-[500%] sm:-left-[200%] lg:w-[300%] lg:-left-[100%]"
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
const cardRefs = ref<(HTMLElement | null)[]>([]);
const isTitleHidden = ref(false);
let titleAnimation: any = null;
let carouselAnimation: any = null;
let titleHideAnimation: any = null;

const store = useAnimationsStore();

// Store card refs
const setCardRef = (el: any, index: number) => {
  if (el) {
    cardRefs.value[index] = el;
  }
};

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

// Initialize carousel animation with stagger
const initializeCarouselAnimation = () => {
  if (!sectionRef.value || cardRefs.value.length === 0) return;

  // Filter out null refs
  const validRefs = cardRefs.value.filter((ref) => ref !== null);

  carouselAnimation = $gsap.fromTo(
    validRefs,
    {
      rotation: 30, // Starting angle
    },
    {
      rotation: -30, // Ending angle
      ease: "power1.inOut", // Non-linear movement
      stagger: 0.09, // Delay between the start of each card
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top top",
        end: "bottom bottom",
        scrub: true, // Animation progresses with scrolling
        // markers: true, // Uncomment for debugging
        onUpdate: (self) => {
          // Get the actual rotation of the first card element (card at index 0)
          if (!cardRefs.value[0] || !titleRef.value?.titleElement) return;

          const firstCardElement = cardRefs.value[0];
          const currentRotation = $gsap.getProperty(
            firstCardElement,
            "rotation"
          ) as number;

          // Hide title when first card reaches approximately 0° (covering the title)
          // Using a wider threshold of ±5° to reliably catch fast scrolling
          if (
            currentRotation <= 5 &&
            currentRotation >= -5 &&
            !isTitleHidden.value
          ) {
            isTitleHidden.value = true;
            if (titleHideAnimation) {
              titleHideAnimation.kill();
            }
            titleHideAnimation = $gsap.to(titleRef.value.titleElement, {
              opacity: 0,
              duration: 0.3,
              ease: "power2.out",
            });
          } else if (currentRotation >= 25 && isTitleHidden.value) {
            // Show title again only when first card returns to starting position (rotation ≈ 30°)
            isTitleHidden.value = false;
            if (titleHideAnimation) {
              titleHideAnimation.kill();
              titleHideAnimation = null;
            }
            $gsap.to(titleRef.value.titleElement, {
              opacity: 1,
              duration: 0.3,
              ease: "power2.out",
            });
          }
        },
      },
    }
  );
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      initializeTitleAnimation();
      initializeCarouselAnimation();
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

  if (titleHideAnimation && titleHideAnimation.kill) {
    titleHideAnimation.kill();
  }

  if (carouselAnimation && carouselAnimation.scrollTrigger) {
    carouselAnimation.scrollTrigger.kill();
  }
  if (carouselAnimation && carouselAnimation.kill) {
    carouselAnimation.kill();
  }

  // Reset state flag
  isTitleHidden.value = false;
});
</script> 