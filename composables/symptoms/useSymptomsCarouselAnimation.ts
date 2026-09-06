import type { Ref } from "vue";

interface UseSymptomsCarouselAnimationOptions {
  $gsap: any;
  sectionRef: Ref<HTMLElement | null>;
  cardRefs: Ref<(HTMLElement | null)[]>;
  titleRef: Ref<HTMLElement | null>;
  cardStageRef?: Ref<HTMLElement | null>;
  showProfileModel?: boolean;
  onActiveCardChange?: (index: number) => void;
  onSequenceComplete?: () => void;
}

export const useSymptomsCarouselAnimation = ({
  $gsap,
  sectionRef,
  cardRefs,
  titleRef,
  cardStageRef,
  showProfileModel = false,
  onActiveCardChange,
  onSequenceComplete,
}: UseSymptomsCarouselAnimationOptions) => {
  let carouselAnimation: any = null;
  let titleHideAnimation: any = null;
  let carouselMatchMedia: any = null;
  let cardStageAnimation: any = null;
  let activeCardIndex = -1;

  const setActiveCard = (index: number) => {
    if (activeCardIndex === index) return;
    activeCardIndex = index;
    onActiveCardChange?.(index);
  };

  // Follow the rendered cards, including stagger, easing and reverse scrolling.
  const updateActiveCard = () => {
    const section = sectionRef.value?.getBoundingClientRect();
    if (!section || section.top > 0 ||
      (cardStageRef?.value && Number($gsap.getProperty(cardStageRef.value, "opacity")) < 0.05)) {
      setActiveCard(-1);
      return;
    }
    // At the bottom of the sequence, retain the last symptom and the front
    // view. Only scrolling back above the section resets the profile state.
    if (section.bottom <= window.innerHeight) return;
    let closestIndex = -1;
    let closestDistance = Infinity;
    cardRefs.value.forEach((card, index) => {
      const bounds = card?.firstElementChild?.getBoundingClientRect();
      if (!bounds || bounds.right <= 0 || bounds.left >= window.innerWidth ||
        bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
      const distance = Math.abs((bounds.left + bounds.right) / 2 - window.innerWidth / 2);
      if (distance < closestDistance) {
        closestIndex = index;
        closestDistance = distance;
      }
    });
    setActiveCard(closestIndex);
  };

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
        // Leave the profile label enough scroll distance to finish drawing and
        // exit before the first card can select a symptom.
        const carouselStart = showProfileModel
          ? isMobile
            ? "38% top"
            : "36% top"
          : isMobile
            ? "35% top"
            : "top top";
        const titleHideStart = showProfileModel
          ? isMobile
            ? "30% top"
            : "30% top"
          : isMobile
            ? "40% top"
            : "15% top";
        const titleHideEnd = (() => {
          const match = titleHideStart.match(/^(-?\d+)%/);
          const startPct = match ? parseInt(match[1], 10) : 0;
          return `${startPct + 4}% top`;
        })();

        const introShowStart = (() => {
          if (showProfileModel) return "18% top";
          return isMobile ? "5% top" : "3% top";
        })();
        const introShowEnd = (() => {
          const startMatch = introShowStart.match(/^(-?\d+)%/);
          const startPct = startMatch ? parseInt(startMatch[1], 10) : 0;
          return `${startPct + 3}% top`;
        })();

        if (showProfileModel && cardStageRef?.value) {
          cardStageAnimation = $gsap.fromTo(
            cardStageRef.value,
            { opacity: 0 },
            {
              opacity: 1,
              ease: "none",
              onUpdate: updateActiveCard,
              scrollTrigger: {
                trigger: sectionRef.value,
                start: carouselStart,
                end: isMobile ? "42% top" : "40% top",
                scrub: 1,
              },
            }
          );
        }

        carouselAnimation = $gsap.fromTo(
          validRefs,
          {
            rotation: isMobile ? mobileRotation : 30,
          },
          {
            rotation: isMobile ? -mobileRotation : isDesktop ? -45 : -30,
            ease: "power1.inOut",
            stagger: isMobile ? mobileStagger : isDesktop ? 0.12 : 0.09,
            onUpdate: updateActiveCard,
            scrollTrigger: {
              trigger: sectionRef.value,
              start: carouselStart,
              end: "bottom bottom",
              scrub: true,
              onRefresh: updateActiveCard,
              onLeave: () => onSequenceComplete?.(),
              onLeaveBack: () => setActiveCard(-1),
            },
          }
        );

        if (titleRef.value) {
          $gsap.set(titleRef.value, { opacity: 0, y: 16 });

          const parsePct = (label: string) => {
            const match = label.match(/^(-?\d+)%/);
            return match ? parseInt(match[1], 10) : 0;
          };
          const showStartPct = parsePct(introShowStart);
          const showEndPct = parsePct(introShowEnd);
          const hideStartPct = parsePct(titleHideStart);
          const hideEndPct = parsePct(titleHideEnd);
          const totalSpan = hideEndPct - showStartPct;
          const showCompleteAt = (showEndPct - showStartPct) / totalSpan;
          const hideCompleteAt = (hideStartPct - showStartPct) / totalSpan;

          titleHideAnimation = $gsap.timeline({
            scrollTrigger: {
              trigger: sectionRef.value,
              start: introShowStart,
              end: titleHideEnd,
              scrub: true,
            },
          });

          titleHideAnimation.to(
            titleRef.value,
            {
              opacity: 1,
              y: 0,
              duration: showCompleteAt,
              ease: "power2.out",
            },
            0
          );

          titleHideAnimation.to(
            titleRef.value,
            {
              opacity: 0,
              y: -8,
              duration: 1 - hideCompleteAt,
              ease: "power2.out",
            },
            hideCompleteAt
          );
        }
      }
    );
  };

  const cleanupCarouselAnimation = () => {
    setActiveCard(-1);
    titleHideAnimation?.scrollTrigger?.kill?.();
    titleHideAnimation?.kill?.();
    cardStageAnimation?.scrollTrigger?.kill?.();
    cardStageAnimation?.kill?.();
    carouselAnimation?.scrollTrigger?.kill?.();
    carouselAnimation?.kill?.();
    carouselMatchMedia?.revert?.();

    titleHideAnimation = null;
    cardStageAnimation = null;
    carouselAnimation = null;
    carouselMatchMedia = null;
  };

  return {
    initializeCarouselAnimation,
    cleanupCarouselAnimation,
  };
};
