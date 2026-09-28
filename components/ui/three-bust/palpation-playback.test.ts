import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createPalpationPlayback } from './palpation-playback';

function authoredFixture() {
  const root = new THREE.Group();
  const bone = new THREE.Bone(); bone.name = 'Hand'; root.add(bone);
  const clip = (name: string, times: number[], values: number[]) => new THREE.AnimationClip(name, times.at(-1), [
    new THREE.NumberKeyframeTrack('Hand.position[x]', times, values),
  ]);
  const clips = [clip('full', [0,2,5,7], [0,3,3,0])];
  const steps = [1,-1].map(side => {
    clips.push(clip(`enter${side}`, [0,1,2], [0,side*2,side*3]), clip(`hold${side}`, [0,3], [side*3,side*3]), clip(`leave${side}`, [0,1,2], [side*3,side*2,0]));
    return {id:String(side),start:0,end:3,clipName:`hold${side}`,entryClipName:`enter${side}`,exitClipName:`leave${side}`};
  });
  return {bone, playback:createPalpationPlayback(root, clips, steps)};
}

test('authored paths enter, hold and retract before changing sides', () => {
  const {bone,playback}=authoredFixture();
  playback.selectStep('1'); playback.update(1);
  assert.equal(bone.position.x,2,'use the authored approach, not a quaternion fade');
  playback.update(32); assert.equal(bone.position.x,3);
  playback.selectStep('-1');
  assert.equal(bone.position.x,3,'changing sides does not jump across the torso');
  playback.update(1); assert.equal(bone.position.x,2,'old side retracts first');
  playback.update(1); assert.equal(bone.position.x,0);
  playback.update(1); assert.equal(bone.position.x,-2,'new side starts from rest');
  playback.update(2); assert.equal(bone.position.x,-3);
  playback.selectStep('observation'); playback.update(2);
  assert.equal(bone.position.x,0); assert.equal(playback.active,false);
  playback.dispose();
});

test('interrupting an authored approach reverses its already-travelled path', () => {
  const {bone,playback}=authoredFixture();
  playback.selectStep('1'); playback.update(.75);
  assert.equal(bone.position.x,1.5);
  playback.selectStep('observation');
  assert.equal(bone.position.x,1.5);
  playback.update(.25); assert.equal(bone.position.x,1);
  playback.update(.5); assert.equal(bone.position.x,0); assert.equal(playback.active,false);
  playback.selectStep('1'); playback.update(.75);
  playback.selectStep('-1'); playback.selectStep('1');
  playback.update(.75); assert.equal(bone.position.x,0,'rapid changes finish a safe return');
  playback.update(2); assert.equal(bone.position.x,3);
  playback.seek(1); assert.equal(bone.position.x,1.5);
  playback.selectStep('observation'); playback.update(1);
  assert.equal(bone.position.x,0);
  playback.dispose();
});

test('skeletal clips blend in, loop and return bones to their bind pose', () => {
  const root = new THREE.Group();
  const bone = new THREE.Bone(); bone.name = 'Shoulder'; root.add(bone);
  root.add(new THREE.SkinnedMesh());
  const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), Math.PI / 2).toArray();
  const clip = new THREE.AnimationClip('axilla', 2, [new THREE.QuaternionKeyframeTrack('Shoulder.quaternion', [0,2], [...q,...q])]);
  const playback = createPalpationPlayback(root, [clip], [{id:'axilla',start:0,end:2,clipName:'axilla'}]);
  playback.selectStep('observation'); playback.update(1.3);
  playback.selectStep('axilla'); playback.update(.6);
  assert.ok(bone.rotation.z > .1 && bone.rotation.z < Math.PI / 2);
  playback.update(1); playback.update(10);
  assert.ok(Math.abs(bone.rotation.z-Math.PI/2)<1e-6);
  playback.selectStep('observation');
  assert.equal(playback.active,true);
  playback.update(1.3);
  assert.ok(Math.abs(bone.rotation.z)<1e-6);
  assert.equal(playback.active,false);
  playback.seek(1);
  assert.ok(Math.abs(bone.rotation.z-Math.PI/2)<1e-6);
  playback.dispose();
  assert.ok(Math.abs(bone.rotation.z)<1e-6);
});

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

test('the axillary arm raises, holds across loops, switches sides and restores the original scan', () => {
  const root = new THREE.Group();
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute([
    0.32, 0, 0, 0.33, 0, 0, 0.32, 0.02, 0,
    -0.32, 0, 0, -0.33, 0, 0, -0.32, 0.02, 0,
    0, 0.2, 0.1,
  ], 3));
  geometry.setIndex([0, 1, 2, 3, 4, 5]);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry);
  mesh.morphTargetDictionary = { palpation_contact_1: 0 };
  root.add(mesh);
  const source = Array.from(geometry.getAttribute('position').array);
  const playback = createPalpationPlayback(root, [
    new THREE.AnimationClip('full', 12, []), new THREE.AnimationClip('axilla', 3, []),
  ], [{ id: 'axilla', start: 2, end: 5, clipName: 'axilla' }], [
    { start: 2, end: 5, kind: 'axilla', side: 1 },
    { start: 8, end: 11, kind: 'axilla', side: -1 },
  ]);
  playback.selectStep('axilla');
  playback.update(0.6);
  const halfway = mesh.geometry.getAttribute('position').getY(0);
  playback.update(0.6);
  const raised = mesh.geometry.getAttribute('position').getY(0);
  assert.ok(raised > halfway && halfway > 0);
  playback.update(3);
  assert.equal(mesh.geometry.getAttribute('position').getY(0), raised);
  assert.deepEqual(Array.from(geometry.getAttribute('position').array), source, 'cached geometry is untouched');
  assert.equal(mesh.geometry.getAttribute('position').getY(3), 0, 'opposite arm stays down');
  assert.equal(mesh.geometry.getAttribute('position').getX(6), 0, 'chest stays anchored');
  playback.seek(9);
  assert.equal(mesh.geometry.getAttribute('position').getY(0), 0);
  assert.ok(mesh.geometry.getAttribute('position').getY(3) > 0);
  playback.selectStep('observation');
  assert.deepEqual(Array.from(mesh.geometry.getAttribute('position').array), source);
  assert.deepEqual(Array.from(mesh.geometry.getIndex()!.array), Array.from(geometry.getIndex()!.array));
  playback.dispose();
});
