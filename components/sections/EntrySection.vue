<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Entry Cover Image -->
    <img
      ref="entryCoverRef"
      src="/images/entry-cover.jpg"
      alt="Entry Cover"
      class="fixed z-5 pointer-events-none"
      style="
        width: 100vw;
        height: 100vh;
        transform-origin: center center;
        object-fit: cover;
        will-change: transform;
        top: 0;
        left: 0;
      "
    />

    <!-- Statistics Section -->
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1" />
    <div
      class="relative h-[300svh] w-full min-h-screen bg-white transition-all duration-300 ease-out rounded-t-4xl"
      ref="whiteSectionRef"
      :class="{ 'rounded-t-4xl': !isLoadingComplete }"
    >
      <Logo
        class="fixed top-8 left-1/2 transform -translate-x-1/2"
        :color="
          isCoverFullyVisible
            ? 'var(--color-nenes-pink-light)'
            : 'var(--color-primary)'
        "
      />
      <div
        class="max-w-[42rem] h-[100svh] w-full px-8 sticky top-0 left-1/2 transform -translate-x-1/2 z-10 mx-auto flex flex-col justify-center"
      >
        <div
          ref="statisticsTextRef"
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative"
        >
          <span
            v-for="(line, index) in statisticsText"
            :key="index"
            class="inline-block"
          >
            <template v-if="index === statisticsText.length - 1">
              <!-- Split last line: first word goes left, rest goes right -->
              <span class="inline-block animate-split-word-left mr-2.75">{{
                getFirstWord(line)
              }}</span>
              <span class="inline-block animate-split-word-right">{{
                getRemainingWords(line)
              }}</span>
            </template>
            <template v-else>
              {{ line }}
            </template>
          </span>
        </div>
      </div>

      <!-- Main Content Section (appears after statistics) -->
      <div class="max-w-6xl w-full mx-auto px-8 relative mt-32">
        <div class="mt-24">
          <div class="flex flex-col gap-6">
            <div
              v-for="(element, index) in contentElements"
              :key="index"
              class="opacity-0 translate-y-8 transition-all duration-700 ease-out"
              :class="{
                'opacity-100 translate-y-0 animate-slide-up': isVisible,
              }"
              :style="{ animationDelay: `${index * 0.2}s` }"
            >
              <component :is="element.type" v-bind="element.props">
                {{ element.content }}
              </component>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ScrollIndicator
      text="scroll"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary"
    />
  </section>
</template>

<script setup>
import Logo from "~/components/ui/Logo.vue";
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";
// Use global GSAP instance (should be available through Nuxt GSAP module)
const { $gsap } = useNuxtApp();

const props = defineProps({
  backgroundGradient: {
    type: String,
    default: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  },

  // Statistics props
  statisticsText: {
    type: Array,
    default: () => [],
  },
  isLoadingComplete: {
    type: Boolean,
    default: false,
  },

  // Content props
  contentElements: {
    type: Array,
    default: () => [],
  },
});

const { sectionRef, isVisible } = useSectionVisibility(0.2);
const whiteSectionRef = ref(null);
const statisticsTextRef = ref(null);
const entryCoverRef = ref(null);

// Helper functions to split the last line
const getFirstWord = (line) => {
  const words = line.trim().split(/\s+/);
  return words.length > 0 ? words[0] : "";
};

const getRemainingWords = (line) => {
  const words = line.trim().split(/\s+/);
  return words.length > 1 ? words.slice(1).join(" ") : "";
};

// GSAP ScrollTriggers for statistics section
let fadeTrigger = null;
let positionTrigger = null;
let coverTrigger = null;
let imageAnimation = null;

// Animation state
const firstTwoLinesFaded = ref(false);
const lastLineCentered = ref(false);

// Computed properties for statistics section
const isCoverFullyVisible = ref(false);

// Initialize ScrollTriggers on mount
onMounted(() => {
  console.log("Component mounted, checking conditions...");
  console.log("sectionRef available:", !!sectionRef.value);
  console.log("statisticsText length:", props.statisticsText.length);

  if (sectionRef.value && props.statisticsText.length > 0) {
    // Initialize all text to full opacity first
    initializeStatisticsText();

    // Create separate ScrollTriggers for each animation
    createFadeTrigger();
    createPositionTrigger();
    imageAnimation = createEntryCoverAnimation();
    createCoverTrigger();

    console.log("ScrollTriggers created");
  } else {
    console.log("Conditions not met for ScrollTrigger creation");
  }
});

// Initialize statistics text to full opacity
const initializeStatisticsText = () => {
  if (statisticsTextRef.value) {
    const textSpans = statisticsTextRef.value.children;
    // Initialize all spans to full opacity
    $gsap.set(textSpans, { opacity: 1 });

    // Also initialize the split words to their starting position (center)
    const lastLineIndex = textSpans.length - 1;
    if (lastLineIndex >= 0) {
      const lastLineSpan = textSpans[lastLineIndex];
      const splitWordLeft = lastLineSpan.children[0]; // First child
      const splitWordRight = lastLineSpan.children[1]; // Second child

      if (splitWordLeft && splitWordRight) {
        $gsap.set([splitWordLeft, splitWordRight], {
          opacity: 1,
          x: 0, // Start at center position
        });
      }
    }
  }
};

// Create separate ScrollTrigger for fading all lines except the last one
const createFadeTrigger = () => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const allLinesExceptLast = Array.from(textSpans).slice(0, -1); // Every line except the last one

  fadeTrigger = $gsap.to(allLinesExceptLast, {
    opacity: 0,
    duration: 0.05, // Ultra fast fade
    ease: "none",
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top bottom", // Start immediately when scrolling begins
      end: "top 20%", // End when section is well into viewport
      scrub: 1, // Instant scrubbing for immediate fade
      onUpdate: (self) => {
        // Track fade state
        firstTwoLinesFaded.value = self.progress > 0.8;
      },
    },
  });
};

// Create separate ScrollTrigger for last line position (split animation)
const createPositionTrigger = () => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const lastLineIndex = textSpans.length - 1;

  if (lastLineIndex >= 0) {
    // Get the split parts of the last line
    const lastLineSpan = textSpans[lastLineIndex];
    const splitWordLeft = lastLineSpan.children[0]; // First child
    const splitWordRight = lastLineSpan.children[1]; // Second child

    if (splitWordLeft && splitWordRight) {
      // Calculate the center position dynamically for Y movement
      const calculateCenterY = () => {
        if (!statisticsTextRef.value || !lastLineSpan) return 0;

        const parentHeight = statisticsTextRef.value.offsetHeight;
        const lineHeight = lastLineSpan.offsetHeight;
        const centerY = (parentHeight - lineHeight) / 2;

        return -centerY; // Negative because we're moving up
      };

      // First: Animate vertical centering (Y movement only)
      const centerTrigger = $gsap.to([splitWordLeft, splitWordRight], {
        y: calculateCenterY, // Center vertically
        duration: 0.5,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top 15%", // Start right after fade animation
          end: "top 8%", // Complete Y movement with small delay before X starts
          scrub: 0.3, // Smooth scrubbing
        },
      });

      // Second: Animate horizontal split after Y movement is complete (with delay)
      positionTrigger = $gsap.to(splitWordLeft, {
        x: "-150vw", // Move completely out of viewport to the left
        duration: 3,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top 6%", // Start after delay when Y movement is complete
          end: "top -40%", // Much more scroll distance for very gradual exit
          scrub: 0.8, // Even smoother scrubbing
        },
      });

      const rightWordTrigger = $gsap.to(splitWordRight, {
        x: "150vw", // Move completely out of viewport to the right
        duration: 3,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top 6%", // Start after delay when Y movement is complete
          end: "top -40%", // Much more scroll distance for very gradual exit
          scrub: 0.8, // Even smoother scrubbing
        },
      });

      // Store all triggers for cleanup (center trigger + both position triggers)
      positionTrigger = [centerTrigger, positionTrigger, rightWordTrigger];
    }
  }
};

// Create animation for entry cover image
const createEntryCoverAnimation = () => {
  if (!entryCoverRef.value || !statisticsTextRef.value) return;

  // Utility function to get the center position between two DOM elements
  const getCenterBetweenElements = (element1, element2) => {
    if (!element1 || !element2) return { x: 0, y: 0 };

    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    // Calculate the center point between the two elements
    const centerX = (rect1.right + rect2.left) / 2;
    const centerY = (rect1.top + rect1.bottom + rect2.top + rect2.bottom) / 4;

    return { x: centerX, y: centerY };
  };

  // Enhanced function to calculate the exact center position between splitting words
  const calculateImagePosition = () => {
    if (!statisticsTextRef.value) return { x: 0, y: 0, width: 0, height: 0 };

    const lastLineSpan =
      statisticsTextRef.value.children[
        statisticsTextRef.value.children.length - 1
      ];
    if (!lastLineSpan) return { x: 0, y: 0, width: 0, height: 0 };

    const splitWordLeft = lastLineSpan.children[0];
    const splitWordRight = lastLineSpan.children[1];

    if (!splitWordLeft || !splitWordRight)
      return { x: 0, y: 0, width: 0, height: 0 };

    // Get center position between the two words
    const centerPos = getCenterBetweenElements(splitWordLeft, splitWordRight);

    // Debug logging to understand the position calculation
    console.log("Word positions:", {
      leftWord: splitWordLeft.getBoundingClientRect(),
      rightWord: splitWordRight.getBoundingClientRect(),
      centerPos,
      viewport: { width: window.innerWidth, height: window.innerHeight },
    });

    // Calculate the distance between words to determine initial image size
    const leftRect = splitWordLeft.getBoundingClientRect();
    const rightRect = splitWordRight.getBoundingClientRect();
    const wordDistance = rightRect.left - leftRect.right;
    const initialImageSize = Math.max(wordDistance * 2, 100); // Start at least 100px wide

    return {
      x: centerPos.x,
      y: centerPos.y,
      width: initialImageSize,
      height: initialImageSize,
    };
  };

  // Function to position image so its center aligns with the target position
  const positionImageAtCenter = (imageElement, targetX, targetY, scale = 0) => {
    if (!imageElement) return;

    // Get actual viewport dimensions (not document dimensions)
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Use document.documentElement.clientHeight as a fallback if innerHeight seems wrong
    const actualViewportHeight =
      viewportHeight > 2000
        ? document.documentElement.clientHeight
        : viewportHeight;

    // Since the image is fixed positioned and covers the full viewport,
    // we need to calculate the offset to center it on the target point
    // The image is already at (0,0) with 100vw x 100vh size
    const translateX = targetX - viewportWidth / 2;
    const translateY = targetY - actualViewportHeight / 2;

    // Apply the transform to position the image correctly
    imageElement.style.transform = `translate(${translateX}px, ${0}px) scale(${scale})`;

    // Debug logging to understand positioning
    console.log("Image positioning:", {
      targetX,
      targetY,
      viewportWidth,
      viewportHeight,
      actualViewportHeight,
      translateX,
      translateY,
      scale,
      bodyRect: document.body.getBoundingClientRect(),
    });
  };

  // Throttle function to avoid excessive calculations during scroll
  let positionUpdateTimeout = null;
  const throttledPositionUpdate = (
    imageElement,
    targetX,
    targetY,
    scale = 0
  ) => {
    if (positionUpdateTimeout) return;

    positionUpdateTimeout = setTimeout(() => {
      positionImageAtCenter(imageElement, targetX, targetY, scale);
      positionUpdateTimeout = null;
    }, 16); // ~60fps
  };

  // Get initial position and set up the image
  const initialPos = calculateImagePosition();
  if (initialPos.x !== 0 || initialPos.y !== 0) {
    positionImageAtCenter(entryCoverRef.value, initialPos.x, initialPos.y);
  }

  // Animation: scale from 0 to full size while staying centered between words
  const imageAnimation = $gsap.fromTo(
    entryCoverRef.value,
    {
      scale: 0,
      opacity: 1,
      transformOrigin: "center center",
    },
    {
      scale: 1,
      opacity: 1,
      duration: 4.5,
      ease: "power2.out",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "60px 10%", // Start when words begin horizontal splitting
        end: "top -30%", // End much later for longer animation
        scrub: 0.8,
        onUpdate: (self) => {
          // Simple scroll-based scaling with built-in delay
          // Scale from 0 to 1 over the trigger range, but with a delayed start
          const progress = self.progress;

          // Add a delay - only start scaling after 60% of the trigger progress
          const delayedProgress = Math.max(0, progress - 0.6);

          // Scale grows from the delayed progress point
          const scaleValue = Math.min(delayedProgress, 1); // Faster scaling after delay

          // Get current position for image placement
          const currentPos = calculateImagePosition();

          // Continuously update position to stay centered between moving words
          try {
            if (currentPos && (currentPos.x !== 0 || currentPos.y !== 0)) {
              throttledPositionUpdate(
                entryCoverRef.value,
                currentPos.x,
                currentPos.y,
                scaleValue
              );
            }
          } catch (error) {
            console.warn("Error updating image position:", error);
          }
        },
      },
    }
  );

  // Store the animation reference for cleanup
  return imageAnimation;
};

// Create separate ScrollTrigger for cover visibility
const createCoverTrigger = () => {
  coverTrigger = $gsap.to(
    {},
    {
      duration: 1,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top 10%", // Start right after position animation
        end: "bottom 80%", // End before section leaves viewport
        scrub: 0.3, // Faster scrubbing for visibility change
        onUpdate: (self) => {
          isCoverFullyVisible.value = self.progress > 0.2;
        },
      },
    }
  );
};

// Cleanup on unmount
onUnmounted(() => {
  // Clear any pending position updates
  if (positionUpdateTimeout) {
    clearTimeout(positionUpdateTimeout);
    positionUpdateTimeout = null;
  }

  if (fadeTrigger) {
    fadeTrigger.kill();
    fadeTrigger = null;
  }
  if (positionTrigger) {
    // Handle both single trigger and array of triggers
    if (Array.isArray(positionTrigger)) {
      positionTrigger.forEach((trigger) => trigger.kill());
    } else {
      positionTrigger.kill();
    }
    positionTrigger = null;
  }
  if (imageAnimation) {
    imageAnimation.kill();
    imageAnimation = null;
  }
  if (coverTrigger) {
    coverTrigger.kill();
    coverTrigger = null;
  }
});
</script>

<style scoped>
/* Split word animations */
.animate-split-word-left,
.animate-split-word-right {
  display: inline-block;
  will-change: transform;
}

@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1 gap-6;
  }

  .absolute {
    @apply static transform-none mb-8;
  }

  .mx-auto {
    @apply mt-8;
  }
}
</style>
