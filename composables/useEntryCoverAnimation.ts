import { ref, watch, onUnmounted, nextTick } from "vue";
import type { Ref } from "vue";
import { useAnimationsStore } from "../stores";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/**
 * Entry cover image animation composable
 * Handles the complex image positioning and scaling animations
 */

interface EntryCoverAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  entryCoverRef: Ref<HTMLElement | null>;
  statisticsTextRef: Ref<HTMLElement | null>;
  // scrollContainer?: Ref<HTMLElement | Window>; // New prop, removed as Lenis will handle the scrolling context
}

export const useEntryCoverAnimation = ({
  sectionRef,
  entryCoverRef,
  statisticsTextRef,
}: // scrollContainer = ref(window), // Default to window, removed as Lenis will handle the scrolling context
EntryCoverAnimationOptions) => {
  // Animation state
  const isCoverFullyVisible = ref(false);

  // Animation references
  let imageAnimationTimeline: gsap.core.Timeline | null = null;
  let imageScrollTrigger: ScrollTrigger | null = null;

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
    // const viewportHeight = window.innerHeight; // Not used

    // Use document.documentElement.clientHeight as a fallback if innerHeight seems wrong
    // const actualViewportHeight =
    //   viewportHeight > 2000
    //     ? document.documentElement.clientHeight
    //     : viewportHeight; // Not used

    // Since the image is fixed positioned and covers the full viewport,
    // we need to calculate the offset to center it on the target point horizontally
    // Keep it vertically centered (translateY = 0) so it stays in viewport center
    const translateX = targetX - viewportWidth / 2;

    // Apply translation using GSAP so it composes with ScrollTrigger scale
    gsap.set(imageElement, { x: translateX });

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
   * Create animation for entry cover image with its own ScrollTrigger
   */
  const createEntryCoverAnimation = () => {
    if (!entryCoverRef.value || !statisticsTextRef.value || !sectionRef.value)
      return;

    console.log(
      "useEntryCoverAnimation: Creating entry cover animation timeline and ScrollTrigger."
    );

    // Get initial position and set up the image
    const initialPos = calculateImagePosition();
    if (initialPos.x !== 0 || initialPos.y !== 0) {
      positionImageAtCenter(entryCoverRef.value, initialPos.x, initialPos.y);
    }

    // Precompute target max scale once (based on initial split center)
    const initialCenterX = initialPos.x;
    const initialViewportWidth = window.innerWidth;
    const initialHorizontalOffset = Math.abs(
      initialCenterX - initialViewportWidth / 2
    );
    const initialCoverageIncrease =
      (2 * initialHorizontalOffset) / initialViewportWidth;
    const maxScale = 1 + initialCoverageIncrease + 0.05; // small aesthetic extra

    // Initialize image to invisible and scaled to 0
    gsap.set(entryCoverRef.value, {
      opacity: 0,
      transformOrigin: "center center",
      scale: 0,
    });

    // Create the timeline for image animation
    imageAnimationTimeline = gsap.timeline();

    // Fade in and start scaling at 0.4 of its own timeline duration
    imageAnimationTimeline.to(
      entryCoverRef.value,
      {
        opacity: 1,
        duration: 0.05,
        ease: "none",
      },
      0.4
    );

    // Scale up as words move apart (0.42 to 0.72 of its own timeline duration)
    imageAnimationTimeline.to(
      entryCoverRef.value,
      {
        scale: maxScale,
        duration: 0.3, // Duration relative to this timeline
        ease: "power2.out",
      },
      0.42
    );

    // Create a separate ScrollTrigger for this animation
    imageScrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: "top top",
      end: "bottom top",
      scrub: 0.5,
      animation: imageAnimationTimeline, // Link the new timeline to this ScrollTrigger
      onUpdate: (self: ScrollTrigger) => {
        // Get the current progress of THIS ScrollTrigger's linked animation
        const tweenProgress = self.progress; // self.progress directly relates to the animation progress
        const scaleValue = tweenProgress * maxScale; // Scale based on ScrollTrigger's progress

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
        console.log(
          `useEntryCoverAnimation: onUpdate - progress: ${self.progress.toFixed(
            2
          )}, direction: ${self.direction}, start: ${self.start}, end: ${
            self.end
          }`
        );
      },
      markers: true, // Keep markers for debugging
      // scroller: scrollContainer.value, // Use the passed scrollContainer, removed as Lenis will handle the scrolling context
    });
    console.log(
      `useEntryCoverAnimation: ScrollTrigger created - id: ${imageScrollTrigger.vars.id}, trigger: ${imageScrollTrigger.trigger}, start: ${imageScrollTrigger.vars.start}, end: ${imageScrollTrigger.vars.end}`
    );
  };

  /**
   * Initialize entry cover animation
   */
  const initializeAnimation = () => {
    if (sectionRef.value && entryCoverRef.value && statisticsTextRef.value) {
      console.log("useEntryCoverAnimation: initializeAnimation called.");
      // Ensure GSAP and ScrollTrigger are registered (defensive, should be in plugin)
      gsap.registerPlugin(ScrollTrigger);

      createEntryCoverAnimation();

      // Extra-stable refresh on iOS after layout settles
      nextTick(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            console.log(
              "useEntryCoverAnimation: Performing ScrollTrigger.refresh() (double rAF)."
            );
            ScrollTrigger.refresh();
          });
        });
      });
    }
  };

  /**
   * Cleanup animation
   */
  const cleanup = () => {
    console.log("useEntryCoverAnimation: Cleaning up animations.");
    // Clear any pending position updates
    if (positionUpdateTimeout) {
      clearTimeout(positionUpdateTimeout);
      positionUpdateTimeout = null;
    }

    // Clean up GSAP animations and ScrollTrigger
    if (imageScrollTrigger) {
      imageScrollTrigger.kill();
      imageScrollTrigger = null;
    }
    if (imageAnimationTimeline) {
      imageAnimationTimeline.kill();
      imageAnimationTimeline = null;
    }
  };

  // Lifecycle hook for cleanup
  onUnmounted(() => {
    cleanup();
  });

  return {
    isCoverFullyVisible,
    initializeAnimation,
    cleanup,
  };
};
