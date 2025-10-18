<template>
  <div class="h-[150svh] relative">
    <section
      class="flex h-screen items-center justify-center bg-white rounded-t-4xl sticky top-0 z-30"
      ref="sectionRef"
    >
      <div
        class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12 origin-top h-[100svh] py-27"
        ref="containerRef"
      >
        <!-- Main content -->
        <div class="flex-1 lg:w-3/5">
          <div class="max-w-2xl">
            <p
              :ref="setTitleRef"
              class="text-primary font-medium text-3xl md:text-4xl lg:text-5xl leading-title mb-8"
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
                  class="text-primary uppercase leading-title lg:text-base text-sm tracking-title-sm"
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
  </div>
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

// Utility function to convert vh percentage to px string
const vh = (percentage: number): string => {
  if (percentage < 0 || percentage > 100) {
    throw new Error("Percentage must be between 0 and 100");
  }
  const viewportHeight = window.innerHeight;
  const pixels = (viewportHeight * percentage) / 100;
  return `${Math.round(pixels)}px`;
};

// ScrollTrigger timeline refs for cleanup
let logoScrollTrigger: any = null;
let sidebarScrollTrigger: any = null;
let fadeOutScrollTrigger: any = null;
let mm: any = null; // matchMedia instance

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

// Store animations and split instances for cleanup
const titleAnimations: any[] = [];
const splitInstances: any[] = [];

// Initialize split text animation for title with 50% starting opacity
const initializeTitleAnimation = () => {
  if (!textRefs.value.length || !sectionRef.value) return;

  const triggerElement = sectionRef.value.parentElement;
  if (!triggerElement) {
    console.warn(
      "initializeTitleAnimation: sectionRef.parentElement not found"
    );
    return;
  }

  textRefs.value.forEach((textElement) => {
    if (!textElement) return;

    const splitTypeInstance = new SplitType(textElement, {
      types: "lines",
      lineClass: "split-line",
      splitClass: "split-text",
      tagName: "span",
    });

    const split = splitTypeInstance;
    splitInstances.push(splitTypeInstance);

    // Set initial state and create scroll trigger animation
    nextTick(() => {
      if (!split?.lines?.length) return;
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
            trigger: triggerElement,
            start: "top 80%", // Start when section enters viewport
            end: "center center", // End when section reaches center
            scrub: 1, // Smooth scrubbing
          },
        }
      );

      titleAnimations.push(titleAnimation);
    });
  });
};

// Initialize logo scroll trigger for color change
const initializeLogoColorChangeAnimation = () => {
  if (!sectionRef.value?.parentElement) {
    return;
  }

  logoScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value.parentElement,
      start: "top top+100px",
      end: "bottom bottom",
      onEnter: () => {
        store.updateLogoColor(true);
      },
      onLeaveBack: () => {
        store.updateLogoColor(false);
      },
      onEnterBack: () => {
        store.updateLogoColor(true);
      },
    },
  });
};

// Initialize fade out animation for the container
const initializeFadeOutAnimation = () => {
  if (!containerRef.value || !sidebarRef.value || !sectionRef.value) return;

  // Get all sidebar elements except the last one
  const sidebarElements = Array.from(sidebarRef.value.children);
  const otherElements = sidebarElements.slice(0, -1); // All except last

  // Get the last element's title and paragraph
  const lastElement = sidebarElements[sidebarElements.length - 1];
  const lastElementTitle = lastElement?.querySelector("h3");
  const lastElementParagraph = lastElement?.querySelector("p");

  // Build array of elements to animate, filtering out null/undefined values
  const elementsToFade = [...otherElements];
  if (lastElementTitle) elementsToFade.push(lastElementTitle);
  if (lastElementParagraph) elementsToFade.push(lastElementParagraph);

  // First ScrollTrigger: fade out other sidebar elements and last element's title/paragraph
  if (elementsToFade.length > 0) {
    $gsap.to(elementsToFade, {
      opacity: 0,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: `center top+=${vh(20)}`, // Start 26vh after center reaches top
        end: `bottom top+=${vh(35)}`, // End when section bottom reaches viewport top
        scrub: true, // Smooth scrubbing
      },
    });
  }

  // Second ScrollTrigger: scale down and fade out the container
  $gsap.to(containerRef.value, {
    scale: 0.7, // Scale down to disappear
    opacity: 0, // Fade out to transparent
    y: vh(30),
    ease: "power2.out",
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "center top", // Start 200px before sidebar animation ends
      end: "bottom top", // End when section bottom reaches viewport top
      scrub: true, // Smooth scrubbing
    },
  });
};

// Initialize sidebar scroll animation
const initializeSidebarAnimation = () => {
  if (
    !sidebarRef.value ||
    !sectionRef.value ||
    !titleRef.value ||
    !lastImageRef.value ||
    !containerRef.value
  )
    return;

  // Ensure parentElement exists and is a valid element
  const triggerElement = containerRef.value.parentElement;
  if (!triggerElement) {
    console.warn(
      "initializeSidebarAnimation: containerRef.parentElement not found"
    );
    return;
  }

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
        trigger: triggerElement,
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
        // Always initialize these animations (all screen sizes)
        initializeLogoColorChangeAnimation();
        initializeTitleAnimation();

        // Initialize matchMedia for desktop-only animations
        mm = $gsap.matchMedia();

        mm.add("(min-width: 1024px)", () => {
          // Desktop-only animations
          initializeSidebarAnimation();
          initializeFadeOutAnimation();
        });
      }, 1000);
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  // Revert matchMedia (this will automatically clean up all animations and ScrollTriggers created within it)
  if (mm) {
    mm.revert();
  }

  // Clean up title animations
  titleAnimations.forEach((anim) => {
    if (anim && anim.scrollTrigger) {
      anim.scrollTrigger.kill();
    }
    if (anim && anim.kill) {
      anim.kill();
    }
  });

  // Clean up split instances
  splitInstances.forEach((instance) => {
    if (instance && instance.revert) {
      instance.revert();
    }
  });

  // Clean up logo scroll trigger
  if (logoScrollTrigger && logoScrollTrigger.scrollTrigger) {
    logoScrollTrigger.scrollTrigger.kill();
  }
  if (logoScrollTrigger && logoScrollTrigger.kill) {
    logoScrollTrigger.kill();
  }

  // Clean up sidebar scroll trigger
  if (sidebarScrollTrigger && sidebarScrollTrigger.scrollTrigger) {
    sidebarScrollTrigger.scrollTrigger.kill();
  }
  if (sidebarScrollTrigger && sidebarScrollTrigger.kill) {
    sidebarScrollTrigger.kill();
  }

  // Clean up fade out scroll trigger
  if (fadeOutScrollTrigger && fadeOutScrollTrigger.scrollTrigger) {
    fadeOutScrollTrigger.scrollTrigger.kill();
  }
  if (fadeOutScrollTrigger && fadeOutScrollTrigger.kill) {
    fadeOutScrollTrigger.kill();
  }
});

// Auto-imported composables
</script>
