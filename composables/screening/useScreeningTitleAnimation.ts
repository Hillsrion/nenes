import { nextTick, type Ref } from "vue";
import SplitType from "split-type";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { useHighlightWrapper } from "~/composables/useHighlightWrapper";

interface UseScreeningTitleAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  textRefs: Ref<HTMLElement[]>;
}

export const useScreeningTitleAnimation = ({
  sectionRef,
  textRefs,
}: UseScreeningTitleAnimationOptions) => {
  const { createHighlightWrapper } = useHighlightWrapper();

  const titleAnimations: any[] = [];
  const splitInstances: SplitType[] = [];

  const initializeTitleAnimation = () => {
    if (!textRefs.value.length || !sectionRef.value) {
      return;
    }

    const triggerElement = sectionRef.value.parentElement;
    if (!triggerElement) {
      return;
    }

    textRefs.value.forEach((textElement) => {
      if (!textElement) {
        return;
      }

      const highlightWords = ["9", "cas", "sur", "10"];
      const splitTypeInstance = new SplitType(textElement, {
        types: "lines,words",
        lineClass: "split-line",
        wordClass: "split-word",
        splitClass: "split-text",
        tagName: "span",
      });

      splitInstances.push(splitTypeInstance);

      nextTick(() => {
        if (!splitTypeInstance?.lines?.length) {
          return;
        }

        const highlightWrapper = createHighlightWrapper(
          textElement,
          highlightWords,
          "/images/selection.svg"
        );

        const titleAnimationTimeline = gsap.timeline();
        titleAnimationTimeline.fromTo(
          splitTypeInstance.lines,
          {
            opacity: 0.4,
          },
          {
            opacity: 1,
            ease: "power2.out",
            stagger: 0.05,
          }
        );

        const titleScrollTrigger = ScrollTrigger.create({
          trigger: triggerElement,
          start: "top 80%",
          end: "center center",
          scrub: 1,
          animation: titleAnimationTimeline,
          onUpdate: (self) => {
            if (self.progress > 0.8 && highlightWrapper) {
              highlightWrapper.classList.add("revealed");
            }
          },
        });

        titleAnimations.push(titleAnimationTimeline);
        titleAnimations.push(titleScrollTrigger);
      });
    });
  };

  const cleanupTitleAnimation = () => {
    titleAnimations.forEach((animation) => {
      if (animation?.kill) {
        animation.kill();
      }
    });

    splitInstances.forEach((instance) => {
      instance?.revert?.();
    });

    titleAnimations.splice(0, titleAnimations.length);
    splitInstances.splice(0, splitInstances.length);
  };

  return {
    initializeTitleAnimation,
    cleanupTitleAnimation,
  };
};
