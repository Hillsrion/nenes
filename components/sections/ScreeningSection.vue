<template>
  <section
    class="flex items-center justify-center bg-white rounded-t-4xl sticky top-0 z-30 py-27"
    ref="sectionRef"
  >
    <div
      class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12 origin-top"
      ref="containerRef"
    >
      <!-- Main content -->
      <div class="flex-1 lg:w-3/5">
        <div class="max-w-2xl">
          <p
            :ref="setTitleRef"
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
                  :ref="(el) => setLastImageRef(el, index)"
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
let fadeOutScrollTrigger: any = null;

const sectionRef = ref<HTMLElement | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);
const lastImageRef = ref<HTMLImageElement | null>(null);

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

// Set last image ref function
const setLastImageRef = (el: any, index: number) => {
  if (
    el instanceof HTMLImageElement &&
    index === props.sidebarElements.length - 1
  ) {
    lastImageRef.value = el;
  }
};

// Set title ref function
const setTitleRef = (el: any) => {
  if (el) {
    titleRef.value = el;
    setTextRef(el, 0);
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
        if (fadeOutScrollTrigger && fadeOutScrollTrigger.scrollTrigger) {
          fadeOutScrollTrigger.scrollTrigger.kill();
        }
        if (fadeOutScrollTrigger && fadeOutScrollTrigger.kill) {
          fadeOutScrollTrigger.kill();
        }
        if (revert) {
          revert();
        }
      });
    });
  });
};

// Initialize fade out animation for the container
const initializeFadeOutAnimation = () => {
  if (!containerRef.value || !sidebarRef.value) return;

  // Get all sidebar elements except the last one
  const sidebarElements = Array.from(sidebarRef.value.children);
  const otherElements = sidebarElements.slice(0, -1); // All except last

  // Get the last element's title and paragraph
  const lastElement = sidebarElements[sidebarElements.length - 1];
  const lastElementTitle = lastElement?.querySelector("h3");
  const lastElementParagraph = lastElement?.querySelector("p");

  // Create timeline for fade out sequence
  fadeOutScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: containerRef.value,
      start: "center top", // Start where sidebar animation ends
      end: "bottom top", // End when section bottom reaches viewport top
      scrub: true, // Smooth scrubbing
    },
  });

  // First: fade out other sidebar elements and last element's title/paragraph
  fadeOutScrollTrigger.to(
    [otherElements, lastElementTitle, lastElementParagraph],
    {
      opacity: 0,
      duration: 0.5, // Half the timeline duration
      ease: "power2.out",
    },
    0 // Start at beginning of timeline
  );

  // Then: scale down and fade out the container
  fadeOutScrollTrigger.to(
    containerRef.value,
    {
      scale: 0.5, // Scale down to disappear
      opacity: 0, // Fade out to transparent
      duration: 0.5, // Half the timeline duration
      ease: "power2.out",
    },
    0.5 // Start after the opacity animation
  );
};

// Initialize sidebar scroll animation
const initializeSidebarAnimation = () => {
  if (
    !sidebarRef.value ||
    !sectionRef.value ||
    !titleRef.value ||
    !lastImageRef.value
  )
    return;

  // Calculate the maximum y offset needed to align the last image top with title top
  const titleRect = titleRef.value.getBoundingClientRect();
  const lastImageRect = lastImageRef.value.getBoundingClientRect();
  const sidebarRect = sidebarRef.value.getBoundingClientRect();

  // Calculate how much the sidebar needs to move up so that the last image top aligns with title top
  // The title top is relative to viewport, last image top is relative to its container
  const titleTopRelativeToSidebar = titleRect.top - sidebarRect.top;
  const lastImageTopRelativeToSidebar = lastImageRect.top - sidebarRect.top;

  // The offset needed is the difference between these positions
  const maxOffset = lastImageTopRelativeToSidebar - titleTopRelativeToSidebar;

  // Create scroll trigger animation for sidebar movement
  sidebarScrollTrigger = $gsap.fromTo(
    sidebarRef.value,
    {
      y: 0, // Start position (0px)
    },
    {
      y: -maxOffset, // Move up by calculated offset to align last image with title
      ease: "none", // Linear movement with scroll
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top top", // Start when section top reaches viewport top
        end: "center top", // End when section bottom reaches viewport top
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
        initializeFadeOutAnimation();
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
