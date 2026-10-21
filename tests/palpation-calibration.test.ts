import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const profile = JSON.parse(await readFile(new URL('../config/anais-full-palpation.json', import.meta.url), 'utf8'));

test('Anaïs nipple landmarks are independent of the broad breast passes', () => {
  for (let side = 0; side < 2; side++) {
    const [nx, ny] = profile.nipples[side];
    const [bx, by] = profile.breasts[side];
    assert.equal(Math.sign(nx), side === 0 ? 1 : -1);
    assert.ok(Math.hypot(nx - bx, ny - by) > 0.02, 'pinching the breast center would miss this nipple');
  }
});

test('generated Anaïs hand straddles each nipple throughout the squeeze', async t => {
  let bytes: Buffer;
  try { bytes = await readFile(new URL('../public/models/bust-anais-full-hi3d-palpation.glb', import.meta.url)); }
  catch { t.skip('Generated GLBs stay local and ignored.'); return; }
  const model = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const study = model.parser.json.extras.palpationStudy;
  let body: THREE.Mesh;
  model.scene.traverse(child => { if (child instanceof THREE.Mesh && child.userData.symptomProfile) body = child; });
  const bounds = new THREE.Box3().setFromBufferAttribute(body!.geometry.getAttribute('position'));
  const center = bounds.getCenter(new THREE.Vector3()), half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const symptomNipple = body!.userData.symptomProfile.nipple;
  assert.ok(Math.abs(profile.nipples[0][0] - (center.x + half.x * symptomNipple[0])) < 0.001);
  assert.ok(Math.abs(profile.nipples[0][1] - (center.y + half.y * symptomNipple[1])) < 0.001);
  const mixer = new THREE.AnimationMixer(model.scene);
  mixer.clipAction(model.animations[0]).play();
  const index = model.scene.getObjectByName('ContactFinger_1')!;
  const thumb = model.scene.getObjectByName('PinchThumb')!;
  const hand = model.scene.getObjectByName('PalpationHand')!;
  const ray = new THREE.Raycaster();
  for (const [sideIndex, side] of [1, -1].entries()) {
    const station = study.segments.findIndex((s: any) => s.kind === 'nipple' && s.side === side);
    const [nx, ny] = profile.nipples[sideIndex];
    assert.ok(Math.hypot(study.stations[station][0] - nx, study.stations[station][1] - ny) < 1e-6, 'the baked station must target the calibrated nipple');
    for (const phase of [0.6, 1, 1.5, 2, 2.4]) {
      mixer.setTime(study.segments[station].start + phase); model.scene.updateMatrixWorld(true);
      const fingerPoint = body!.worldToLocal(index.getWorldPosition(new THREE.Vector3()));
      const thumbPoint = body!.worldToLocal(thumb.getWorldPosition(new THREE.Vector3()));
      const midpoint = fingerPoint.clone().add(thumbPoint).multiplyScalar(0.5);
      assert.ok(Math.hypot(midpoint.x - nx, midpoint.y - ny) < 0.006, 'pinch midpoint stays centered on the nipple');
      ray.set(body!.localToWorld(new THREE.Vector3(nx, ny, 1)), new THREE.Vector3(0, 0, -1).transformDirection(body!.matrixWorld));
      const hit = ray.intersectObject(body!, false)[0]; assert.ok(hit);
      const target = hand.worldToLocal(hit.point.clone());
      assert.ok(target.x > Math.min(index.position.x, thumb.position.x) && target.x < Math.max(index.position.x, thumb.position.x), 'nipple sits between index and thumb');
      assert.ok(Math.abs(target.y) < 0.006, 'the grip crosses the nipple rather than adjacent skin');
    }
  }
  mixer.stopAllAction(); mixer.uncacheRoot(model.scene);
  model.scene.traverse(child => { if (child instanceof THREE.Mesh) { child.geometry.dispose(); (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => material.dispose()); } });
});
