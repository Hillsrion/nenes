import type { Ref } from "vue";
import type { gsap } from "gsap";

interface CardSequenceOptions {
  $gsap: typeof gsap;
  getParentSection: () => HTMLElement | undefined;
  getStepsCount: () => number;
  stepsContainerRef: Ref<HTMLElement | null>;
  stageRef: Ref<HTMLElement | null>;
  cardRefs: Ref<(HTMLElement | null)[]>;
  currentStepIndex: Ref<number>;
  getIntroElement?: () => HTMLElement | null;
  getIntroWords?: () => HTMLElement[];
  onStageVisibility?: (value: number) => void;
}

export function useExaminationCardSequence(options: CardSequenceOptions) {
  const { $gsap, stepsContainerRef, stageRef, cardRefs, currentStepIndex } = options;
  // Resting offsets for stacking cards organically
  const restingOffsets = [
    { x: 0, y: 0, rotate: -1.2 },
    { x: -16, y: 18, rotate: 1.8 },
    { x: 12, y: 36, rotate: -1.5 },
    { x: -10, y: 54, rotate: 1.4 },
    { x: 14, y: 72, rotate: -0.9 },
  ];

  let scrollTimeline: gsap.core.Timeline | null = null;

  const initializeAnimations = () => {
    const trigger = options.getParentSection() || stepsContainerRef.value;
    if (!trigger || !stageRef.value) return;

    scrollTimeline?.scrollTrigger?.kill();
    scrollTimeline?.kill();

    const totalSteps = options.getStepsCount();
    const mobile = window.matchMedia("(max-width: 1023px)").matches;
    const getOffset = (index: number) => {
      const offset = restingOffsets[index % restingOffsets.length]!;
      return mobile ? { ...offset, x: offset.x * 0.35, y: offset.y * 0.25 } : offset;
    };

    // Keep the first card hidden until the video has entered.
    if (cardRefs.value[0]) {
      const o0 = getOffset(0);
      $gsap.set(cardRefs.value[0], {
        opacity: 0,
        x: o0.x,
        y: o0.y + 45,
        rotation: o0.rotate,
        scale: 0.95,
      });
    }

    // Set initial state for subsequent cards (hidden below)
    for (let i = 1; i < totalSteps; i++) {
      const card = cardRefs.value[i];
      if (card) {
        const o = getOffset(i);
        $gsap.set(card, {
          opacity: 0,
          x: o.x,
          y: o.y + 45,
          rotation: o.rotate + 2.5,
          scale: 0.95,
        });
      }
    }

    // Set initial stage state
    $gsap.set(stageRef.value, { opacity: 0, y: 30 });
    options.onStageVisibility?.(0);
    const intro = options.getIntroElement?.();
    const words = options.getIntroWords?.() ?? [];
    if (intro) $gsap.set(intro, { autoAlpha: 0, y: 0 });
    if (words.length) $gsap.set(words, { opacity: 0.2 });

    // Main scroll-scrubbed timeline calibrated for lengthened scroll
    const tl = $gsap.timeline({
      scrollTrigger: {
        trigger,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.8,
        onUpdate: (self: any) => {
          const progress = self.progress;

          if (totalSteps <= 1) {
            currentStepIndex.value = 0;
            return;
          }

          // Step 0 includes the introduction and the first demonstration.
          if (progress < 0.50) {
            if (currentStepIndex.value !== 0) currentStepIndex.value = 0;
            return;
          }

          // Remaining steps 1..totalSteps-1 follow the first card entrance.
          const stepSpan = 0.40 / (totalSteps - 1);
          const stepIdx = Math.min(
            totalSteps - 1,
            1 + Math.floor((progress - 0.50) / stepSpan)
          );

          if (currentStepIndex.value !== stepIdx) {
            currentStepIndex.value = stepIdx;
          }
        },
      },
    });

    // Read the introduction, then remove it completely before the demonstration.
    if (intro) {
      tl.to(intro, { autoAlpha: 1, duration: 0.06, ease: "none" }, 0);
      if (words.length) {
        tl.to(words, { opacity: 1, duration: 0.04, stagger: { amount: 0.08 }, ease: "none" }, 0.02);
      }
      tl.to(intro, { autoAlpha: 0, y: -18, duration: 0.06, ease: "power2.in" }, 0.22);
    }

    // 1. Entrance of the stage and video after the introduction has left.
    tl.to(
      stageRef.value,
      {
        opacity: 1,
        y: 0,
        duration: 0.10,
        ease: "power2.out",
        onUpdate: () => options.onStageVisibility?.(Number($gsap.getProperty(stageRef.value!, "opacity"))),
      },
      0.30
    );

    // 2. Reveal the first card only after the video entrance completes.
    if (cardRefs.value[0]) {
      const o0 = getOffset(0);
      if (mobile) tl.set(cardRefs.value[0], { opacity: 1 }, 0.36);
      tl.to(
        cardRefs.value[0],
        {
          ...(mobile ? {} : { opacity: 1 }),
          x: o0.x,
          y: o0.y,
          rotation: o0.rotate,
          scale: 1,
          duration: 0.08,
          ease: "power2.out",
        },
        0.36
      );
    }

    // 3. Sequential stacking animations for cards 1..N-1
    if (totalSteps > 1) {
      const stepDuration = 0.40 / (totalSteps - 1);

      for (let i = 1; i < totalSteps; i++) {
        const card = cardRefs.value[i];
        if (!card) continue;

        const o = getOffset(i);
        const startTime = 0.50 + (i - 1) * stepDuration;

        if (mobile) tl.set(card, { opacity: 1 }, startTime);
        tl.to(
          card,
          {
            ...(mobile ? {} : { opacity: 1 }),
            x: o.x,
            y: o.y,
            rotation: o.rotate,
            scale: 1,
            duration: stepDuration * 0.65,
            ease: "power2.out",
          },
          startTime
        );
      }
    }

    // Keep the timeline duration fixed so scroll progress matches the card timings.
    tl.to({}, { duration: 0.08 }, 0.92);

    scrollTimeline = tl;
  };

  return {
    initializeAnimations,
    cleanup() {
      scrollTimeline?.scrollTrigger?.kill();
      scrollTimeline?.kill();
      scrollTimeline = null;
    },
  };
}
