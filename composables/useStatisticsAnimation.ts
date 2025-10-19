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

  // GSAP Timeline
  let animationTimeline: any = null;

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
          y: 0, // Start at initial Y position
        });
      }
    }
  };

  /**
   * Calculate the center position dynamically for Y movement
   */
  const calculateCenterY = (lastLineSpan: Element) => {
    if (!statisticsTextRef.value || !lastLineSpan) return 0;

    const parentHeight = (statisticsTextRef.value as HTMLElement).offsetHeight;
    const lineHeight = (lastLineSpan as HTMLElement).offsetHeight;
    const centerY = (parentHeight - lineHeight) / 2;

    return -centerY; // Negative because we're moving up
  };

  /**
   * Create timeline with all animations
   */
  const createAnimationTimeline = () => {
    if (!statisticsTextRef.value || !sectionRef.value) return;

    const { $gsap } = useNuxtApp();
    const textSpans = statisticsTextRef.value.children;
    const allLinesExceptLast = Array.from(textSpans).slice(0, -1);
    const lastLineIndex = textSpans.length - 1;

    if (lastLineIndex < 0) return;

    const lastLineSpan = textSpans[lastLineIndex];
    const splitWordLeft = lastLineSpan.children[0];
    const splitWordRight = lastLineSpan.children[1];

    if (!splitWordLeft || !splitWordRight) return;

    // Create the timeline
    const timeline = $gsap.timeline({
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top top",
        end: "top -300%", // Extended to 300% for longer scroll distance
        scrub: 0.5,
        markers: true,
        onUpdate: (self: any) => {
          // Track animation states
          firstTwoLinesFaded.value = self.progress > 0.1;
          lastLineCentered.value = self.progress > 0.3;
        },
      },
    });

    // Step 1: Fade out all lines except the last one (0-10% of timeline)
    timeline.to(
      allLinesExceptLast,
      {
        opacity: 0,
        ease: "none",
        duration: 0.1,
      },
      0
    );

    // Step 2: Center the last line vertically (10-30% of timeline)
    timeline.to(
      [splitWordLeft, splitWordRight],
      {
        y: () => calculateCenterY(lastLineSpan),
        ease: "none",
        duration: 0.2,
      },
      0.1
    );

    // Step 3: Split the words horizontally (30-100% of timeline)
    timeline.to(
      splitWordLeft,
      {
        x: "-150vw",
        ease: "none",
        duration: 0.7,
      },
      0.4
    );

    timeline.to(
      splitWordRight,
      {
        x: "150vw",
        ease: "none",
        duration: 0.7,
      },
      0.4
    );

    animationTimeline = timeline;
  };

  /**
   * Initialize all statistics animations
   */
  const initializeAnimations = () => {
    if (sectionRef.value && statisticsText.length > 0) {
      // Initialize all text to full opacity first
      initializeStatisticsText();

      // Create the timeline with all animations
      createAnimationTimeline();
    }
  };

  /**
   * Cleanup all animations
   */
  const cleanup = () => {
    if (animationTimeline) {
      try {
        if (animationTimeline.scrollTrigger) {
          animationTimeline.scrollTrigger.kill();
        }
        animationTimeline.kill();
      } catch (error) {
        console.warn("Error cleaning up statistics timeline:", error);
      }
      animationTimeline = null;
    }
  };

  return {
    firstTwoLinesFaded,
    lastLineCentered,
    initializeAnimations,
    cleanup,
    getTimeline: () => animationTimeline,
  };
};
