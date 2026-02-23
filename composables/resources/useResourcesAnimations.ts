import { type Ref } from "vue";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";

interface UseResourcesAnimationsOptions {
  sectionRef: Ref<HTMLElement | null>;
  illustrationProgress: Ref<number>;
  isAtTop: Ref<boolean>;
}

export const useResourcesAnimations = ({
  sectionRef,
  illustrationProgress,
  isAtTop,
}: UseResourcesAnimationsOptions) => {
  let illustrationAnimationTimeline: gsap.core.Tween | null = null;
  let topScrollTrigger: ScrollTrigger | null = null;

  const initializeTopTracking = () => {
    if (!sectionRef.value) {
      return;
    }

    const topTrackingTimeline = gsap.timeline();

    topScrollTrigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: "top top+=10px",
      end: "bottom top",
      animation: topTrackingTimeline,
      onEnter: () => {
        isAtTop.value = true;
      },
      onLeaveBack: () => {
        isAtTop.value = false;
      },
    });
  };

  const initializeIllustrationAnimation = () => {
    illustrationAnimationTimeline = gsap.to(
      {},
      {
        duration: 10,
        repeat: -1,
        ease: "none",
        onUpdate: function () {
          illustrationProgress.value = this.progress() * 100;
        },
      }
    );
  };

  const cleanupResourcesAnimations = () => {
    topScrollTrigger?.kill();
    illustrationAnimationTimeline?.kill();
    topScrollTrigger = null;
    illustrationAnimationTimeline = null;
  };

  return {
    initializeTopTracking,
    initializeIllustrationAnimation,
    cleanupResourcesAnimations,
  };
};
