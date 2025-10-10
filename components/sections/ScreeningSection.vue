<template>
  <section
    class="flex items-center justify-center bg-white rounded-t-4xl sticky top-0 z-30 py-27"
    ref="sectionRef"
  >
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
      <div ref="sidebarRef" class="flex flex-col lg:w-1/4 gap-8 lg:gap-16">
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
import { useNuxtApp } from "nuxt/app";

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
const { $gsap } = useNuxtApp() as any;

// Register ScrollTrigger
$gsap.registerPlugin($gsap.ScrollTrigger);

// ScrollTrigger timeline refs for cleanup
let logoScrollTrigger: any = null;
let sidebarScrollTrigger: any = null;

const sectionRef = ref<HTMLElement | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);

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
        if (sidebarScrollTrigger && sidebarScrollTrigger.scrollTrigger) {
          sidebarScrollTrigger.scrollTrigger.kill();
        }
        if (sidebarScrollTrigger && sidebarScrollTrigger.kill) {
          sidebarScrollTrigger.kill();
        }
        if (revert) {
          revert();
        }
      });
    });
  });
};

// Initialize sidebar scroll animation
const initializeSidebarAnimation = () => {
  if (!sidebarRef.value || !sectionRef.value) return;

  // Create scroll trigger animation for sidebar movement
  sidebarScrollTrigger = $gsap.fromTo(
    sidebarRef.value,
    {
      y: "0%", // Start position (0%)
    },
    {
      y: "-100%", // Move up by 100% of element height
      ease: "none", // Linear movement with scroll
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top top", // Start when section top reaches viewport top
        end: "bottom top", // End when section bottom reaches viewport top
        scrub: true, // Smooth scrubbing
        pin: false, // Don't pin, just transform
      },
    }
  );
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      sectionRef.value &&
      sectionRef.value.parentElement
    ) {
      setTimeout(() => {
        initializeTitleAnimation();
        initializeSidebarAnimation();
        logoScrollTrigger = $gsap.timeline({
          scrollTrigger: {
            trigger: sectionRef.value?.parentElement,
            start: "top +=100px",
            end: "bottom bottom",
            onEnter: () => {
              store.updateLogoColor(true);
            },
            onLeaveBack: () => {
              store.updateLogoColor(false);
            },
          },
        });
      }, 1000);
    }
  }
);

// Auto-imported composables
</script>
