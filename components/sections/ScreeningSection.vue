<template>
  <div class="lg:h-[150svh] relative">
    <section
      class="flex h-screen items-center justify-center bg-white transition-all duration-300 ease-out sticky top-0 z-30"
      :class="{ 'rounded-t-4xl': !isAtTop }"
      ref="sectionRef"
    >
      <div
        class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12 origin-top h-[100svh] lg:py-27 sm:py-20 py-14"
        ref="containerRef"
      >
        <!-- Main content -->
        <div class="flex-1 lg:w-3/5">
          <div class="max-w-2xl">
            <p
              :ref="setTitleRef"
              class="text-primary font-medium text-2xl xs:text-3xl md:text-4xl lg:text-5xl leading-title mb-8"
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
                  <picture :ref="(el) => setLastImageRef(el, index)">
                    <!-- Mobile (<=767px) -->
                    <source
                      type="image/avif"
                      media="(max-width: 767px)"
                      :srcset="element.image.replace('.jpg', '_mobile.avif')"
                      sizes="100vw"
                    />
                    <source
                      type="image/webp"
                      media="(max-width: 767px)"
                      :srcset="element.image.replace('.jpg', '_mobile.webp')"
                      sizes="100vw"
                    />
                    <!-- Tablet (768-820px) - using regular -->
                    <source
                      type="image/avif"
                      media="(min-width: 768px) and (max-width: 820px)"
                      :srcset="element.image.replace('.jpg', '_regular.avif')"
                      sizes="100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 768px) and (max-width: 820px)"
                      :srcset="element.image.replace('.jpg', '_regular.webp')"
                      sizes="100vw"
                    />
                    <!-- Medium tablet (821-1024px) -->
                    <source
                      type="image/avif"
                      media="(min-width: 821px) and (max-width: 1024px)"
                      :srcset="element.image.replace('.jpg', '_tablet.avif')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 821px) and (max-width: 1024px)"
                      :srcset="element.image.replace('.jpg', '_tablet.webp')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <!-- Desktop (>1024px) - using regular -->
                    <source
                      type="image/avif"
                      media="(min-width: 1025px)"
                      :srcset="element.image.replace('.jpg', '_regular.avif')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 1025px)"
                      :srcset="element.image.replace('.jpg', '_regular.webp')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <img
                      :src="element.image.replace('.jpg', '_regular.webp')"
                      :alt="element.title"
                      loading="lazy"
                      class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      width="312"
                      height="468"
                    />
                  </picture>
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
import { useHighlightWrapper } from "~/composables/useHighlightWrapper";

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

// Composables
const { createHighlightWrapper } = useHighlightWrapper();

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
let topScrollTrigger: any = null;
let mm: any = null; // matchMedia instance

const sectionRef = ref<HTMLElement | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);
const lastImageRef = ref<HTMLImageElement | null>(null);

// Track if section is at top (sticky)
const isAtTop = ref(false);

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
  if (el instanceof HTMLElement && index === props.sidebarElements.length - 1) {
    lastImageRef.value = el.querySelector("img");
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

    // Define the words to highlight
    const highlightWords = ["9", "cas", "sur", "10"];

    const splitTypeInstance = new SplitType(textElement, {
      types: "lines,words",
      lineClass: "split-line",
      wordClass: "split-word",
      splitClass: "split-text",
      tagName: "span",
    });

    const split = splitTypeInstance;
    splitInstances.push(splitTypeInstance);

    // Set initial state and create scroll trigger animation
    nextTick(() => {
      if (!split?.lines?.length) return;
      
      // Use composable to find and wrap highlighted words
      const highlightWrapper = createHighlightWrapper(
        textElement,
        highlightWords,
        '/images/selection.svg'
      );
      
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
            onUpdate: (self) => {
              // Reveal the SVG when the animation progresses past 80%
              if (self.progress > 0.8 && highlightWrapper) {
                highlightWrapper.classList.add('revealed');
              }
            },
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

// Initialize scroll trigger to track when section reaches top
const initializeTopTracking = () => {
  if (!sectionRef.value) {
    return;
  }

  // Use the section itself as trigger for consistency
  topScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top top",
      end: "bottom top",
      onEnter: () => {
        isAtTop.value = true;
      },
      onLeaveBack: () => {
        isAtTop.value = false;
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
        initializeTopTracking();

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

  // Clean up top tracking scroll trigger
  if (topScrollTrigger && topScrollTrigger.scrollTrigger) {
    topScrollTrigger.scrollTrigger.kill();
  }
  if (topScrollTrigger && topScrollTrigger.kill) {
    topScrollTrigger.kill();
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

<style scoped>
.selection-highlight {
  position: relative;
  display: inline-block;
}

.selection-highlight .selection-svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% + 30px);
  height: 160%;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.6s ease 0.3s;
}

.selection-highlight.revealed .selection-svg {
  opacity: 1;
}

.selection-highlight .split-word {
  position: relative;
  z-index: 1;
}
</style>
