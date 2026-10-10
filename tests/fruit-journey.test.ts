import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createJourneyCamera, CAMERA_FOV } from "../components/ui/three-bust/journey-camera";
import { FRUIT_CAMERA_DISTANCE } from "../components/ui/three-bust/journey-fruits";
import { journeyScrollProgress } from "../utils/journey-scroll-progress";
import { fruitSelectionOffset } from "../utils/fruit-selection-motion";
import { resolveJourneyFruitModel } from "../config/bust-fruit-catalog";

test("the scroll gate and camera arrival agree across desktop, mobile and reverse scroll", () => {
  for (const [start, stop, end] of [[1000, 5700, 6700], [800, 2400, 3244]]) {
    assert.equal(journeyScrollProgress(start, start, stop, end), 0);
    assert.equal(journeyScrollProgress(stop, start, stop, end), 0.5);
    assert.equal(journeyScrollProgress(end, start, stop, end), 1);
    assert.equal(journeyScrollProgress(end + 500, start, stop, end), 1);
    assert.equal(journeyScrollProgress(stop, start, stop, end), 0.5);
    assert.equal(journeyScrollProgress(start, start, stop, end), 0);
  }
});

test("fruit bindings use finalized volume files, then the fixed-arm binding, then the demo", () => {
  const fallback = "bust-zou-full-multiview-hi3d-palpation.glb";
  assert.equal(resolveJourneyFruitModel("orange", [], fallback), fallback);
  assert.equal(resolveJourneyFruitModel("citron", [], fallback), fallback);
  assert.equal(resolveJourneyFruitModel("orange", ["bust-anais-full-hi3d-palpation.glb"], fallback), "bust-anais-full-hi3d-palpation.glb");
  assert.equal(resolveJourneyFruitModel("orange", ["bust-orange.glb", "bust-anais-full-hi3d-palpation.glb"], fallback), "bust-orange.glb");
  assert.equal(resolveJourneyFruitModel("pamplemousse", [fallback], fallback), fallback);
});

test("fruits fall from above, sink once, rebound and settle into a small float", () => {
  assert.equal(fruitSelectionOffset(0).y, 8);
  assert.ok(fruitSelectionOffset(0.4).y < fruitSelectionOffset(0.2).y);
  assert.equal(fruitSelectionOffset(0.78).y, 0);
  assert.ok(fruitSelectionOffset(1).y < -0.1);
  assert.ok(fruitSelectionOffset(1.5).y > 0);
  for (const seconds of [4, 5, 6, 8, 12]) assert.ok(Math.abs(fruitSelectionOffset(seconds).y) < 0.06);
  for (const seconds of [0, 1, 5]) assert.deepEqual(fruitSelectionOffset(seconds, true), { y: 0, rotation: 0 });
});

test("the camera stops centered on fruits, stays continuous and arrives at the same model framing for all choices", () => {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1366 / 768, 0.1, 100);
  const placement = new THREE.Group(); placement.position.set(5, 0, -8);
  const firstBounds = new THREE.Box3(new THREE.Vector3(-1, -1.6, -0.4), new THREE.Vector3(1, 1.6, 0.4));
  let selected = 1;
  let focus = 0;
  let palpation = 0;
  const journey = createJourneyCamera({
    getSceneState: () => ({ camera, firstBounds, secondPlacement: placement, scene: null }),
    isDebug: () => false, getSelectedFruitIndex: () => selected,
    getPalpationProgress: () => palpation, getSymptomFocus: () => focus,
    getCanvas: () => null, refreshProfileContour() {},
  });
  let arrival: THREE.Vector3 | null = null;
  const departure = [];
  for (selected = 0; selected < 3; selected++) {
    journey.buildCameraPath();
    journey.updateCameraForProgress(0.5);
    const center = journey.getFruitCenter();
    assert.ok(center.clone().project(camera).length() < 1.01);
    assert.ok(Math.abs(center.clone().project(camera).x) < 1e-7);
    assert.ok(Math.abs(center.clone().project(camera).y) < 1e-7);
    assert.ok(Math.abs(camera.position.distanceTo(center) - FRUIT_CAMERA_DISTANCE) < 1e-7);
    const stop = camera.position.clone();
    journey.updateCameraForProgress(0.5 - 1e-5);
    assert.ok(camera.position.distanceTo(stop) < 0.001);
    journey.updateCameraForProgress(0.5 + 1e-5);
    assert.ok(camera.position.distanceTo(stop) < 0.001);
    journey.updateCameraForProgress(0.6); departure.push(camera.position.x);
    journey.updateCameraForProgress(1);
    if (arrival) assert.ok(arrival.distanceTo(camera.position) < 1e-7);
    arrival = camera.position.clone();
  }
  assert.ok(departure[0] < departure[1] && departure[1] < departure[2]);
  focus = palpation = 1;
  journey.updateCameraForProgress(0.5);
  assert.equal(camera.zoom, 1);
  assert.ok(Math.abs(journey.getFruitCenter().clone().project(camera).x) < 1e-7);
});

test("the local Anaïs journey asset contains all symptoms and hand chapters with fixed body and arms", async t => {
  const { readFile } = await import("node:fs/promises");
  let bytes: Buffer;
  try { bytes = await readFile(new URL("../public/models/bust-anais-full-hi3d-palpation.glb", import.meta.url)); }
  catch { t.skip("Generated GLB assets remain local and ignored by Git."); return; }
  const gltf = JSON.parse(bytes.subarray(20, 20 + bytes.readUInt32LE(12)).toString());
  assert.equal(gltf.skins, undefined);
  assert.ok(gltf.nodes.some((node: any) => node.name === "PalpationHand"));
  const bodyNode = gltf.nodes.findIndex((node: any) => node.mesh === 0);
  for (const symptom of ["asymmetry", "skin", "dimpling"]) assert.ok(gltf.meshes[0].extras.targetNames.includes(symptom));
  for (const id of ["breast", "axilla", "nipple", "other-side"]) {
    const step = gltf.extras.palpationStudy.steps.find((step: any) => step.id === id);
    assert.ok(step && gltf.animations.some((clip: any) => clip.name === step.clipName));
  }
  assert.ok(gltf.animations.every((clip: any) => clip.channels.filter((channel: any) => channel.target.node === bodyNode).every((channel: any) => channel.target.path === "weights")));
});
