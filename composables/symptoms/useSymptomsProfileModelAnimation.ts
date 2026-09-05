import type { Ref } from "vue";

interface UseSymptomsProfileModelAnimationOptions {
  $gsap: any;
  sectionRef: Ref<HTMLElement | null>;
  modelRef: Ref<HTMLElement | null>;
  titleRef: Ref<HTMLElement | null>;
}

export const useSymptomsProfileModelAnimation = ({
  $gsap,
  sectionRef,
  modelRef,
  titleRef,
}: UseSymptomsProfileModelAnimationOptions) => {
  let modelAnimation: any = null;
  let titleAnimation: any = null;

  const initializeModelAnimation = () => {
    if (!sectionRef.value || !modelRef.value) return;

    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();

    modelAnimation = $gsap.fromTo(
      modelRef.value,
      { yPercent: 118, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top bottom",
          end: "top top",
          scrub: 1,
        },
      }
    );

    if (!titleRef.value) return;

    titleAnimation = $gsap.fromTo(
      titleRef.value,
      { yPercent: 45, opacity: 0 },
      {
        yPercent: 0,
        opacity: 1,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top",
          end: "9% top",
          scrub: 1,
        },
      }
    );
  };

  const cleanupModelAnimation = () => {
    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    modelAnimation = null;
    titleAnimation = null;
  };

  return {
    initializeModelAnimation,
    cleanupModelAnimation,
  };
};
