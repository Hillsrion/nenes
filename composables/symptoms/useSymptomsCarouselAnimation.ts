import { ref, type Ref } from "vue";

interface UseSymptomsCarouselAnimationOptions {
  $gsap: any;
  sectionRef: Ref<HTMLElement | null>;
  cardRefs: Ref<(HTMLElement | null)[]>;
  titleRef: Ref<{ titleElement: HTMLElement } | null>;
}

export const useSymptomsCarouselAnimation = ({
  $gsap,
  sectionRef,
  cardRefs,
  titleRef,
}: UseSymptomsCarouselAnimationOptions) => {
  const isTitleHidden = ref(false);

  let carouselAnimation: any = null;
  let titleHideAnimation: any = null;
  let carouselMatchMedia: any = null;

  const initializeCarouselAnimation = () => {
    if (!sectionRef.value || cardRefs.value.length === 0) {
      return;
    }

    const validRefs = cardRefs.value.filter(
      (card): card is HTMLElement => card !== null
    );

    carouselMatchMedia?.revert?.();
    carouselMatchMedia = $gsap.matchMedia();

    carouselMatchMedia.add(
      {
        isMobile: "(max-width: 450px)",
        isDesktop: "(min-width: 451px)",
      },
      (context: any) => {
        const { isMobile, isDesktop } = context.conditions;
        const mobileRotation = 40;
        const mobileStagger = 0.12;

        carouselAnimation = $gsap.fromTo(
          validRefs,
          {
            rotation: isMobile ? mobileRotation : 30,
          },
          {
            rotation: isMobile ? -mobileRotation : isDesktop ? -45 : -30,
            ease: "power1.inOut",
            stagger: isMobile ? mobileStagger : isDesktop ? 0.12 : 0.09,
            scrollTrigger: {
              trigger: sectionRef.value,
              start: isMobile ? "35% top" : "top top",
              end: "bottom bottom",
              scrub: true,
              onUpdate: (self: any) => {
                if (!cardRefs.value[0] || !titleRef.value?.titleElement) {
                  return;
                }

                const firstCardElement = cardRefs.value[0];
                const currentRotation = $gsap.getProperty(
                  firstCardElement,
                  "rotation"
                ) as number;

                if (currentRotation <= 5 && !isTitleHidden.value) {
                  isTitleHidden.value = true;
                  titleHideAnimation?.kill?.();
                  titleHideAnimation = $gsap.to(titleRef.value.titleElement, {
                    opacity: 0,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                } else if (
                  currentRotation >= 15 &&
                  isTitleHidden.value &&
                  self.direction === -1
                ) {
                  isTitleHidden.value = false;
                  titleHideAnimation?.kill?.();
                  titleHideAnimation = null;
                  $gsap.to(titleRef.value.titleElement, {
                    opacity: 1,
                    duration: 0.3,
                    ease: "power2.out",
                  });
                }
              },
            },
          }
        );
      }
    );
  };

  const cleanupCarouselAnimation = () => {
    titleHideAnimation?.kill?.();
    carouselAnimation?.scrollTrigger?.kill?.();
    carouselAnimation?.kill?.();
    carouselMatchMedia?.revert?.();
    isTitleHidden.value = false;

    titleHideAnimation = null;
    carouselAnimation = null;
    carouselMatchMedia = null;
  };

  return {
    initializeCarouselAnimation,
    cleanupCarouselAnimation,
  };
};
