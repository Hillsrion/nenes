import { reactive, ref, watch, nextTick, onUnmounted, type Ref } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function useJourneyStage(options: {
  trackRef: Ref<HTMLElement | null>;
  stageRef: Ref<HTMLElement | null>;
  endRef: Ref<HTMLElement | null>;
}) {
  const $gsap = gsap;
  // Journey stage: one scene with the screening bust and the symptoms bust. The
  // ScrollTrigger below scrubs the camera from the screening framing, over the
  // first bust's shoulder, onto the second one in profile.
  const journeyCamera = reactive({ progress: 0 });
  const journeyStageReady = ref(false);

  let journeyCameraTimeline: gsap.core.Timeline | null = null;
  let journeyStageInAnimation: gsap.core.Tween | null = null;
  let journeyStageOutAnimation: gsap.core.Tween | null = null;
  let journeyStageReadyTimer: number | null = null;

  const killJourneyAnimations = () => {
    [journeyCameraTimeline, journeyStageInAnimation, journeyStageOutAnimation].forEach(
      (animation) => {
        animation?.scrollTrigger?.kill?.();
        animation?.kill?.();
      }
    );
    journeyCameraTimeline = null;
    journeyStageInAnimation = null;
    journeyStageOutAnimation = null;
  };

  // The stage mounts only once the wrapper's exit transform has fully
  // transitioned; its ScrollTriggers and camera timeline follow right after.
  watch(journeyStageReady, (ready) => {
    if (!ready) return;
    nextTick(() => initializeJourneyStage());
  });

  const initializeJourneyStage = () => {
    const track = options.trackRef.value;
    const stage = options.stageRef.value;
    if (!track || !stage || !options.endRef.value) return;

    killJourneyAnimations();

    // The stage fades in while the screening section slides up, and out again as
    // the resources section takes the viewport.
    journeyStageInAnimation = $gsap.fromTo(
      stage,
      { autoAlpha: 0 },
      {
        autoAlpha: 1,
        ease: "none",
        scrollTrigger: {
          trigger: track,
          start: "top bottom",
          end: "top 20%",
          scrub: true,
        },
      }
    );
    journeyStageOutAnimation = $gsap.to(stage, {
      autoAlpha: 0,
      ease: "none",
      immediateRender: false,
      scrollTrigger: {
        trigger: options.endRef.value,
        start: "bottom 92%",
        end: "bottom 55%",
        scrub: true,
      },
    });

    // Hold the opening framing through most of the screening scroll, then spend
    // the remaining runway (screening outro + symptoms rise-in) on the move so
    // the camera locks on the profile exactly when the symptoms section pins.
    journeyCameraTimeline = $gsap.timeline({
      scrollTrigger: {
        trigger: track,
        start: "top top",
        endTrigger: options.endRef.value,
        end: "top top",
        scrub: 0.8,
        invalidateOnRefresh: true,
      },
    });
    journeyCameraTimeline
      .to({}, { duration: 3, ease: "none" })
      .to(journeyCamera, { progress: 1, duration: 1, ease: "power1.inOut" });

    // The loading gate collapses the document height while it hides the page;
    // re-measure every trigger once the real layout is back.
    ScrollTrigger.refresh();
  };

  // Called wherever the shared-model animation is initialized: the stage mounts
  // 1.1s later, once the wrapper's exit transform has fully transitioned.
  const scheduleJourneyStageMount = () => {
    if (journeyStageReadyTimer) window.clearTimeout(journeyStageReadyTimer);
    journeyStageReadyTimer = window.setTimeout(() => {
      journeyStageReady.value = true;
    }, 1100);
  };

  onUnmounted(() => {
    killJourneyAnimations();
    if (journeyStageReadyTimer) window.clearTimeout(journeyStageReadyTimer);
  });
  return { journeyCamera, journeyStageReady, scheduleJourneyStageMount };
}
