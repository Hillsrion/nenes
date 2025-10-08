import { ref } from "vue";
import type { Ref } from "vue";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

/**
 * Entry cover image animation composable
 * Handles the complex image positioning and scaling animations
 */

interface EntryCoverAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  entryCoverRef: Ref<HTMLElement | null>;
  statisticsTextRef: Ref<HTMLElement | null>;
}

export const useEntryCoverAnimation = ({
  sectionRef,
  entryCoverRef,
  statisticsTextRef,
}: EntryCoverAnimationOptions) => {
  // Animation state
  const isCoverFullyVisible = ref(false);

  // Animation reference
  let imageAnimation: any = null;

  /**
   * Utility function to get the center position between two DOM elements
   */
  const getCenterBetweenElements = (element1: Element, element2: Element) => {
    if (!element1 || !element2) return { x: 0, y: 0 };

    const rect1 = element1.getBoundingClientRect();
    const rect2 = element2.getBoundingClientRect();

    // Calculate the center point between the two elements
    const centerX = (rect1.right + rect2.left) / 2;
    const centerY = (rect1.top + rect1.bottom + rect2.top + rect2.bottom) / 4;

    return { x: centerX, y: centerY };
  };

  /**
   * Enhanced function to calculate the exact center position between splitting words
   */
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

  /**
   * Function to position image so its center aligns with the target position
   */
  const positionImageAtCenter = (
    imageElement: HTMLElement | null,
    targetX: number,
    targetY: number,
    scale = 0
  ) => {
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

  /**
   * Throttle function to avoid excessive calculations during scroll
   */
  let positionUpdateTimeout: number | null = null;
  const throttledPositionUpdate = (
    imageElement: HTMLElement | null,
    targetX: number,
    targetY: number,
    scale = 0
  ) => {
    if (positionUpdateTimeout) return;

    positionUpdateTimeout = window.setTimeout(() => {
      positionImageAtCenter(imageElement, targetX, targetY, scale);
      positionUpdateTimeout = null;
    }, 16); // ~60fps
  };

  /**
   * Create animation for entry cover image
   */
  const createEntryCoverAnimation = () => {
    if (!entryCoverRef.value || !statisticsTextRef.value || !sectionRef.value)
      return;

    // Get initial position and set up the image
    const initialPos = calculateImagePosition();
    if (initialPos.x !== 0 || initialPos.y !== 0) {
      positionImageAtCenter(entryCoverRef.value, initialPos.x, initialPos.y);
    }

    const screenRatio = Math.min(
      window.innerWidth / initialPos.width,
      window.innerHeight / initialPos.height
    );

    // Animation: scale from 0 to full size while staying centered between words
    const { $gsap } = useNuxtApp();
    imageAnimation = $gsap.fromTo(
      entryCoverRef.value,
      {
        scale: 0,
        opacity: 1,
        transformOrigin: "center center",
      },
      {
        scale: 1.25,
        opacity: 1,
        duration: 4.5,
        ease: "power2.out",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "65px 10%", // Start when words begin horizontal splitting
          end: "top -30%", // End much later for longer animation
          scrub: 0.8,
          onUpdate: (self: any) => {
            // Simple scroll-based scaling with built-in delay
            // Scale from 0 to 1 over the trigger range, but with a delayed start
            const progress = self.progress;

            // Add a delay - only start scaling after 60% of the trigger progress
            const delayedProgress = Math.max(0, progress - 0.6);

            // Scale grows from the delayed progress point
            const scaleValue = Math.min(delayedProgress, 1); // Faster scaling after delay
            console.log("Scale value:", scaleValue);

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

  /**
   * Initialize entry cover animation
   */
  const initializeAnimation = () => {
    if (sectionRef.value && entryCoverRef.value && statisticsTextRef.value) {
      imageAnimation = createEntryCoverAnimation();
    }
  };

  /**
   * Cleanup animation
   */
  const cleanup = () => {
    // Clear any pending position updates
    if (positionUpdateTimeout) {
      clearTimeout(positionUpdateTimeout);
      positionUpdateTimeout = null;
    }

    // Clean up GSAP animations
    if (imageAnimation) {
      try {
        imageAnimation.kill();
      } catch (error) {
        console.warn("Error cleaning up image animation:", error);
      }
      imageAnimation = null;
    }
  };

  return {
    isCoverFullyVisible,
    initializeAnimation,
    cleanup,
  };
};
