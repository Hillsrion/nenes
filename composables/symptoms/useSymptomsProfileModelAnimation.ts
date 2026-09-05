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
  let titleExitAnimation: any = null;
  let titleVisibilityAnimation: any = null;

  const initializeModelAnimation = () => {
    if (!sectionRef.value) return;

    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    titleExitAnimation?.scrollTrigger?.kill?.();
    titleExitAnimation?.kill?.();
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
    let lastProgress = 0;
    onTitleProgress(0);
    const emitProgress = () => {
      const p = inSection ? lastProgress : 0;
      onTitleProgress(p);
    };
    titleAnimation = $gsap.fromTo(
      travel,
      { progress: 0 },
      {
        progress: 1,
        ease: "none",
        onUpdate: () => {
          lastProgress = travel.progress;
          emitProgress();
        },
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top top",
          end: "22% top",
          scrub: 1,
        },
      }
    );
    titleExitAnimation = $gsap.fromTo(
      travel,
      { progress: 1 },
      {
        progress: 0,
        ease: "none",
        onUpdate: () => {
          lastProgress = travel.progress;
          emitProgress();
        },
        immediateRender: false,
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "bottom bottom",
          end: "bottom top+=200",
          scrub: 1,
        },
      }
    );
    titleVisibilityAnimation = $gsap.to({}, {
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "bottom top+=200",
        end: "bottom top+=200",
        onToggle: (trigger: { isActive: boolean }) => {
          inSection = trigger.isActive;
          emitProgress();
        },
      },
    });
  };

  const cleanupModelAnimation = () => {
    modelAnimation?.scrollTrigger?.kill?.();
    modelAnimation?.kill?.();
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    titleExitAnimation?.scrollTrigger?.kill?.();
    titleExitAnimation?.kill?.();
    titleVisibilityAnimation?.scrollTrigger?.kill?.();
    titleVisibilityAnimation?.kill?.();
    modelAnimation = null;
    titleAnimation = null;
    titleExitAnimation = null;
    titleVisibilityAnimation = null;
  };

  return {
    initializeModelAnimation,
    cleanupModelAnimation,
  };
};
