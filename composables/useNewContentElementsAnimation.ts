import type { Ref } from "vue";

declare const useNuxtApp: () => { $gsap: any };

interface ContentElementsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  stageRef: Ref<HTMLElement | null>;
  onEnter: () => void;
  textRefs: Ref<HTMLElement[]>;
}

export const useNewContentElementsAnimation = ({
  sectionRef,
  stageRef,
  onEnter,
  textRefs,
}: ContentElementsAnimationOptions) => {
  let timeline: any = null;

  const initializeAnimation = () => {
    const section = sectionRef.value;
    const stage = stageRef.value;
    const elements = textRefs.value.filter(Boolean);
    if (!section || !stage || !elements.length) return;

    const { $gsap } = useNuxtApp();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    $gsap.set(elements, { autoAlpha: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 30 });

    timeline = $gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        invalidateOnRefresh: true,
        onEnter,
        onEnterBack: onEnter,
        onRefresh: (trigger: { isActive: boolean }) => {
          if (trigger.isActive) onEnter();
        },
      },
    });

    if (!reducedMotion) {
      elements.forEach((element, index) => {
        timeline.to(element, {
          autoAlpha: 1,
          y: 0,
          duration: 0.34,
          ease: "power2.out",
        }, 0.18 + index * 0.87);
      });
    }
    // Preserve the reading time while physics runs independently of scrolling.
    timeline.to({}, { duration: 0.01 }, 2.72);
  };

  const cleanup = () => {
    timeline?.scrollTrigger?.kill();
    timeline?.kill();
    timeline = null;
  };

  return { initializeAnimation, cleanup };
};
