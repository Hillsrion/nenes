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
  let illustrationVisibilityTrigger: ScrollTrigger | null = null;
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
    if (!sectionRef.value) return;

    illustrationAnimationTimeline?.kill();
    illustrationVisibilityTrigger?.kill();
    illustrationAnimationTimeline = gsap.to(
      {},
      {
        duration: 10,
        repeat: -1,
        paused: true,
        ease: "none",
        onUpdate: function () {
          illustrationProgress.value = this.progress() * 100;
        },
      }
    );

    illustrationVisibilityTrigger = ScrollTrigger.create({
      trigger: sectionRef.value,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => illustrationAnimationTimeline?.play(),
      onEnterBack: () => illustrationAnimationTimeline?.play(),
      onLeave: () => illustrationAnimationTimeline?.pause(),
      onLeaveBack: () => illustrationAnimationTimeline?.pause(),
    });
  };

  const cleanupResourcesAnimations = () => {
    topScrollTrigger?.kill();
    illustrationVisibilityTrigger?.kill();
    illustrationAnimationTimeline?.kill();
    topScrollTrigger = null;
    illustrationVisibilityTrigger = null;
    illustrationAnimationTimeline = null;
  };

  return {
    initializeTopTracking,
    initializeIllustrationAnimation,
    cleanupResourcesAnimations,
  };
};
