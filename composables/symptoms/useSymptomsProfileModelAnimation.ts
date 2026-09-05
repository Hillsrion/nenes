import type { Ref } from "vue";

interface UseSymptomsProfileModelAnimationOptions {
  $gsap: any;
  sectionRef: Ref<HTMLElement | null>;
  modelRef: Ref<HTMLElement | null>;
  onTitleProgress: (progress: number) => void;
}

export const useSymptomsProfileModelAnimation = ({
  $gsap,
  sectionRef,
  modelRef,
  onTitleProgress,
}: UseSymptomsProfileModelAnimationOptions) => {
  let modelAnimation: any = null;
  let titleAnimation: any = null;
  let titleVisibilityAnimation: any = null;

  const initializeModelAnimation = () => {
    if (!sectionRef.value) return;

    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    titleVisibilityAnimation?.scrollTrigger?.kill?.();
    titleVisibilityAnimation?.kill?.();

    if (modelRef?.value) {
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
    }

    const travel = { progress: 0 };
    let inSection = true;
    onTitleProgress(0);
    titleAnimation = $gsap.to(travel, {
        progress: 1,
        ease: "none",
        onUpdate: () => onTitleProgress(inSection ? travel.progress : 0),
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top",
          end: "22% top",
          scrub: 1,
        },
      });
    titleVisibilityAnimation = $gsap.to({}, {
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top bottom",
        end: "bottom bottom",
        onToggle: (trigger: { isActive: boolean }) => {
          inSection = trigger.isActive;
          onTitleProgress(inSection ? travel.progress : 0);
        },
      },
    });
  };

  const cleanupModelAnimation = () => {
    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    titleVisibilityAnimation?.scrollTrigger?.kill?.();
    titleVisibilityAnimation?.kill?.();
    modelAnimation = null;
    titleAnimation = null;
    titleVisibilityAnimation = null;
  };

  return {
    initializeModelAnimation,
    cleanupModelAnimation,
  };
};
