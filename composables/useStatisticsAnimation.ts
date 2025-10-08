import { ref } from "vue";
import type { Ref } from "vue";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

/**
 * Statistics text animation composable
 * Handles fade and position animations for statistics text
 */

interface StatisticsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  statisticsTextRef: Ref<HTMLElement | null>;
  statisticsText: string[];
}

export const useStatisticsAnimation = ({
  sectionRef,
  statisticsTextRef,
  statisticsText,
}: StatisticsAnimationOptions) => {
  // Animation state
  const firstTwoLinesFaded = ref(false);
  const lastLineCentered = ref(false);

  // GSAP ScrollTriggers
  let fadeTrigger: any = null;
  let positionTrigger: any = null;

  /**
   * Initialize statistics text to full opacity
   */
  const initializeStatisticsText = () => {
    if (!statisticsTextRef.value) return;

    const { $gsap } = useNuxtApp();
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
        const { $gsap } = useNuxtApp();
        $gsap.set([splitWordLeft, splitWordRight], {
          opacity: 1,
          x: 0, // Start at center position
        });
      }
    }
  };

  /**
   * Create separate ScrollTrigger for fading all lines except the last one
   */
  const createFadeTrigger = () => {
    if (!statisticsTextRef.value || !sectionRef.value) return;

    const { $gsap } = useNuxtApp();
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
        onUpdate: (self: any) => {
          // Track fade state
          firstTwoLinesFaded.value = self.progress > 0.8;
        },
      },
    });
  };

  /**
   * Create separate ScrollTrigger for last line position (split animation)
   */
  const createPositionTrigger = () => {
    if (!statisticsTextRef.value || !sectionRef.value) return;

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

          const parentHeight = (statisticsTextRef.value as HTMLElement)
            .offsetHeight;
          const lineHeight = (lastLineSpan as HTMLElement).offsetHeight;
          const centerY = (parentHeight - lineHeight) / 2;

          return -centerY; // Negative because we're moving up
        };

        // First: Animate vertical centering (Y movement only)
        const { $gsap } = useNuxtApp();
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
        const leftWordTrigger = $gsap.to(splitWordLeft, {
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
        positionTrigger = [centerTrigger, leftWordTrigger, rightWordTrigger];
      }
    }
  };

  /**
   * Initialize all statistics animations
   */
  const initializeAnimations = () => {
    if (sectionRef.value && statisticsText.length > 0) {
      // Initialize all text to full opacity first
      initializeStatisticsText();

      // Create separate ScrollTriggers for each animation
      createFadeTrigger();
      createPositionTrigger();
    }
  };

  /**
   * Cleanup all animations
   */
  const cleanup = () => {
    // Clean up ScrollTriggers
    [fadeTrigger, positionTrigger].forEach((trigger) => {
      if (trigger) {
        try {
          if (Array.isArray(trigger)) {
            trigger.forEach((t) => {
              if (t && t.scrollTrigger) {
                t.scrollTrigger.kill();
              }
              if (t && t.kill) {
                t.kill();
              }
            });
          } else {
            if (trigger.scrollTrigger) {
              trigger.scrollTrigger.kill();
            }
            if (trigger.kill) {
              trigger.kill();
            }
          }
        } catch (error) {
          console.warn("Error cleaning up statistics ScrollTrigger:", error);
        }
      }
    });

    fadeTrigger = null;
    positionTrigger = null;
  };

  return {
    firstTwoLinesFaded,
    lastLineCentered,
    initializeAnimations,
    cleanup,
  };
};
