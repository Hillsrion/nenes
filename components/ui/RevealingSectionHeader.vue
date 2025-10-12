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

// Calculate visible height based on word opacities
const calculateVisibleHeight = () => {
  if (!splitTypeInstance?.lines) return 0;

  let visibleHeight = 0;

  splitTypeInstance.lines.forEach((line, lineIndex) => {
    const lineHeight = line.offsetHeight;
    const marginBottom = parseFloat(getComputedStyle(line).marginBottom) || 0;

    if (lineIndex === 0) {
      // First line is always fully visible
      visibleHeight += lineHeight + marginBottom;
    } else {
      // For subsequent lines, check word opacities
      const words = Array.from(
        line.querySelectorAll(".split-word")
      ) as HTMLElement[];
      if (words.length > 0) {
        // Get average opacity of words in this line
        const avgOpacity =
          words.reduce((sum, word) => {
            const opacity = parseFloat(getComputedStyle(word).opacity) || 0;
            return sum + opacity;
          }, 0) / words.length;

        // Add proportional height based on visibility
        if (avgOpacity > 0) {
          visibleHeight += (lineHeight + marginBottom) * avgOpacity;
        }
      }
    }
  });

  return visibleHeight;
};

// Update container position to keep content centered
const updateCentering = () => {
  const container = contentRef.value;
  if (!container) return;

  const visibleHeight = calculateVisibleHeight();
  const viewportHeight = window.innerHeight;

  // Calculate offset to center the visible content
  const offset =
    (viewportHeight - visibleHeight) / 2 -
    container.getBoundingClientRect().top;

  $gsap.to(container, {
    y: offset,
    duration: 0.1,
    ease: "none",
    overwrite: "auto",
  });
};

// Combined timeline animation for all lines
const initializeTimelineAnimation = () => {
  if (!splitTypeInstance?.lines?.length || !triggerElement.value) return;

  const allLines = splitTypeInstance.lines;
  const container = contentRef.value;
  if (!container) return;

  // Collect all words from subsequent lines first
  let allSubsequentWords: HTMLElement[] = [];
  if (allLines.length > 1) {
    const subsequentLines = allLines.slice(1);
    subsequentLines.forEach((line) => {
      const words = Array.from(
        line.querySelectorAll(".split-word")
      ) as HTMLElement[];
      allSubsequentWords = allSubsequentWords.concat(words);
    });

    // Set initial state for subsequent words to 0 opacity
    // This must happen BEFORE calculating initial offset
    $gsap.set(allSubsequentWords, {
      opacity: 0,
    });
  }

  // Calculate how much to shift container up so first line appears centered
  // The container currently has all lines, so it's centered on the full block
  // We need to shift it up to center on just the first line
  const calculateInitialOffset = () => {
    if (!allLines[0] || !container) return 0;

    // Calculate total height of all subsequent lines (they're invisible but take space)
    let subsequentLinesHeight = 0;
    if (allLines.length > 1) {
      for (let i = 1; i < allLines.length; i++) {
        const line = allLines[i] as HTMLElement;
        subsequentLinesHeight += line.offsetHeight;
        const marginBottom =
          parseFloat(getComputedStyle(line).marginBottom) || 0;
        subsequentLinesHeight += marginBottom;
      }
    }

    // Shift container up by half the height of invisible lines
    // This centers the first line as if it were alone
    return -subsequentLinesHeight / 2;
  };

  // Set initial container position to center first line only
  const initialOffset = calculateInitialOffset();
  $gsap.set(container, { y: initialOffset });

  // Create a timeline that controls the entire animation sequence
  const tl = $gsap.timeline({
    scrollTrigger: {
      trigger: triggerElement.value,
      start: "top top",
      end: "center 30%",
      scrub: 1,
      onUpdate: () => {
        // Update centering on every scroll update to account for revealing content
        updateCentering();
      },
    },
  });

  // First line animation: scale down and fade in
  tl.fromTo(
    allLines[0],
    {
      scale: 3,
      opacity: 0,
    },
    {
      scale: 1,
      opacity: 1,
      ease: "power2.out",
    },
    0 // Start at beginning of timeline
  );

  // Subsequent lines animation - word by word with opacity only
  if (allSubsequentWords.length > 0) {
    // Animate words with staggered opacity only
    tl.to(
      allSubsequentWords,
      {
        opacity: 1,
        duration: 0.6,
        ease: "power2.out",
        stagger: 0.08, // Stagger between each word
      },
      0.6 // Start after first line begins to appear
    );
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
