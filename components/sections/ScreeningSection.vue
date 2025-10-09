<template>
  <section class="flex items-center justify-center relative" ref="sectionRef">
    <div
      class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12"
    >
      <!-- Main content -->
      <div class="flex-1 lg:w-3/5">
        <div class="max-w-2xl">
          <p
            :ref="(el) => setTextRef(el, 0)"
            class="text-primary font-medium text-3xl md:text-4xl lg:text-5xl leading-[1.33] mb-8"
          >
            {{ title }}
          </p>
        </div>
      </div>

      <!-- Sidebar elements -->
      <div class="flex flex-col lg:w-1/4 gap-8 lg:gap-16">
        <div
          v-for="(element, index) in sidebarElements"
          :key="index"
          class="group"
        >
          <div class="flex flex-col gap-4">
            <!-- Content -->
            <div class="flex flex-col gap-4">
              <h3
                class="text-primary uppercase leading-[1.33] lg:text-base text-sm tracking-[.16rem]"
              >
                {{ element.title }}
              </h3>
              <p class="text-primary text-base lg:text-xl leading-7.5">
                {{ element.content }}
              </p>
              <div class="relative overflow-hidden mt-8">
                <img
                  :src="element.image"
                  :alt="element.title"
                  class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  ref,
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  type ComponentPublicInstance,
} from "vue";
import SplitType from "split-type";
import { useAnimationsStore } from "../../stores";

// Define the interface for sidebar elements
interface SidebarElement {
  title: string;
  content: string;
  image: string;
}

interface Props {
  sidebarElements: SidebarElement[];
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sidebarElements: () => [],
  title: () => "",
});

// Animation store
const store = useAnimationsStore();

// ScrollTrigger timeline ref for cleanup
let logoScrollTrigger: any = null;

const sectionRef = ref<HTMLElement | null>(null);

// ScrollTrigger to detect when section top reaches viewport top
onMounted(() => {
  if (!sectionRef.value) return;

  const { $gsap } = useNuxtApp();

  // Create ScrollTrigger that triggers when section top reaches viewport top
  logoScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top top", // When top of section reaches top of viewport
      end: "bottom top", // Keep active until section bottom reaches viewport top
      onEnter: () => {
        // When section top reaches viewport top, set logo back to primary
        store.updateLogoColor(true);
      },
      onEnterBack: () => {
        // When scrolling back up and section top reaches viewport top again, set logo back to primary
        store.updateLogoColor(true);
      },
    },
  });
});

// Title refs for split text animation
const textRefs = ref<HTMLElement[]>([]);

// Set text ref function (following the pattern from useSplitTextAnimation)
const setTextRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  if (el && el instanceof HTMLElement) {
    textRefs.value[index] = el;
  }
};

// Initialize split text animation for title with 50% starting opacity
const initializeTitleAnimation = () => {
  if (!textRefs.value.length) return;

  textRefs.value.forEach((textElement) => {
    if (!textElement) return;

    const splitTypeInstance = new SplitType(textElement, {
      types: "lines",
      lineClass: "split-line",
      splitClass: "split-text",
      tagName: "span",
    });

    const split = splitTypeInstance;

    // Store the revert function for cleanup
    const revert = () => splitTypeInstance.revert();

    // Set initial state and create scroll trigger animation
    nextTick(() => {
      if (!split?.lines?.length || !sectionRef?.value) return;
      const { $gsap } = useNuxtApp();
      console.log("split", split.lines);
      // Create scroll trigger animation that goes from 50% to 100% opacity line by line
      const titleAnimation = $gsap.fromTo(
        split.lines,
        {
          opacity: 0.4,
        },
        {
          opacity: 1,
          ease: "power2.out",
          stagger: 0.05, // Stagger each line
          scrollTrigger: {
            trigger: sectionRef.value,
            start: "top 80%", // Start when section enters viewport
            end: "center center", // End when section reaches center
            scrub: 1, // Smooth scrubbing
            markers: true,
          },
        }
      );

      // Cleanup on unmount
      onUnmounted(() => {
        if (titleAnimation && titleAnimation.scrollTrigger) {
          titleAnimation.scrollTrigger.kill();
        }
        if (titleAnimation && titleAnimation.kill) {
          titleAnimation.kill();
        }
        if (logoScrollTrigger && logoScrollTrigger.scrollTrigger) {
          logoScrollTrigger.scrollTrigger.kill();
        }
        if (logoScrollTrigger && logoScrollTrigger.kill) {
          logoScrollTrigger.kill();
        }
        if (revert) {
          revert();
        }
      });
    });
  });
};

// Watch for loading completion and initialize animation
watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      setTimeout(() => {
        initializeTitleAnimation();
      }, 1000);
    }
  }
);

// Auto-imported composables
declare const useNuxtApp: () => { $gsap: any };
</script>
