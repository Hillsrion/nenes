import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createJourneyCamera, CAMERA_FOV } from "../components/ui/three-bust/journey-camera";
import { getBustChestFraming, getRenderPixelRatio, normalizeLoadedBust } from "../components/ui/three-bust/scene-utils";

test("mobile palpation zooms into the chest below the instruction cards", () => {
  for (const chest of [
    { center: new THREE.Vector3(0, 0.4, 0.5), halfWidth: 0.49 },
    { center: new THREE.Vector3(0, -0.11, 0.45), halfWidth: 0.68 },
  ]) {
    for (const [width, height] of [[320, 568], [390, 844], [427, 952], [768, 1024], [844, 390]]) {
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width! / height!, 0.1, 100);
      const placement = new THREE.Group();
      placement.position.set(5, 0, -8);
      let palpation = 0;
      const journey = createJourneyCamera({
        getSceneState: () => ({ camera, firstBounds: new THREE.Box3(new THREE.Vector3(-1, -1.4, -0.5), new THREE.Vector3(1, 1.82, 0.5)), secondPlacement: placement, scene: null }),
        getSymptomFocus: () => 1, getPalpationProgress: () => palpation,
        getPalpationFraming: () => chest,
        getCanvas: () => ({ clientWidth: width } as HTMLCanvasElement),
        isDebug: () => false, refreshProfileContour() {},
      });
      journey.buildCameraPath();
      journey.updateCameraForProgress(1);
      // The full-body gabarits have different chest heights and breast widths.
      const center = placement.position.clone().add(chest.center);
      if (width! < height!) {
        assert.ok(Math.abs(center.clone().project(camera).x) < 0.01);
        for (const side of [-chest.halfWidth, chest.halfWidth]) {
          const breast = center.clone().add(new THREE.Vector3(side, 0, 0)).project(camera);
          assert.ok(Math.abs(breast.x) < 1, `both breasts fit at ${width}×${height}`);
        }
      }
      const observationZoom = camera.zoom;
      palpation = 1;
      journey.updateCameraForProgress(1);
      assert.ok(camera.zoom >= observationZoom, `palpation keeps chest detail at ${width}×${height}`);
      if (chest.halfWidth < 0.5) {
        assert.ok(camera.zoom >= observationZoom * 1.3, `palpation noticeably zooms into the smaller chest at ${width}×${height}`);
      }
      const demonstration = center.clone().project(camera);
      assert.ok(Math.abs(demonstration.x) < 0.01, `mobile centers the chest and gesture at ${width}×${height}`);
      for (const side of [-chest.halfWidth, chest.halfWidth]) {
        const breast = center.clone().add(new THREE.Vector3(side, 0, 0)).project(camera);
        assert.ok(Math.abs(breast.x) < 0.95, `both breasts stay in the close-up at ${width}×${height}`);
      }
      assert.ok(demonstration.y < 0 && demonstration.y > -0.95, `the chest stays in the lower half at ${width}×${height}`);
      const head = placement.position.clone().add(new THREE.Vector3(0, 1.8, 0)).project(camera);
      assert.ok(head.y > demonstration.y, `the cards can cover the head above the visible gesture at ${width}×${height}`);
      const pelvis = placement.position.clone().add(new THREE.Vector3(0, -1.6, 0)).project(camera);
      assert.ok(pelvis.y < -1, `palpation crops the lower body at ${width}×${height}`);
      journey.dispose();
    }
  }
});

test("chest framing uses the neutral body profile independently of the profile rotation", () => {
  const group = new THREE.Group();
  group.rotation.y = -Math.PI / 2;
  const root = new THREE.Group();
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.73, 2, 0.45));
  body.userData.symptomProfile = { breast: [0.33, 0.29] };
  root.add(body);
  normalizeLoadedBust(root, 4.62);
  root.position.y -= 0.48;
  group.add(root);
  const framing = getBustChestFraming(root)!;
  assert.ok(Math.abs(framing.center.y - 0.3899) < 0.001);
  assert.ok(Math.abs(framing.halfWidth - 0.489) < 0.001);
  assert.ok(Math.abs(framing.center.x) < 0.001);
  body.geometry.dispose();
});

test("small screens, touch devices and data-saving mode cap the drawing buffer", t => {
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  t.after(() => {
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else delete (globalThis as any).window;
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
    else delete (globalThis as any).navigator;
  });
  for (const [mobile, saveData, expected] of [[true, false, 1], [false, true, 1], [false, false, 1.25]] as const) {
    Object.defineProperty(globalThis, "window", { configurable: true, value: { devicePixelRatio: 3, innerWidth: mobile ? 390 : 1366 } });
    Object.defineProperty(globalThis, "navigator", { configurable: true, value: { hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 0, connection: { saveData } } });
    assert.equal(getRenderPixelRatio(), expected);
  }
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { hardwareConcurrency: 8, deviceMemory: 8, maxTouchPoints: 5 } });
  assert.equal(getRenderPixelRatio(), 1, "a landscape touch screen retains the mobile pixel budget");
});
