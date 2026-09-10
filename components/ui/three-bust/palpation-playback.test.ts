import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPalpationPlayback } from './palpation-playback';

function fixture() {
  const root = new THREE.Group();
  const hand = new THREE.Group();
  hand.name = 'PalpationHand';
  root.add(hand);
  const clip = (name: string, duration: number, x: number) => new THREE.AnimationClip(name, duration, [
    new THREE.NumberKeyframeTrack('PalpationHand.position[x]', [0, duration / 2, duration], [x, x + 1, x]),
  ]);
  const playback = createPalpationPlayback(root, [clip('full', 20, 0), clip('breast-loop', 3, 10), clip('nipple-loop', 2, 20)], [
    { id: 'breast', start: 0, end: 3, clipName: 'breast-loop' },
    { id: 'nipple', start: 10, end: 12, clipName: 'nipple-loop' },
  ]);
  return { playback, hand };
}

test('a video step loops indefinitely without advancing to the next maneuver', () => {
  const { playback, hand } = fixture();
  playback.selectStep('breast');
  playback.update(61);
  assert.equal(playback.time, 1);
  assert.ok(hand.position.x >= 10 && hand.position.x <= 11);
  playback.selectStep('breast');
  assert.equal(playback.time, 1, 'an unchanged step must not restart');
  playback.selectStep('nipple');
  playback.update(9);
  assert.equal(playback.time, 11);
  assert.equal(hand.position.x, 21);
  playback.selectStep('breast');
  assert.equal(playback.time, 0, 'reverse scrolling returns to the selected chapter');
  playback.dispose();
});

test('observation and missing clips hide the hand and restore a neutral scan', () => {
  const { playback, hand } = fixture();
  playback.selectStep('breast');
  playback.update(1);
  playback.selectStep('observation');
  assert.equal(hand.visible, false);
  assert.equal(hand.position.x, 0);
  assert.equal(playback.active, false);
  playback.update(30);
  assert.equal(playback.time, 0);
  playback.selectStep('unavailable');
  assert.equal(playback.active, false);
  playback.selectStep('nipple');
  assert.equal(hand.visible, true);
  playback.seek(5);
  assert.equal(playback.time, 5);
  playback.dispose();
});
