import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";
import { useExaminationCardSequence } from "../composables/examination/useExaminationCardSequence";

// Use the same GSAP dependency provided by the application's Nuxt plugin.
const { gsap } = createRequire(import.meta.resolve("@hypernym/nuxt-gsap"))("gsap");

test("introduction and demonstration stay separate when scrolling forward, backward or jumping", t => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { matchMedia: () => ({ matches: true }) },
  });
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as any).window;
  });

  for (const mobile of [true, false]) {
    (globalThis as any).window.matchMedia = () => ({ matches: mobile });
    const intro = { autoAlpha: 0, y: 0 };
    const words = Array.from({ length: 24 }, () => ({ opacity: 0.2 }));
    const stage = { opacity: 0, y: 30 };
    const cards = Array.from({ length: 5 }, () => ({ opacity: 0, x: 0, y: 0, rotation: 0, scale: 1 }));
    let timeline: any;
    let playbackVisibility = 0;
    const animation = useExaminationCardSequence({
      $gsap: {
        ...gsap,
        timeline: ({ scrollTrigger: _trigger, ...options }: any) => {
          timeline = gsap.timeline({ ...options, paused: true });
          return timeline;
        },
      } as typeof gsap,
      getParentSection: () => ({} as HTMLElement),
      getStepsCount: () => cards.length,
      stepsContainerRef: { value: null },
      stageRef: { value: stage } as any,
      cardRefs: { value: cards } as any,
      currentStepIndex: { value: 0 } as any,
      getIntroElement: () => intro as any,
      getIntroWords: () => words as any,
      onStageVisibility: value => { playbackVisibility = value; },
    });
    animation.initializeAnimations();

    timeline.progress(0.18);
    assert.equal(intro.autoAlpha, 1, "the introduction has a fully readable pause");
    assert.ok(words.every(word => word.opacity === 1));
    assert.equal(stage.opacity, 0);
    assert.equal(playbackVisibility, 0, "the video waits until the introduction leaves");

    for (const progress of [0, 0.04, 0.18, 0.25, 0.28, 0.32, 0.44, 0.7, 1, 0.32, 0.25, 0.18, 1, 0.18, 0]) {
      timeline.progress(progress);
      assert.ok(intro.autoAlpha === 0 || stage.opacity === 0, `no overlap at ${progress}, mobile=${mobile}`);
      assert.equal(playbackVisibility, stage.opacity, "playback follows the rendered demonstration rather than raw scroll");
      if (progress >= 0.44) {
        assert.equal(intro.autoAlpha, 0);
        assert.equal(stage.opacity, 1);
        assert.equal(cards[0]!.opacity, 1);
      }
    }
    animation.cleanup();
  }
});
