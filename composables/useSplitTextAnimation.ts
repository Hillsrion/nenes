import { ref, nextTick, onUnmounted } from "vue";
import type { Ref } from "vue";
import SplitType from "split-type";

// Nuxt composables are auto-imported
declare const useNuxtApp: () => { $gsap: any };

/**
 * Split text animation composable
 * Handles split text animations for content elements
 */

interface SplitTextAnimationOptions {
  textRefs: Ref<HTMLElement[]>;
  sectionRef?: Ref<HTMLElement | null>;
}

export const useSplitTextAnimation = ({
  textRefs,
  sectionRef,
}: SplitTextAnimationOptions) => {
  // Split text triggers and instances
  const splitTextTriggers = ref<any[]>([]);
  const splitInstances = ref<SplitType[]>([]);

  /**
   * Set text ref for split text animation
   */
  const setTextRef = (el: HTMLElement | null, index: number) => {
    if (el) {
      textRefs.value[index] = el;
    }
  };

  /**
   * Initialize split text animations for content elements
   */
  const initializeSplitTextAnimations = () => {
    if (!textRefs.value.length) return;

    textRefs.value.forEach((textElement) => {
      if (!textElement) return;

      // Find the <p> element within the div
      const paragraph = textElement.querySelector("p");
      if (!paragraph) return;

      const splitTypeInstance = new SplitType(paragraph, {
        types: "lines",
        lineClass: "split-line",
        splitClass: "split-text",
        tagName: "span",
      });

      const split = splitTypeInstance;

      // Store the split instance for cleanup
      splitInstances.value.push(splitTypeInstance);

      // Set initial state: all lines visible (natural state)
      nextTick(() => {
        if (!split?.lines?.length || !sectionRef?.value) return;
        const { $gsap } = useNuxtApp();

        // Create scroll trigger using sectionRef as trigger for all line animations
        const mainTrigger = $gsap.fromTo(
          split.lines,
          {
            opacity: 0,
          },
          {
            opacity: 1,
            duration: 0.3, // Much shorter duration for faster fade-in
            ease: "power2.out",
            stagger: 0.05, // Faster stagger for quicker sequence
            scrollTrigger: {
              trigger: sectionRef.value,
              start: "top 0",
              end: "center 80%",
              scrub: 1,
            },
          }
        );
        splitTextTriggers.value.push(mainTrigger);
      });
    });
  };

  /**
   * Initialize animations after next tick
   */
  const initializeAnimations = () => {
    nextTick(() => {
      initializeSplitTextAnimations();
    });
  };

  /**
   * Cleanup all split text animations
   */
  const cleanup = () => {
    // Clean up split text triggers
    splitTextTriggers.value.forEach((trigger) => {
      try {
        if (trigger && trigger.scrollTrigger) {
          trigger.scrollTrigger.kill();
        }
        if (trigger && trigger.kill) {
          trigger.kill();
        }
      } catch (error) {
        console.warn("Error cleaning up GSAP animation:", error);
      }
    });
    splitTextTriggers.value = [];

    // Clean up split text instances
    splitInstances.value.forEach((instance) => {
      try {
        if (instance && instance.revert) {
          instance.revert();
        }
      } catch (error) {
        console.warn("Error reverting split text instance:", error);
      }
    });
    splitInstances.value = [];
  };

  // Register cleanup on unmount at the top level
  onUnmounted(() => {
    cleanup();
  });

  return {
    setTextRef,
    initializeAnimations,
    cleanup,
  };
};
