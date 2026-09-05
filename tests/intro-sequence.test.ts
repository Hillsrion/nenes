import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getIntroState, INTRO_END } from '../utils/intro-sequence.ts';

const visible = (time: number) => getIntroState(time).cutouts.map(cutout => cutout.visible);
test('the seven Figma frames preserve the intended foreground stack', () => {
  assert.deepEqual(visible(0), [false, false, false]);
  assert.deepEqual(visible(1.1), [true, false, false]);
  assert.equal(getIntroState(2.2).progress, 1);
  assert.deepEqual(visible(3.15), [true, true, false]);
  assert.deepEqual(visible(4.2), [false, true, false]);
  assert.deepEqual(visible(5.2), [false, true, true]);
  assert.deepEqual(visible(INTRO_END), [false, false, true]);
  assert.equal(getIntroState(INTRO_END).to, 3);
  assert.equal(getIntroState(INTRO_END).progress, 1);
});
test('the latest cutout stays fully settled throughout each background transition', () => {
  for (const [index, start, end] of [[0, 1.25, 2.05], [1, 3.3, 4.1], [2, 5.35, 6.15]]) {
    for (let time = start!; time <= end!; time += 0.02) {
      const state = getIntroState(time);
      assert.deepEqual(state.cutouts[index!], { visible: true, arrival: 1 });
      assert.ok(state.progress >= 0 && state.progress <= 1);
    }
  }
});
test('reverse scrolling and jumps restore the exact same frames without stale layers', () => {
  const times = [0, 0.7, 1.65, 2.7, 3.7, 4.7, 5.8, INTRO_END];
  const forward = times.map(getIntroState);
  for (let i = times.length - 1; i >= 0; i--) assert.deepEqual(getIntroState(times[i]!), forward[i]);
  assert.deepEqual(getIntroState(-1), getIntroState(0));
  assert.deepEqual(getIntroState(NaN), getIntroState(0));
});
