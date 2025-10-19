import { ref } from "vue";
import type { Ref } from "vue";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

/**
 * Content elements sequential animation composable
 * Handles sequential fade in/out animations for content elements
 */

interface ContentElementsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  textRefs: Ref<any[]>;
  getTimeline?: () => any;
}

export const useContentElementsAnimation = ({
  sectionRef,
  textRefs,
  getTimeline,
}: ContentElementsAnimationOptions) => {
  // Animation reference
  let contentAnimation: any = null;

  /**
   * Create sequential fade in/out animation for content elements
   * Each element fades in, holds, fades out, then the next begins
   */
  const createContentElementsAnimation = () => {
    if (!sectionRef.value || !textRefs.value.length) return;

    // Get the timeline from the statistics animation
    const timeline = getTimeline?.();
    if (!timeline) {
      console.warn("Timeline not available for content elements animation");
      return;
    }

    const { $gsap } = useNuxtApp();

    // Initialize all elements to invisible
    textRefs.value.forEach((el) => {
      if (el) {
        $gsap.set(el, {
          opacity: 0,
          y: 30, // Optional: start slightly below
        });
      }
    });

    // Calculate timing for each element
    // We want the content elements to start animating after the statistics animation completes (at position 1.0)
    const fadeInDuration = 0.15; // Duration to fade in each element
    const holdDuration = 0.5; // Duration to hold each element visible
    const fadeOutDuration = 0.15; // Duration to fade out each element
    const elementCycleDuration =
      fadeInDuration + holdDuration + fadeOutDuration;

    // Start position in timeline (after statistics animation completes)
    let startPosition = 1.0;

    // Create sequential animations for each element
    textRefs.value.forEach((el, index) => {
      if (!el) return;

      const elementStartTime = startPosition + index * elementCycleDuration;

      // Fade in
      timeline.to(
        el,
        {
          opacity: 1,
          y: 0,
          duration: fadeInDuration,
          ease: "power2.out",
        },
        elementStartTime
      );

      // Hold (implicit - just the duration between fade in and fade out)

      // Fade out
      timeline.to(
        el,
        {
          opacity: 0,
          y: -30, // Optional: exit slightly above
          duration: fadeOutDuration,
          ease: "power2.in",
        },
        elementStartTime + fadeInDuration + holdDuration
      );
    });

    // Store the animation reference for cleanup
    return contentAnimation;
  };

  /**
   * Initialize content elements animation
   */
  const initializeAnimation = () => {
    if (sectionRef.value && textRefs.value.length) {
      contentAnimation = createContentElementsAnimation();
    }
  };

  /**
   * Cleanup animation
   */
  const cleanup = () => {
    // Clean up GSAP animations
    if (contentAnimation) {
      try {
        contentAnimation.kill();
      } catch (error) {
        console.warn("Error cleaning up content elements animation:", error);
      }
      contentAnimation = null;
    }
  };

  return {
    initializeAnimation,
    cleanup,
  };
};
