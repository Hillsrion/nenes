import type { Ref } from "vue";

declare const useNuxtApp: () => { $gsap: any };

interface ContentElementsAnimationOptions {
  sectionRef: Ref<HTMLElement | null>;
  stageRef: Ref<HTMLElement | null>;
  orangeRef: Ref<HTMLElement | null>;
  textRefs: Ref<HTMLElement[]>;
}

export const useNewContentElementsAnimation = ({
  sectionRef,
  stageRef,
  orangeRef,
  textRefs,
}: ContentElementsAnimationOptions) => {
  let timeline: any = null;

  const initializeAnimation = () => {
    const section = sectionRef.value;
    const stage = stageRef.value;
    const orange = orangeRef.value;
    const elements = textRefs.value.filter(Boolean);

    if (!section || !stage || !orange || !elements.length) return;

    const { $gsap } = useNuxtApp();
    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reducedMotion) {
      $gsap.set(elements, { autoAlpha: 1, y: 0, scale: 1 });
      $gsap.set(orange, {
        autoAlpha: 1,
        y: () => stage.clientHeight - orange.offsetHeight * 0.92,
        rotation: 0,
      });
      return;
    }

    $gsap.set(elements, {
      autoAlpha: 0,
      y: 30,
    });
    $gsap.set(orange, {
      autoAlpha: 1,
      y: () => -orange.offsetHeight * 1.1,
      rotation: -18,
      transformOrigin: "50% 50%",
    });

    timeline = $gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.35,
        invalidateOnRefresh: true,
      },
    });

    const floorY = () => stage.clientHeight - orange.offsetHeight * 0.88;

    timeline
      .to(
        orange,
        {
          y: floorY,
          rotation: 112,
          duration: 0.82,
          ease: "power2.in",
        },
        0
      )
      .to(
        elements[0],
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.32,
          ease: "power2.out",
        },
        0.18
      )
      .to(
        orange,
        {
          y: () => floorY() - Math.min(stage.clientHeight * 0.24, 220),
          rotation: 196,
          duration: 0.34,
          ease: "power2.out",
        },
        0.82
      )
      .to(
        orange,
        {
          y: floorY,
          rotation: 258,
          duration: 0.38,
          ease: "power2.in",
        },
        1.16
      )
      .to(
        elements[1],
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.34,
          ease: "power2.out",
        },
        1.05
      )
      .to(
        orange,
        {
          y: () => floorY() - Math.min(stage.clientHeight * 0.1, 90),
          rotation: 304,
          duration: 0.2,
          ease: "power2.out",
        },
        1.54
      )
      .to(
        orange,
        {
          y: floorY,
          rotation: 338,
          duration: 0.22,
          ease: "power2.in",
        },
        1.74
      )
      .to({}, { duration: 0.44 })
      .to(orange, {
        y: () => stage.clientHeight + orange.offsetHeight * 0.2,
        rotation: 390,
        duration: 0.32,
        ease: "power2.in",
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
