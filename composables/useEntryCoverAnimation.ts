import { ref, watch } from "vue";
import type { Ref } from "vue";
import { useAnimationsStore } from "../stores";

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
  getTimeline?: () => any;
}

export const useEntryCoverAnimation = ({
  sectionRef,
  entryCoverRef,
  statisticsTextRef,
  getTimeline,
}: EntryCoverAnimationOptions) => {
  // Animation state
  const isCoverFullyVisible = ref(false);

  // Animation reference
  let imageAnimation: any = null;

  // Animations store
  const animationsStore = useAnimationsStore();

  // Scale value ref to track current scale
  const currentScale = ref(0);

  // Watch for scale changes and update logo color when scale reaches 1
  watch(currentScale, (newScale) => {
    if (animationsStore) {
      animationsStore.updateLogoColor(newScale <= 0.3);

      // Update cover scaling state based on scale value
      // Consider the cover as "scaling" when scale > 0.1 (just starting to scale)
      animationsStore.updateCoverScaling(newScale > 0.1);
    }
  });

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
    // console.log("Word positions:", {
    //   leftWord: splitWordLeft.getBoundingClientRect(),
    //   rightWord: splitWordRight.getBoundingClientRect(),
    //   centerPos,
    //   viewport: { width: window.innerWidth, height: window.innerHeight },
    // });

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
    // we need to calculate the offset to center it on the target point horizontally
    // Keep it vertically centered (translateY = 0) so it stays in viewport center
    const translateX = targetX - viewportWidth / 2;

    // Apply translation using GSAP so it composes with ScrollTrigger scale
    const { $gsap } = useNuxtApp();
    $gsap.set(imageElement, { x: translateX });

    // // Debug logging to understand positioning
    // console.log("Image positioning:", {
    //   targetX,
    //   targetY,
    //   viewportWidth,
    //   viewportHeight,
    //   actualViewportHeight,
    //   translateX,
    //   translateY,
    //   scale,
    //   bodyRect: document.body.getBoundingClientRect(),
    // });
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
   * Adds the cover animation to the existing statistics timeline
   */
  const createEntryCoverAnimation = () => {
    if (!entryCoverRef.value || !statisticsTextRef.value || !sectionRef.value)
      return;

    // Get the timeline from the statistics animation
    const timeline = getTimeline?.();
    if (!timeline) {
      console.warn("Timeline not available for cover animation");
      return;
    }

    // Get initial position and set up the image
    const initialPos = calculateImagePosition();
    if (initialPos.x !== 0 || initialPos.y !== 0) {
      positionImageAtCenter(entryCoverRef.value, initialPos.x, initialPos.y);
    }

    // Precompute target max scale once (based on initial split center)
    const { $gsap } = useNuxtApp();
    const initialCenterX = initialPos.x;
    const initialViewportWidth = window.innerWidth;
    const initialHorizontalOffset = Math.abs(
      initialCenterX - initialViewportWidth / 2
    );
    const initialCoverageIncrease =
      (2 * initialHorizontalOffset) / initialViewportWidth;
    const maxScale = 1 + initialCoverageIncrease + 0.05; // small aesthetic extra

    // Initialize image to invisible and scaled to 0
    $gsap.set(entryCoverRef.value, {
      opacity: 0,
      transformOrigin: "center center",
      scale: 0,
    });

    // Add cover animation to the timeline, synchronized with word split (30-100% of timeline)
    // Fade in and start scaling slightly before words split (at 25%)
    timeline.to(
      entryCoverRef.value,
      {
        opacity: 1,
        duration: 0.05,
        ease: "none",
      },
      0.4
    );

    // Scale up as words move apart (25-100% of timeline = 75% duration)
    imageAnimation = timeline.to(
      entryCoverRef.value,
      {
        scale: maxScale,
        duration: 0.75,
        ease: "power2.out",
        onUpdate: function () {
          // Get the current progress of THIS tween within the timeline
          const tweenProgress = this.progress();
          const scaleValue = tweenProgress * maxScale;

          // Update the current scale ref so the watcher can detect changes
          currentScale.value = scaleValue;

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
      0.4
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
