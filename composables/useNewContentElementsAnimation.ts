import type { Ref } from "vue";

declare const useNuxtApp: () => { $gsap: any };

interface ContentElementsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  textRefs: Ref<HTMLElement[]>;
}

export const useNewContentElementsAnimation = ({
  sectionRef,
  textRefs,
}: ContentElementsAnimationOptions) => {
  let timeline: any = null;

  const initializeAnimation = () => {
    const section = sectionRef.value;
    const elements = textRefs.value.filter(Boolean);

    if (!section || !elements.length) return;

    const { $gsap } = useNuxtApp();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      $gsap.set(elements, { autoAlpha: 1, y: 0, scale: 1 });
      return;
    }

    $gsap.set(elements, {
      autoAlpha: 0,
      y: 56,
      scale: 0.96,
      transformOrigin: "center center",
    });

    timeline = $gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top 70%",
        end: "bottom bottom",
        scrub: 0.45,
        invalidateOnRefresh: true,
      },
    });

    elements.forEach((element, index) => {
      const start = index * 0.5;

      timeline
        .to(
          element,
          {
            autoAlpha: 1,
            y: 0,
            scale: 1,
            duration: 0.18,
            ease: "power2.out",
          },
          start
        )
        .to(
          element,
          {
            autoAlpha: 0,
            y: -32,
            duration: 0.16,
            ease: "power2.in",
          },
          start + 0.34
        );
    });
  };

  const cleanup = () => {
    if (timeline?.scrollTrigger) timeline.scrollTrigger.kill();
    timeline?.kill();
    timeline = null;
  };

  return {
    initializeAnimation,
    cleanup,
  };
};
