import { type Ref } from "vue";

interface UseSymptomsTitleAnimationOptions {
  $gsap: any;
  sectionRef: Ref<HTMLElement | null>;
  titleWrapperRef: Ref<HTMLElement | null>;
}

export const useSymptomsTitleAnimation = ({
  $gsap,
  sectionRef,
  titleWrapperRef,
}: UseSymptomsTitleAnimationOptions) => {
  let titleAnimation: any = null;
  let titleMatchMedia: any = null;

  const initializeTitleAnimation = () => {
    if (!titleWrapperRef.value) {
      return;
    }

    titleMatchMedia?.revert?.();
    titleMatchMedia = $gsap.matchMedia();

    titleMatchMedia.add(
      {
        isMobile: "(max-width: 1023px)",
        isDesktop: "(min-width: 1024px)",
      },
      (context: any) => {
        const { isMobile } = context.conditions;
        titleAnimation = $gsap.fromTo(
          titleWrapperRef.value,
          {
            scale: 5,
            opacity: 0,
          },
          {
            scale: 1,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
            scrollTrigger: {
              trigger: sectionRef.value,
              start: isMobile ? "30% top" : "top 30%",
              end: isMobile ? "40% top" : "30% bottom",
              scrub: 1,
            },
          }
        );
      }
    );
  };

  const cleanupTitleAnimation = () => {
    titleAnimation?.scrollTrigger?.kill?.();
    titleAnimation?.kill?.();
    titleMatchMedia?.revert?.();
    titleAnimation = null;
    titleMatchMedia = null;
  };

  return {
    initializeTitleAnimation,
    cleanupTitleAnimation,
  };
};
