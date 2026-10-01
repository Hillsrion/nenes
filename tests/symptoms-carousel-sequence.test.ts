import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useSymptomsCarouselAnimation } from '../composables/symptoms/useSymptomsCarouselAnimation.ts';

test('fast scrolling cannot move cards before the bust is ready, and reverse scrolling closes the gate', (t) => {
  Object.defineProperty(globalThis, 'window', { value: { innerWidth: 1366, innerHeight: 900 }, configurable: true });
  t.after(() => { delete (globalThis as any).window; });
  const triggers: any[] = [];
  const style = new Map<object, any>();
  let cardProgress = -1;
  let scrollTween: any;
  let entered = 0;
  let reset = 0;
  const section = { getBoundingClientRect: () => ({ top: -2000, bottom: 3400 }) };
  const stage = {};
  const card = { firstElementChild: { getBoundingClientRect: () => ({ left: 500, right: 860, top: 200, bottom: 700, width: 360 }) } };
  const gsap = {
    set(target: any, values: any) {
      for (const object of Array.isArray(target) ? target : [target]) {
        style.set(object, { ...style.get(object), ...values });
      }
    },
    getProperty: (target: object, key: string) => style.get(target)?.[key] ?? 0,
    matchMedia: () => ({ add: (_: any, callback: any) => callback({ conditions: { isDesktop: true, isMobile: false } }), revert() {} }),
    fromTo: () => ({ progress(value: number) { cardProgress = value; }, kill() {} }),
    to(target: any, options: any) {
      triggers.push(options.scrollTrigger);
      if ('progress' in target) scrollTween = { target, options };
      return { kill() {}, scrollTrigger: { kill() {} } };
    },
  };
  const sequence = useSymptomsCarouselAnimation({
    $gsap: gsap,
    sectionRef: { value: section } as any,
    cardRefs: { value: [card] } as any,
    titleRef: { value: null },
    cardStageRef: { value: stage } as any,
    showProfileModel: true,
    onEntranceStart: () => entered++,
    onSequenceReset: () => reset++,
  });
  sequence.initializeCarouselAnimation();
  const entrance = triggers.find(trigger => trigger.start === '34% top');
  entrance.onEnter();
  assert.equal(entered, 1);
  // The reader jumps halfway through the carousel before the 3D transition ends.
  scrollTween.target.progress = 0.5;
  scrollTween.options.onUpdate();
  assert.equal(cardProgress, 0);
  assert.equal(style.get(stage).opacity, 0);
  sequence.releaseCards();
  assert.equal(cardProgress, 0.5);
  assert.equal(style.get(stage).opacity, 1);
  entrance.onLeaveBack();
  assert.equal(reset, 1);
  assert.equal(cardProgress, 0);
  assert.equal(style.get(stage).opacity, 0);
  entrance.onEnter();
  scrollTween.options.onUpdate();
  assert.equal(cardProgress, 0, 're-entry must wait for a fresh completion');
  sequence.cleanupCarouselAnimation();
});
