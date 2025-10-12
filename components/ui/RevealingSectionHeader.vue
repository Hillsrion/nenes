<template>
  <div
    class="h-[100svh] w-full sticky top-0 flex flex-col justify-center items-center px-8 overflow-hidden"
    ref="stickyContainerRef"
  >
    <div ref="contentRef" class="text-center max-w-4xl mx-auto">
      <h2
        ref="titleRef"
        class="text-4xl md:text-5xl font-medium text-primary leading-title"
        v-html="title"
      ></h2>
    </div>
  </div>
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
 * - First line scales down from 3x and fades in, centered as if alone
 * - Subsequent lines reveal word by word with opacity changes only (no Y translation)
 * - Container moves up dynamically to keep visible content centered
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
let timelineAnimation: any = null;

// Split text into lines and words
const initializeSplitText = () => {
  if (!titleRef.value) return;

  // Revert previous split if exists
  if (splitTypeInstance) {
    splitTypeInstance.revert();
  }

  splitTypeInstance = new SplitType(titleRef.value, {
    types: "lines,words",
    lineClass: "split-line",
    wordClass: "split-word",
    tagName: "span",
  });
};

// Combined timeline animation for all lines
const initializeTimelineAnimation = () => {
  if (!splitTypeInstance?.lines?.length || !triggerElement.value) return;

  const allLines = splitTypeInstance.lines;
  const container = contentRef.value;
  if (!container) return;

  // Organize words by line for subsequent lines
  const lineWordGroups: HTMLElement[][] = [];
  if (allLines.length > 1) {
    const subsequentLines = allLines.slice(1);
    subsequentLines.forEach((line) => {
      const words = Array.from(
        line.querySelectorAll(".split-word")
      ) as HTMLElement[];
      if (words.length > 0) {
        lineWordGroups.push(words);
        // Set initial state for words to 0 opacity
        $gsap.set(words, { opacity: 0 });
      }
    });
  }

  // Set initial container position with percentage-based transform
  // Moving down by 50% naturally centers the first line
  $gsap.set(container, { yPercent: 50 });

  // Create a timeline that controls the entire animation sequence
  const tl = $gsap.timeline({
    scrollTrigger: {
      trigger: triggerElement.value,
      start: "top top",
      end: "center 30%",
      scrub: 1,
    },
  });

  // First line animation: scale down and fade in (stays centered)
  tl.fromTo(
    allLines[0],
    {
      scale: 3,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      duration: 0.5,
      ease: "power2.out",
    },
    0 // Start at beginning of timeline
  );

  // Animate subsequent lines with coupled container movement
  if (lineWordGroups.length > 0) {
    const numLines = lineWordGroups.length;
    const yPercentPerLine = 50 / numLines; // Divide movement equally among lines
    let currentTime = 0.5; // Start after first line scale animation

    lineWordGroups.forEach((words, lineIndex) => {
      // Calculate yPercent values for this line's reveal
      const yPercentFrom = 50 - yPercentPerLine * lineIndex;
      const yPercentTo = 50 - yPercentPerLine * (lineIndex + 1);

      // Animate this line's words
      tl.to(
        words,
        {
          opacity: 1,
          duration: 0.4,
          ease: "power2.out",
          stagger: 0.06, // Stagger between words in this line
        },
        currentTime
      );

      // Simultaneously move container up by one "step"
      tl.to(
        container,
        {
          yPercent: yPercentTo,
          duration: 0.4,
          ease: "power2.out",
        },
        currentTime
      );

      // Advance time for next line
      currentTime += 0.4;
    });
  }

  // Store the timeline reference for cleanup
  timelineAnimation = tl;
};

// Initialize all animations
const initializeAnimations = () => {
  if (!triggerElement.value) return;

  nextTick(() => {
    initializeSplitText();
    initializeTimelineAnimation();
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
  // Clean up split text (this will also reset the styling)
  if (splitTypeInstance) {
    splitTypeInstance.revert();
  }

  // Clean up timeline animations
  if (timelineAnimation) {
    if (timelineAnimation.scrollTrigger) {
      timelineAnimation.scrollTrigger.kill();
    }
    if (timelineAnimation.kill) {
      timelineAnimation.kill();
    }
  }
});
</script>

<style scoped>
/* Split text styling */
.split-line {
  display: block;
  overflow: visible;
  text-align: center;
  transition: height 0.3s ease, margin 0.3s ease;
}

.split-word {
  display: inline-block;
}

/* Ensure proper spacing for split text */
.split-line + .split-line {
  margin-top: 0.5em;
}
</style>
