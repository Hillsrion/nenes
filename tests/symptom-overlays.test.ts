import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import { createSymptomEffects } from '../components/ui/three-bust/symptom-effects.ts';

function setReducedMotion(t: TestContext, reduced: boolean) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: { matchMedia: () => ({ matches: reduced }) },
  });
  t.after(() => {
    if (previous) Object.defineProperty(globalThis, 'window', previous);
    else Reflect.deleteProperty(globalThis, 'window');
  });
}

function createFixture(t: TestContext, calibrated = true, absoluteMorph = false, inflatedInactiveMorph = false) {
  let now = 0;
  t.mock.method(performance, 'now', () => now * 1000);
  const group = new THREE.Group();
  group.position.set(4, -2, 5);
  group.rotation.set(0.12, 0.34, -0.17);
  group.scale.set(1.2, 0.8, 1.1);
  const loaded = new THREE.Group();
  loaded.position.set(-0.8, 0.6, -1.2);
  loaded.rotation.set(0.11, -0.21, 0.05);
  loaded.scale.set(0.9, 1.1, 0.7);
  group.add(loaded);

  // A translated geometry catches assumptions about a model centered at zero.
  const geometry = new THREE.BoxGeometry(2, 3, 0.8, 4, 6, 2);
  geometry.translate(1, -0.4, 0.6);
  const positions = geometry.getAttribute('position');
  const normals = geometry.getAttribute('normal');
  const morph = new Float32Array(positions.count * 3);
  for (let index = 0; index < positions.count; index += 1) {
    if (absoluteMorph) {
      morph[index * 3] = positions.getX(index);
      morph[index * 3 + 1] = positions.getY(index);
      morph[index * 3 + 2] = positions.getZ(index);
    }
    if (normals.getZ(index) > 0.9) morph[index * 3 + 2] += 0.12;
  }
  const attribute = new THREE.Float32BufferAttribute(morph, 3);
  attribute.name = 'dimpling';
  geometry.morphTargetsRelative = !absoluteMorph;
  geometry.morphAttributes.position = [attribute];
  if (inflatedInactiveMorph) {
    const inactive = new Float32Array(positions.count * 3);
    for (let index = 0; index < positions.count; index += 1) {
      inactive[index * 3] = 40;
      inactive[index * 3 + 1] = 55;
      inactive[index * 3 + 2] = 65;
    }
    const inactiveAttribute = new THREE.Float32BufferAttribute(inactive, 3);
    inactiveAttribute.name = 'asymmetry';
    geometry.morphAttributes.position.push(inactiveAttribute);
    geometry.computeBoundingBox();
  }
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  if (calibrated) {
    body.userData.symptomProfile = {
      nipple: [0.24, 0.12], skin: [0.35, 0.17],
      dimples: [[-0.43, 0.22], [-0.3, 0.08], [-0.42, -0.04]],
    };
  }
  loaded.add(body);

  // This is closer to a whole-model front ray than the skin, like a hand.
  const helper = new THREE.Mesh(new THREE.BoxGeometry(4, 5, 0.1), new THREE.MeshStandardMaterial());
  helper.position.set(1, -0.4, 2.2);
  loaded.add(helper);
  const effects = createSymptomEffects(() => group);
  effects.registerMesh(helper);
  effects.registerMesh(body);
  effects.build(loaded, 'none');
  t.after(() => {
    effects.dispose();
    for (const mesh of [body, helper]) {
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
  });
  const advance = (seconds: number) => { now += seconds; effects.tick(now); };
  return { group, body, effects, advance };
}

function meshVerticesInBody(mesh: THREE.Mesh, body: THREE.Mesh) {
  body.updateWorldMatrix(true, false);
  mesh.updateWorldMatrix(true, false);
  const positions = mesh.geometry.getAttribute('position');
  return Array.from({ length: positions.count }, (_, index) => {
    const point = new THREE.Vector3().fromBufferAttribute(positions, index);
    return body.worldToLocal(mesh.localToWorld(point));
  });
}

function crustCenter(group: THREE.Group, body: THREE.Mesh) {
  const layer = group.getObjectByName('symptom-dimpling')!;
  const vertices: THREE.Vector3[] = [];
  layer.traverse(child => {
    if (child instanceof THREE.Mesh) vertices.push(...meshVerticesInBody(child, body));
  });
  assert.ok(vertices.length > 0, 'crust relief exists');
  return vertices.reduce((sum, vertex) => sum.add(vertex), new THREE.Vector3()).divideScalar(vertices.length);
}

function frontNormal(mesh: THREE.Mesh) {
  mesh.updateWorldMatrix(true, false);
  return new THREE.Vector3(0, 0, 1)
    .applyMatrix3(new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld)).normalize();
}

test('discharge remains attached to the calibrated body under transforms and foreground helpers', t => {
  setReducedMotion(t, false);
  const { group, body } = createFixture(t);
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.ok(source, 'a meniscus is created on the body');
  const sourceBounds = new THREE.Box3().setFromPoints(meshVerticesInBody(source, body));
  const bodyBounds = new THREE.Box3().setFromBufferAttribute(body.geometry.getAttribute('position'));
  const sourceCenter = sourceBounds.getCenter(new THREE.Vector3());
  const half = bodyBounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const expected = bodyBounds.getCenter(new THREE.Vector3()).add(new THREE.Vector3(half.x * 0.24, half.y * 0.12, 0));
  assert.ok(Math.abs(sourceCenter.x - expected.x) < half.x * 0.08, 'source stays near calibrated nipple X');
  assert.ok(Math.abs(sourceCenter.y - expected.y) < half.y * 0.08, 'source stays near calibrated nipple Y');
  assert.ok(sourceBounds.min.z <= bodyBounds.max.z && sourceBounds.max.z >= bodyBounds.max.z,
    'the meniscus touches the body surface rather than floating or attaching to a helper');

  const material = source.material as THREE.MeshPhysicalMaterial;
  assert.ok(material instanceof THREE.MeshPhysicalMaterial);
  assert.ok(material.transmission > 0.5, 'liquid transmits the surface behind it');
  assert.ok(Math.abs(material.ior - 1.333) < 0.001, 'liquid uses the refraction index of water');
  assert.ok(material.roughness < 0.2, 'liquid has a smooth reflective surface');
  assert.ok(material.color.r >= material.color.g && material.color.g >= material.color.b);
  assert.ok(material.color.g > 0.5 && material.color.r - material.color.g < 0.3,
    'the example discharge is pale rather than saturated red');
  const drops: THREE.Object3D[] = [];
  group.traverse(child => { if (child.name.startsWith('falling-nipple-droplet-')) drops.push(child); });
  assert.equal(drops.length, 1, 'one drop forms and falls from the nipple');
  assert.equal(source.userData.preserveMaterial, true);
});

test('uncalibrated discharge uses the body bounds when its geometry is offset', t => {
  setReducedMotion(t, false);
  const { group, body } = createFixture(t, false);
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.ok(source, 'fallback placement finds the translated body');
  const bounds = new THREE.Box3().setFromBufferAttribute(body.geometry.getAttribute('position'));
  const sourceBounds = new THREE.Box3().setFromPoints(meshVerticesInBody(source, body));
  const center = sourceBounds.getCenter(new THREE.Vector3());
  assert.ok(center.x > bounds.min.x && center.x < bounds.max.x);
  assert.ok(center.y > bounds.min.y && center.y < bounds.max.y);
  assert.ok(sourceBounds.min.z <= bounds.max.z && sourceBounds.max.z >= bounds.max.z);
});

test('a nipple seed on its left flank refines to the tip instead of following the flank normal', t => {
  setReducedMotion(t, false);
  const group = new THREE.Group();
  const geometry = new THREE.PlaneGeometry(2, 3, 128, 128);
  const positions = geometry.getAttribute('position');
  const tip = new THREE.Vector2(0.215, 0.18);
  const seedX = 0.1875;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const protrusion = 0.07 * Math.exp(-((x - tip.x) ** 2 + (y - tip.y) ** 2) / 0.025 ** 2);
    positions.setZ(index, 0.3 - x * 0.25 - y * 0.1 + protrusion);
  }
  geometry.computeVertexNormals();
  const body = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial());
  body.userData.symptomProfile = { nipple: [seedX, 0.12], skin: [0.35, 0.17], dimples: [] };
  group.add(body);
  const effects = createSymptomEffects(() => group);
  t.after(() => { effects.dispose(); geometry.dispose(); (body.material as THREE.Material).dispose(); });
  effects.registerMesh(body);
  effects.build(body, 'none');
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.ok(source, 'the discharge has an attachment point');
  assert.ok(source.position.x > seedX + 0.015, 'the source moves from the left flank toward the tip');
  assert.ok(Math.abs(source.position.x - tip.x) < 0.012, 'the source aligns horizontally with the nipple tip');
  assert.ok(Math.abs(source.position.y - tip.y) < 0.012, 'the refinement preserves the nipple height');
});

test('inactive morph endpoints cannot move nipple calibration away from the neutral body', t => {
  setReducedMotion(t, false);
  const { group, body } = createFixture(t, true, false, true);
  assert.deepEqual(body.morphTargetInfluences, [0, 0]);
  assert.equal(group.getObjectByName('symptom-nipple')!.visible, false);
  const neutralBounds = new THREE.Box3().setFromBufferAttribute(body.geometry.getAttribute('position'));
  const expandedBounds = body.geometry.boundingBox!;
  for (const axis of ['x', 'y', 'z'] as const) {
    assert.ok(expandedBounds.max[axis] - neutralBounds.max[axis] > 10,
      `the inactive morph expands the cached ${axis.toUpperCase()} bounds`);
  }
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.ok(source, 'the nipple is found despite inactive endpoints outside the body');
  const sourceBounds = new THREE.Box3().setFromPoints(meshVerticesInBody(source, body));
  const center = sourceBounds.getCenter(new THREE.Vector3());
  const half = neutralBounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const expected = neutralBounds.getCenter(new THREE.Vector3())
    .add(new THREE.Vector3(half.x * 0.24, half.y * 0.12, 0));
  assert.ok(Math.abs(center.x - expected.x) < half.x * 0.05,
    'nipple X is calibrated against neutral positions with only local refinement');
  assert.ok(Math.abs(center.y - expected.y) < half.y * 0.05,
    'nipple Y is calibrated against neutral positions with only local refinement');
  assert.ok(sourceBounds.min.z <= neutralBounds.max.z && sourceBounds.max.z >= neutralBounds.max.z,
    'the meniscus intersects the neutral skin plane');
});

test('meniscus and crust tangent planes match the skin under nonuniform parent scales', t => {
  setReducedMotion(t, false);
  const { group, body, effects, advance } = createFixture(t);
  const expected = frontNormal(body);
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  assert.ok(frontNormal(source).dot(expected) > 1 - 0.000001,
    'the flattened meniscus follows the skin tangent plane');
  effects.update('dimpling');
  advance(0.75);
  const crusts = group.getObjectByName('integrated-crusts')!;
  assert.ok(crusts.children.length > 0);
  crusts.traverse(child => {
    if (child instanceof THREE.Mesh) {
      assert.ok(frontNormal(child).dot(expected) > 1 - 0.000001,
        'crust patches stay parallel to the deformed skin');
    }
  });
});

test('crust patches follow the skin through the dimpling blend and return to neutral', t => {
  setReducedMotion(t, false);
  const { group, body, effects, advance } = createFixture(t);
  const neutral = crustCenter(group, body);
  effects.update('dimpling');
  advance(0.375);
  const middle = crustCenter(group, body);
  assert.ok(Math.abs(body.morphTargetInfluences![0] - 0.5) < 0.00001);
  assert.ok(Math.abs(middle.z - neutral.z - 0.06) < 0.00001,
    'crusts move by half the source surface morph at half weight');
  advance(0.375);
  const full = crustCenter(group, body);
  assert.ok(Math.abs(full.z - neutral.z - 0.12) < 0.00001,
    'crusts move with the fully deformed source surface');
  effects.update('none');
  advance(0.75);
  assert.ok(crustCenter(group, body).distanceTo(neutral) < 0.00001);
  assert.equal(group.getObjectByName('symptom-dimpling')!.visible, false);
});

test('absolute dimpling targets without morph normals select and follow the deformed skin', t => {
  setReducedMotion(t, false);
  const { group, body, effects, advance } = createFixture(t, true, true);
  assert.equal(body.geometry.morphTargetsRelative, false);
  assert.equal(body.geometry.morphAttributes.normal, undefined);
  const neutral = crustCenter(group, body);
  const expectedNormal = frontNormal(body);
  effects.update('dimpling');
  advance(0.375);
  assert.ok(Math.abs(crustCenter(group, body).z - neutral.z - 0.06) < 0.00001,
    'absolute target coordinates blend from neutral rather than being treated as deltas');
  advance(0.375);
  assert.ok(Math.abs(crustCenter(group, body).z - neutral.z - 0.12) < 0.00001,
    'anchors are selected from changed front-face vertices rather than large unchanged coordinates');
  group.getObjectByName('integrated-crusts')!.traverse(child => {
    if (child instanceof THREE.Mesh) {
      assert.ok(frontNormal(child).dot(expectedNormal) > 1 - 0.000001,
        'absent morph normals fall back to the neutral surface normal');
    }
  });
  effects.update('none');
  advance(0.75);
  assert.ok(crustCenter(group, body).distanceTo(neutral) < 0.00001);
});

test('reduced motion keeps the meniscus and pendant drop static, then hides the layer on none', t => {
  setReducedMotion(t, true);
  const { group, effects } = createFixture(t);
  effects.update('nipple');
  effects.tick(1);
  const source = group.getObjectByName('nipple-discharge-source') as THREE.Mesh;
  const drop = group.getObjectByName('falling-nipple-droplet-1') as THREE.Mesh;
  const sourcePosition = source.position.clone();
  const sourceRotation = source.quaternion.clone();
  const sourceScale = source.scale.clone();
  const dropPosition = drop.position.clone();
  const dropScale = drop.scale.clone();
  const dropVisible = drop.visible;
  for (const elapsed of [2.4, 4.8, 8.2]) {
    effects.tick(elapsed);
    assert.deepEqual(source.scale, sourceScale);
    assert.deepEqual(source.position, sourcePosition);
    assert.ok(source.quaternion.equals(sourceRotation));
    assert.deepEqual(drop.position, dropPosition);
    assert.deepEqual(drop.scale, dropScale);
    assert.equal(drop.visible, dropVisible);
  }
  assert.equal(effects.isTransitioning(), false);
  effects.update('none');
  assert.equal(group.getObjectByName('symptom-nipple')!.visible, false);
  assert.equal((source.material as THREE.Material).opacity, 0);
});
