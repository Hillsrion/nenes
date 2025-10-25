<template>
  <section
    class="py-16 h-[450svh] relative z-20 bg-white -mt-[25svh]"
    ref="sectionRef"
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
import { useNuxtApp } from "nuxt/app";
import { ref, onUnmounted, watch, PropType, nextTick } from "vue";
import { useAnimationsStore } from "~/stores";
import { Card } from "~/types";
import Title from "~/components/ui/Title.vue";
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

// Check if iOS
const isIOS = computed(() => {
  return (
    navigator.userAgent.includes("iPhone") ||
    navigator.userAgent.includes("iPad")
  );
});

const { $gsap } = useNuxtApp();

const sectionRef = ref<HTMLElement | null>(null);
const titleWrapperRef = ref<HTMLElement | null>(null);
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
  if (!titleWrapperRef.value) return;

  // Use matchMedia to have different start positions for mobile vs desktop
  const mm = $gsap.matchMedia();

  mm.add(
    {
      // Mobile (small screens)
      isMobile: "(max-width: 1023px)",
      // Desktop (large screens and up)
      isDesktop: "(min-width: 1024px)",
    },
    (context: any) => {
      const { isMobile } = context.conditions;
      titleAnimation = $gsap.fromTo(
        titleWrapperRef.value,
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
            // On mobile, start much later (when 50% of section has scrolled past viewport top)
            // This accounts for the negative margin and ensures ScreeningSection is fully past
            // On desktop, start earlier (when section top is at 30% from top)
            start: isMobile ? "30% top" : "top 30%",
            end: isMobile ? "40% top" : "30% bottom",
            scrub: 1,
            // markers: true, // Uncomment to debug scroll positions
          },
        }
      );
    }
  );
};

// Initialize carousel animation with stagger
const initializeCarouselAnimation = () => {
  if (!sectionRef.value || cardRefs.value.length === 0) return;

  // Filter out null refs
  const validRefs = cardRefs.value.filter((ref) => ref !== null);

  // Use matchMedia to have different start positions for mobile vs desktop
  const mm = $gsap.matchMedia();

  mm.add(
    {
      // Mobile (small screens)
      isMobile: "(max-width: 1023px)",
      // Desktop (large screens and up)
      isDesktop: "(min-width: 1024px)",
    },
    (context: any) => {
      const { isMobile } = context.conditions;

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
            // On mobile, start after title reveal (at 35% to give a slight overlap)
            // On desktop, start immediately
            start: isMobile ? "35% top" : "top top",
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
              if (currentRotation <= 5 && !isTitleHidden.value) {
                isTitleHidden.value = true;
                if (titleHideAnimation) {
                  titleHideAnimation.kill();
                }
                titleHideAnimation = $gsap.to(titleRef.value.titleElement, {
                  opacity: 0,
                  duration: 0.3,
                  ease: "power2.out",
                });
              } else if (
                currentRotation >= 15 &&
                isTitleHidden.value &&
                self.direction === -1
              ) {
                console.log("show title");
                // Show title again when first card starts moving back up (rotation ≈ 15°) and scrolling upward
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
    }
  );
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      nextTick(() => {
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