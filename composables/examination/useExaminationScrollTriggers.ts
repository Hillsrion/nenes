import { nextTick, type Ref } from "vue";

interface UseExaminationScrollTriggersOptions {
  $gsap: any;
  cardRefs: Ref<(HTMLElement | null)[]>;
  stepsCount: Ref<number>;
  currentStepIndex: Ref<number>;
}

export const useExaminationScrollTriggers = ({
  $gsap,
  cardRefs,
  stepsCount,
  currentStepIndex,
}: UseExaminationScrollTriggersOptions) => {
  const stepScrollTweens: any[] = [];

  const initializeStepScrollTriggers = () => {
    nextTick(() => {
      for (let index = 0; index < stepsCount.value; index += 1) {
        const cardElement = cardRefs.value[index];
        if (!cardElement) {
          continue;
        }

        const stepTween = $gsap.fromTo(
          {},
          {},
          {
            scrollTrigger: {
              trigger: cardElement,
              start: "top 50%",
              end: "bottom 50%",
              onEnter: () => {
                currentStepIndex.value = index;
              },
              onEnterBack: () => {
                currentStepIndex.value = index;
              },
            },
          }
        );

        stepScrollTweens.push(stepTween);
      }
    });
  };

  const cleanupStepScrollTriggers = () => {
    stepScrollTweens.forEach((tween) => {
      tween?.scrollTrigger?.kill?.();
      tween?.kill?.();
    });
    stepScrollTweens.splice(0, stepScrollTweens.length);
  };

  return {
    initializeStepScrollTriggers,
    cleanupStepScrollTriggers,
  };
};
