import { ref, onMounted, onUnmounted, nextTick } from "vue";
import type { Ref } from "vue";
import { gsap } from "gsap"; // Import gsap directly
import { ScrollTrigger } from "gsap/ScrollTrigger"; // Import ScrollTrigger directly

/**
 * Statistics text animation composable
 * Handles fade and position animations for statistics text
 */

interface StatisticsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  statisticsTextRef: Ref<HTMLElement | null>;
  statisticsText: string[];
  // scrollContainer?: Ref<HTMLElement | Window>; // New prop, removed as Lenis will handle the scrolling context
}

export const useStatisticsAnimation = ({
  sectionRef,
  statisticsTextRef,
  statisticsText,
}: StatisticsAnimationOptions) => {
  // Animation state
  const firstTwoLinesFaded = ref(false);
  const lastLineCentered = ref(false);

  // GSAP Timeline and ScrollTrigger instance
  let animationTimeline: gsap.core.Timeline | null = null;
  let mainScrollTrigger: ScrollTrigger | null = null;

  /**
   * Initialize statistics text to full opacity and correct split word positions
   */
  const initializeStatisticsText = () => {
    if (!statisticsTextRef.value) return;

    console.log("useStatisticsAnimation: Initializing statistics text.");

    const textSpans = statisticsTextRef.value.children;
    // Initialize all spans to full opacity
    gsap.set(textSpans, { opacity: 1 });

    // Also initialize the split words to their starting position (center)
    const lastLineIndex = textSpans.length - 1;
    if (lastLineIndex >= 0) {
      const lastLineSpan = textSpans[lastLineIndex];
      const splitWordLeft = lastLineSpan.children[0]; // First child
      const splitWordRight = lastLineSpan.children[1]; // Second child

      if (splitWordLeft && splitWordRight) {
        gsap.set([splitWordLeft, splitWordRight], {
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
   * Create the main animation timeline and a separate ScrollTrigger
   */
  const createAnimationTimeline = () => {
    if (!statisticsTextRef.value || !sectionRef.value) return;

    console.log(
      "useStatisticsAnimation: Creating animation timeline and ScrollTrigger."
    );

    const textSpans = statisticsTextRef.value.children;
    const allLinesExceptLast = Array.from(textSpans).slice(0, -1);
    const lastLineIndex = textSpans.length - 1;

    if (lastLineIndex < 0) return;

    const lastLineSpan = textSpans[lastLineIndex];
    const splitWordLeft = lastLineSpan.children[0];
    const splitWordRight = lastLineSpan.children[1];

    if (!splitWordLeft || !splitWordRight) return;

    // Create the timeline without a ScrollTrigger property
    animationTimeline = gsap.timeline();

    // Step 1: Fade out all lines except the last one (0-10% of timeline)
    animationTimeline.to(
      allLinesExceptLast,
      {
        opacity: 0,
        ease: "none",
        duration: 0.1,
      },
      0
    );

    // Step 2: Center the last line vertically (10-30% of timeline)
    animationTimeline.to(
      [splitWordLeft, splitWordRight],
      {
        y: () => calculateCenterY(lastLineSpan),
        ease: "none",
        duration: 0.2,
      },
      0.1
    );

    // Step 3: Split the words horizontally (40-70% of timeline)
    animationTimeline.to(
      splitWordLeft,
      {
        x: "-150vw",
        ease: "none",
        duration: 0.5,
      },
      0.4
    );

    animationTimeline.to(
      splitWordRight,
      {
        x: "150vw",
        ease: "none",
        duration: 0.5,
      },
      0.4
    );

    // Create a separate ScrollTrigger instance and link it to the timeline
    mainScrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      animation: animationTimeline, // Link the timeline to this ScrollTrigger
      onUpdate: (self: ScrollTrigger) => {
        // Track animation states based on timeline progress
        firstTwoLinesFaded.value = self.progress > 0.1;
        lastLineCentered.value = self.progress > 0.3;
        // Log update information
        console.log(
          `useStatisticsAnimation: onUpdate - progress: ${self.progress.toFixed(
            2
          )}, direction: ${self.direction}, scrollTop: ${
            self.scroller.scrollTop
          }, start: ${self.start}, end: ${self.end}`
        );
      },
      // scroller: scrollContainer.value, // Use the passed scrollContainer, removed as Lenis will handle the scrolling context
    });
    console.log(
      `useStatisticsAnimation: ScrollTrigger created - id: ${mainScrollTrigger.vars.id}, trigger: ${mainScrollTrigger.trigger}, start: ${mainScrollTrigger.vars.start}, end: ${mainScrollTrigger.vars.end}`
    );
  };

  /**
   * Initialize all statistics animations
   */
  const initializeAnimations = () => {
    if (sectionRef.value && statisticsText.length > 0) {
      console.log("useStatisticsAnimation: initializeAnimations called.");
      // Ensure GSAP and ScrollTrigger are registered (defensive, should be in plugin)
      gsap.registerPlugin(ScrollTrigger);

      // Initialize text visibility first
      initializeStatisticsText();

      // Create the timeline with all animations
      createAnimationTimeline();

      // Extra-stable refresh on iOS after layout settles
      nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log(
              "useStatisticsAnimation: Performing ScrollTrigger.refresh() (double rAF)."
            );
            ScrollTrigger.refresh();
          });
        });
      });
    }
  };

  /**
   * Cleanup all animations
   */
  const cleanup = () => {
    console.log("useStatisticsAnimation: Cleaning up animations.");
    if (mainScrollTrigger) {
      mainScrollTrigger.kill();
      mainScrollTrigger = null;
    }
    if (animationTimeline) {
      animationTimeline.kill();
      animationTimeline = null;
    }
  };

  // Lifecycle hooks for cleanup
  onUnmounted(() => {
    cleanup();
  });

  return {
    firstTwoLinesFaded,
    lastLineCentered,
    initializeAnimations,
    cleanup,
    getTimeline: () => animationTimeline, // Still expose timeline for now
  };
};
