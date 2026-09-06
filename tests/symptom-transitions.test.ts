import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSymptomEffects } from '../components/ui/three-bust/symptom-effects.ts';

test('3D symptoms blend, retarget continuously, and return to the original surface', (t) => {
  let now = 0;
  t.mock.method(performance, 'now', () => now * 1000);
  const group = new THREE.Group();
  const geometry = new THREE.SphereGeometry(1, 24, 16);
  const positions = geometry.getAttribute('position');
  const originalColors = new Float32Array(positions.count * 3).fill(0.8);
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(originalColors, 3));
  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = ['asymmetry', 'skin', 'dimpling'].map(name => {
    const attribute = new THREE.Float32BufferAttribute(new Float32Array(positions.count * 3).fill(0.01), 3);
    attribute.name = name;
    return attribute;
  });
  const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  group.add(mesh);
  const effects = createSymptomEffects(() => group);
  effects.registerMesh(mesh);
  effects.build(mesh, 'none');
  const advance = (seconds: number) => { now += seconds; effects.tick(now); };
  effects.update('asymmetry');
  assert.equal(mesh.morphTargetInfluences![0], 0);
  advance(0.375);
  assert.equal(mesh.morphTargetInfluences![0], 0.5);
  advance(0.375);
  assert.equal(mesh.morphTargetInfluences![0], 1);
  effects.update('skin');
  advance(0.375);
  assert.deepEqual(mesh.morphTargetInfluences, [0.5, 0.5, 0]);
  const intermediateColors = Array.from(geometry.getAttribute('color').array);
  assert.ok(intermediateColors.some((color, i) => color !== originalColors[i]));
  effects.update('dimpling');
  assert.deepEqual(mesh.morphTargetInfluences, [0.5, 0.5, 0]);
  assert.deepEqual(Array.from(geometry.getAttribute('color').array), intermediateColors);
  advance(0.75);
  assert.deepEqual(mesh.morphTargetInfluences, [0, 0, 1]);
  effects.update('nipple');
  advance(0.375);
  const nipple = group.getObjectByName('symptom-nipple')!;
  const bead = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.equal(nipple.visible, true);
  assert.ok(Math.abs((bead.material as THREE.Material).opacity - 0.47) < 0.0001);
  effects.update('none');
  advance(0.75);
  assert.equal(nipple.visible, false);
  assert.deepEqual(mesh.morphTargetInfluences, [0, 0, 0]);
  assert.deepEqual(Array.from(geometry.getAttribute('color').array), Array.from(originalColors));
  assert.equal(effects.isTransitioning(), false);
  effects.update('skin');
  assert.equal(effects.isTransitioning(), true);
  effects.dispose();
  assert.equal(effects.isTransitioning(), false);
  geometry.dispose();
  (mesh.material as THREE.Material).dispose();
});

test('both viewers keep rendering after the 150 ms wake-up until the symptom blend finishes', async (t) => {
  const { readFile } = await import('node:fs/promises');
  const { runInNewContext } = await import('node:vm');
  let now = 0;
  t.mock.method(performance, 'now', () => now * 1000);
  for (const viewer of ['ThreeBustJourney', 'ThreeBustViewer']) {
    const effects = createSymptomEffects(() => null);
    effects.update('asymmetry');
    now += 1;
    effects.tick(now);
    effects.update('skin');
    now += 0.2;
    effects.tick(now);
    // Exercise each component's actual render-loop condition with a stationary
    // camera, no controls and no other animation keeping frames alive.
    const source = await readFile(new URL(`../components/ui/${viewer}.vue`, import.meta.url), 'utf8');
    const condition = source.match(/const needsContinuousRendering = \(\) =>([\s\S]*?);/);
    assert.ok(condition, `${viewer}: render condition exists`);
    const context = {
      props: { debugPath: false, autoRotate: false, symptomType: 'skin', materialStyle: 'original' },
      lastCameraProgress: 1,
      IDLE_SPIN_PROGRESS: 0.02,
      modelIsRotating: false,
      controlsActive: false,
      symptomEffects: effects,
    };
    assert.equal(runInNewContext(condition[1], context), true, `${viewer}: blend still needs frames`);
    now += 1;
    effects.tick(now);
    assert.equal(runInNewContext(condition[1], context), false, `${viewer}: idle after completion`);
    effects.dispose();
  }
});
