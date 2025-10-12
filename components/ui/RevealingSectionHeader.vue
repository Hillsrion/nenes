<template>
  <section class="h-[200svh] relative z-20" ref="sectionRef">
    <div
      class="h-[100svh] w-full sticky top-0 flex flex-col justify-center items-center px-8 overflow-hidden"
      ref="stickyContainerRef"
    >
      <div ref="contentRef" class="text-center max-w-4xl mx-auto">
        <h2
          ref="titleRef"
          class="text-4xl md:text-5xl font-medium text-primary leading-title"
        >
          {{ title }}
        </h2>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onUnmounted, watch, nextTick, computed } from "vue";
import SplitType from "split-type";
import { useAnimationsStore } from "../../stores";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

interface Props {
  title: string;
  parentSection?: HTMLElement;
}

/**
 * RevealingSectionHeader Component
 *
 * A sticky full viewport component that reveals content with sophisticated text animations:
 * - First line scales down from 3x and fades in
 * - Subsequent lines fade in with staggered timing
 * - Content maintains vertical centering as lines appear
 * - Uses SplitType for precise text splitting by lines and words
 * - Animations trigger when parent section (with bg-secondary-light) reaches viewport top
 *
 * Props:
 * - title: The text content to animate (can be multi-line)
 * - parentSection: Optional parent section element to use as scroll trigger
 *                  If not provided, automatically finds parent with bg-secondary-light class
 *
 * Usage:
 * <RevealingSectionHeader title="Your Title Here" />
 * <RevealingSectionHeader title="Your Title Here" :parent-section="parentRef" />
 *
 * The component integrates with the animation store and triggers animations
 * when the loading sequence completes and the parent section hits the viewport top.
 */

// Define props with proper typing for template access
const props = defineProps<Props>();

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();

// Refs
const sectionRef = ref<HTMLElement | null>(null);
const stickyContainerRef = ref<HTMLElement | null>(null);
const contentRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);

// Computed trigger element (parent section or current section)
const triggerElement = computed(() => {
  // If parentSection prop is provided, use it
  if (props.parentSection) {
    return props.parentSection;
  }

  // Otherwise, try to find parent with bg-secondary-light class
  if (sectionRef.value) {
    let parent = sectionRef.value.parentElement;
    while (parent && !parent.classList.contains("bg-secondary-light")) {
      parent = parent.parentElement;
    }
    if (parent) {
      return parent;
    }
  }

  // Fallback to current section
  return sectionRef.value;
});

// Animation instances
let splitTypeInstance: SplitType | null = null;
let firstLineAnimation: any = null;
let linesAnimation: any = null;
let centeringAnimation: any = null;

// Split text into lines and words
const initializeSplitText = () => {
  if (!titleRef.value) return;

  // Revert previous split if exists
  if (splitTypeInstance) {
    splitTypeInstance.revert();
  }

  splitTypeInstance = new SplitType(titleRef.value, {
    types: "lines",
    lineClass: "split-line",
    wordClass: "split-word",
    tagName: "span",
  });
};

// First line animation (scale and opacity)
const initializeFirstLineAnimation = () => {
  if (!splitTypeInstance?.lines?.length || !triggerElement.value) return;

  const firstLine = splitTypeInstance.lines[0];

  firstLineAnimation = $gsap.fromTo(
    firstLine,
    {
      scale: 3,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration: 1.2,
      ease: "power2.out",
      scrollTrigger: {
        trigger: triggerElement.value,
        start: "top top",
        end: "top bottom",
        scrub: 1,
        markers: true,
      },
    }
  );
};

// Animate subsequent lines and maintain vertical centering
const initializeLinesAnimation = () => {
  if (
    !splitTypeInstance?.lines ||
    splitTypeInstance.lines.length <= 1 ||
    !triggerElement.value
  )
    return;

  const lines = splitTypeInstance.lines.slice(1); // Skip first line (already animated)
  const container = contentRef.value;
  if (!container) return;

  // Calculate total height for centering
  const calculateTotalHeight = () => {
    if (!splitTypeInstance?.lines) return 0;

    let totalHeight = 0;
    splitTypeInstance.lines.forEach((line) => {
      const lineHeight = line.offsetHeight;
      const marginBottom = parseFloat(getComputedStyle(line).marginBottom) || 0;
      totalHeight += lineHeight + marginBottom;
    });
    return totalHeight;
  };

  linesAnimation = $gsap.fromTo(
    lines,
    {
      opacity: 0,
      y: 50,
    },
    {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.15,
      scrollTrigger: {
        trigger: triggerElement.value,
        start: "top center+=100px",
        end: "bottom center",
        scrub: 1,
        onUpdate: (self) => {
          // Update vertical centering based on progress
          const progress = self.progress;
          const visibleLines = Math.floor(progress * lines.length) + 1; // +1 for first line

          if (visibleLines > 1 && container && splitTypeInstance?.lines) {
            const totalHeight = calculateTotalHeight();
            const containerHeight = container.offsetHeight;
            const offset = (containerHeight - totalHeight) / 2;

            centeringAnimation = $gsap.to(container, {
              y: -offset,
              duration: 0.3,
              ease: "power2.out",
            });
          }
        },
      },
    }
  );
};

// Initialize all animations
const initializeAnimations = () => {
  if (!triggerElement.value) return;

  nextTick(() => {
    initializeSplitText();
    initializeFirstLineAnimation();
    initializeLinesAnimation();
  });
};

// Watch for loading state to start animations
watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && triggerElement.value) {
      initializeAnimations();
    }
  }
);

// Cleanup animations
onUnmounted(() => {
  if (splitTypeInstance) {
    splitTypeInstance.revert();
  }

  [firstLineAnimation, linesAnimation, centeringAnimation].forEach(
    (animation) => {
      if (animation) {
        if (animation.scrollTrigger) {
          animation.scrollTrigger.kill();
        }
        if (animation.kill) {
          animation.kill();
        }
      }
    }
  );
});
</script>

<style scoped>
/* Split text styling */
.split-line {
  display: block;
  overflow: visible;
}

.split-word {
  display: inline-block;
}

/* Ensure proper spacing for split text */
.split-line + .split-line {
  margin-top: 0.5em;
}
</style>
