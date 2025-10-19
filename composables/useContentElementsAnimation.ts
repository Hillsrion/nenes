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

    // Initialize all elements to invisible and scaled down
    textRefs.value.forEach((el, index) => {
      if (el) {
        $gsap.set(el, {
          opacity: 0,
          scale: index > 0 ? 1 : 0.5,
          transformOrigin: "center center",
        });
      }
    });

    // Calculate timing for each element
    // Timeline runs from 0 to 1, start exactly when image starts scaling (0.4)
    // Available timeline space: 0.4 to 1.0 = 0.6
    const numberOfElements = textRefs.value.length;
    const availableTimelineSpace = 0.6; // From 0.4 to 1.0
    const spacePerElement = availableTimelineSpace / numberOfElements;

    // Each element gets equal time in the timeline
    const fadeInDuration = spacePerElement * 0.15; // 15% of element time for fade in
    const holdDuration = spacePerElement * 0.7; // 70% of element time for hold
    const fadeOutDuration = spacePerElement * 0.15; // 15% of element time for fade out
    const elementCycleDuration = spacePerElement;

    // Start position in timeline (exactly when image starts scaling at 0.4)
    const startPosition = 0.4;

    // Create sequential animations for each element
    textRefs.value.forEach((el, index) => {
      if (!el) return;

      const elementStartTime = startPosition + index * elementCycleDuration;

      // Offset for scale animation (scale starts after opacity begins)
      const scaleOffset = fadeInDuration * 2; // Scale starts 30% into fade-in

      // Fade in
      timeline.to(
        el,
        {
          opacity: 1,
          duration: fadeInDuration,
          ease: "power2.out",
        },
        elementStartTime
      );

      // Scale up (only for the first element, with longer duration)
      if (index === 0) {
        timeline.to(
          el,
          {
            scale: 1,
            duration: fadeInDuration * 2.5, // Much longer duration
            ease: "back.out(1.2)", // Bouncy ease for more dynamic feel
          },
          elementStartTime + scaleOffset
        );
      } else {
        // For other elements, scale instantly to 1
        timeline.to(
          el,
          {
            scale: 1,
            duration: 0.01,
            ease: "none",
          },
          elementStartTime
        );
      }

      // Hold (implicit - just the duration between fade in and fade out)

      // Fade out (keep scale at 1)
      timeline.to(
        el,
        {
          opacity: 0,
          scale: 1,
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
