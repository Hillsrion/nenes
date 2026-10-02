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

    // Keep the first card hidden until the video has entered.
    if (cardRefs.value[0]) {
      const o0 = restingOffsets[0]!;
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
        const o = restingOffsets[i % restingOffsets.length]!;
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

          // Step 0 includes the video entrance and the first card entrance.
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

    // 1. Entrance of the stage and video.
    tl.to(
      stageRef.value,
      {
        opacity: 1,
        y: 0,
        duration: 0.12,
        ease: "power2.out",
      },
      0.08
    );

    // 2. Reveal the first card only after the video entrance completes.
    if (cardRefs.value[0]) {
      const o0 = restingOffsets[0]!;
      tl.to(
        cardRefs.value[0],
        {
          opacity: 1,
          x: o0.x,
          y: o0.y,
          rotation: o0.rotate,
          scale: 1,
          duration: 0.10,
          ease: "power2.out",
        },
        0.30
      );
    }

    // 3. Sequential stacking animations for cards 1..N-1
    if (totalSteps > 1) {
      const stepDuration = 0.40 / (totalSteps - 1);

      for (let i = 1; i < totalSteps; i++) {
        const card = cardRefs.value[i];
        if (!card) continue;

        const o = restingOffsets[i % restingOffsets.length]!;
        const startTime = 0.50 + (i - 1) * stepDuration;

        tl.to(
          card,
          {
            opacity: 1,
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
