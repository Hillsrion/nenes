import type { Ref } from "vue";
import { INTRO_END, INTRO_TIMELINE_DURATION } from "~/utils/intro-sequence";
import { useAnimationsStore } from "~/stores";

declare const useNuxtApp: () => { $gsap: any };

interface EntryRevealAnimationOptions {
  revealTrackRef: Ref<HTMLElement | null>;
  revealStageRef: Ref<HTMLElement | null>;
  entryCoverRef: Ref<HTMLElement | null>;
  whiteSectionRef: Ref<HTMLElement | null>;
  numberWhiteRef: Ref<HTMLElement | null>;
  numberBlueRef: Ref<HTMLElement | null>;
  numberMaskRef: Ref<HTMLElement | null>;
  numberTargetRef: Ref<HTMLElement | null>;
  phrasePartRefs: Ref<HTMLElement[]>;
  onPhotoProgress: (progress: number) => void;
}

export const useEntryRevealAnimation = ({
  revealTrackRef,
  revealStageRef,
  entryCoverRef,
  whiteSectionRef,
  numberWhiteRef,
  numberBlueRef,
  numberMaskRef,
  numberTargetRef,
  phrasePartRefs,
  onPhotoProgress,
}: EntryRevealAnimationOptions) => {
  const animationsStore = useAnimationsStore();
  let timeline: any = null;
  let logoIsPrimary: boolean | null = null;
  let scrollIndicatorIsHidden: boolean | null = null;

  const getNumberLayers = () =>
    [numberWhiteRef.value, numberBlueRef.value].filter(
      (element): element is HTMLElement => Boolean(element)
    );

  const updateGlobalState = (progress: number) => {
    const statisticsProgress = (progress * (INTRO_TIMELINE_DURATION + 1.2) - INTRO_TIMELINE_DURATION) / 1.2;
    const shouldUsePrimaryLogo = statisticsProgress >= 0.57;
    const shouldHideScrollIndicator = progress > 0.015;

    if (logoIsPrimary !== shouldUsePrimaryLogo) {
      animationsStore.updateLogoColor(shouldUsePrimaryLogo);
      logoIsPrimary = shouldUsePrimaryLogo;
    }

    if (scrollIndicatorIsHidden !== shouldHideScrollIndicator) {
      animationsStore.updateCoverScaling(shouldHideScrollIndicator);
      scrollIndicatorIsHidden = shouldHideScrollIndicator;
    }
  };

  const getTargetTransform = () => {
    const stage = revealStageRef.value;
    const number = numberBlueRef.value;
    const target = numberTargetRef.value;

    if (!stage || !number || !target) {
      return { x: 0, y: 0, scale: 1 };
    }

    const stageRect = stage.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const numberFontSize = Number.parseFloat(getComputedStyle(number).fontSize);
    const targetFontSize = Number.parseFloat(getComputedStyle(target).fontSize);

    return {
      x:
        targetRect.left +
        targetRect.width / 2 -
        (stageRect.left + stageRect.width / 2),
      y:
        targetRect.top +
        targetRect.height / 2 -
        (stageRect.top + stageRect.height / 2),
      scale: targetFontSize / numberFontSize,
    };
  };

  const prepareInitialState = () => {
    const entryCover = entryCoverRef.value;
    const whiteSection = whiteSectionRef.value;
    const numberMask = numberMaskRef.value;
    const numberLayers = getNumberLayers();

    if (!entryCover || !whiteSection || !numberMask || numberLayers.length !== 2) {
      return;
    }

    const { $gsap } = useNuxtApp();

    $gsap.set(entryCover, {
      autoAlpha: 1,
      yPercent: 0,
      scale: 1,
      transformOrigin: "center center",
    });
    $gsap.set(whiteSection, { yPercent: 0 });
    $gsap.set(numberMask, { clipPath: "inset(100% 0 0 0)" });
    $gsap.set(numberLayers, {
      autoAlpha: 0,
      x: 0,
      xPercent: -50,
      y: () => Math.max(280, window.innerHeight * 0.62),
      yPercent: -50,
      scale: 1,
      transformOrigin: "center center",
    });
    $gsap.set(phrasePartRefs.value.filter(Boolean), {
      autoAlpha: 0,
      y: 16,
    });

    onPhotoProgress(0);
    updateGlobalState(0);
  };

  const showReducedMotionState = () => {
    const { $gsap } = useNuxtApp();
    const target = getTargetTransform();
    const numberLayers = getNumberLayers();

    $gsap.set(entryCoverRef.value, { autoAlpha: 0, yPercent: -100 });
    $gsap.set(whiteSectionRef.value, { yPercent: -100 });
    $gsap.set(numberMaskRef.value, { clipPath: "inset(0% 0 0 0)" });
    $gsap.set(numberLayers, {
      autoAlpha: 1,
      x: target.x,
      y: target.y,
      scale: target.scale,
    });
    $gsap.set(phrasePartRefs.value.filter(Boolean), {
      autoAlpha: 1,
      y: 0,
    });
    updateGlobalState(1);
  };

  const initializeAnimation = () => {
    const track = revealTrackRef.value;
    const stage = revealStageRef.value;
    const entryCover = entryCoverRef.value;
    const whiteSection = whiteSectionRef.value;
    const numberMask = numberMaskRef.value;
    const numberLayers = getNumberLayers();
    const phraseParts = phrasePartRefs.value.filter(Boolean);

    if (
      !track ||
      !stage ||
      !entryCover ||
      !whiteSection ||
      !numberMask ||
      numberLayers.length !== 2 ||
      !numberTargetRef.value
    ) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      showReducedMotionState();
      return;
    }

    const { $gsap } = useNuxtApp();
    const holdState = { progress: 0 };
    const photoState = { progress: 0 };
    const photoEnd = INTRO_TIMELINE_DURATION;

    prepareInitialState();

    timeline = $gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: track,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.45,
        invalidateOnRefresh: true,
        onUpdate: (self: { progress: number }) =>
          updateGlobalState(self.progress),
        onRefresh: (self: { progress: number }) =>
          updateGlobalState(self.progress),
      },
    });

    timeline.to(photoState, {
      progress: INTRO_END,
      duration: photoEnd,
      onUpdate: () => onPhotoProgress(photoState.progress),
    }, 0);

    timeline
      .to(
        numberLayers,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.22,
          ease: "power2.out",
        },
        photoEnd
      )
      .to(
        entryCover,
        {
          yPercent: -100,
          duration: 0.38,
        },
        photoEnd + 0.3
      )
      .to(
        whiteSection,
        {
          yPercent: -100,
          duration: 0.38,
        },
        photoEnd + 0.3
      )
      .to(
        numberMask,
        {
          clipPath: "inset(0% 0 0 0)",
          duration: 0.38,
        },
        photoEnd + 0.3
      )
      .to(
        numberLayers,
        {
          x: () => getTargetTransform().x,
          y: () => getTargetTransform().y,
          scale: () => getTargetTransform().scale,
          duration: 0.28,
          ease: "power2.inOut",
        },
        photoEnd + 0.72
      )
      .to(
        phraseParts,
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.18,
          stagger: 0.025,
          ease: "power1.out",
        },
        photoEnd + 0.78
      )
      .to(
        holdState,
        {
          progress: 1,
          duration: 0.15,
        },
        photoEnd + 1.05
      );
  };

  const cleanup = () => {
    if (timeline?.scrollTrigger) timeline.scrollTrigger.kill();
    timeline?.kill();
    timeline = null;

    animationsStore.updateLogoColor(true);
    animationsStore.updateCoverScaling(false);
    logoIsPrimary = null;
    scrollIndicatorIsHidden = null;
  };

  return {
    prepareInitialState,
    initializeAnimation,
    cleanup,
  };
};
