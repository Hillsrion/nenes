import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createJourneyCamera, CAMERA_FOV } from "../components/ui/three-bust/journey-camera";
import { getBustChestFraming, getRenderPixelRatio, normalizeLoadedBust } from "../components/ui/three-bust/scene-utils";

test("arrival frames the chest immediately and the symptom close-up keeps the head out", () => {
  for (const [width, height] of [[390, 844], [844, 390], [768, 1024], [1024, 1366]]) {
    for (const chestY of [-0.11, 0.4]) {
      const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width! / height!, 0.1, 100);
      const placement = new THREE.Group();
      placement.position.set(5, 0, -8);
      let focus = 0;
      const journey = createJourneyCamera({
        getSceneState: () => ({ camera, firstBounds: new THREE.Box3(new THREE.Vector3(-1, -1.4, -0.5), new THREE.Vector3(1, 1.82, 0.5)), secondPlacement: placement, scene: null }),
        getSymptomFocus: () => focus, getPalpationProgress: () => 0,
        getPalpationFraming: () => ({ center: new THREE.Vector3(0, chestY, 0.5), halfWidth: 0.49 }),
        getCanvas: () => ({ clientWidth: width } as HTMLCanvasElement),
        isDebug: () => false, refreshProfileContour() {},
      });
      journey.buildCameraPath();
      for (focus = 0; focus <= 1; focus++) {
        journey.updateCameraForProgress(1);
        const chest = placement.position.clone().add(new THREE.Vector3(0, chestY, 0.5)).project(camera);
        const head = placement.position.clone().add(new THREE.Vector3(0, 1.3, 0)).project(camera);
        const lowerBody = placement.position.clone().add(new THREE.Vector3(0, -2.5, 0)).project(camera);
        assert.ok(camera.zoom >= 2.5, `chest close-up at ${width}×${height}, focus ${focus}`);
        assert.ok(chest.y > 0 && chest.y < 0.4, "the chest sits just above the vertical center");
        assert.ok(head.y > 1, "the head is above the viewport");
        assert.ok(lowerBody.y < -1, "the full body cannot fit in the viewport");
        if (focus === 0) {
          const profileChest = placement.position.clone().add(new THREE.Vector3(-0.5, chestY, 0)).project(camera);
          assert.ok(profileChest.x > -0.9 && profileChest.x < -0.45, "the profile stays left aligned with an inset for the label");
        }
      }
      journey.dispose();
    }
  }
});

test("desktop and landscape tablets retain their original zoom and camera position after resizing", () => {
  const camera = new THREE.PerspectiveCamera(CAMERA_FOV, 1, 0.1, 100);
  const placement = new THREE.Group();
  placement.position.set(5, 0, -8);
  const chest = { center: new THREE.Vector3(0, 0.4, 0.5), halfWidth: 0.49 };
  let width = 390;
  let focus = 0;
  let palpation = 0;
  const journey = createJourneyCamera({
    getSceneState: () => ({ camera, firstBounds: new THREE.Box3(new THREE.Vector3(-1, -1.4, -0.5), new THREE.Vector3(1, 1.82, 0.5)), secondPlacement: placement, scene: null }),
    getSymptomFocus: () => focus, getPalpationProgress: () => palpation,
    getPalpationFraming: () => chest,
    getCanvas: () => ({ clientWidth: width } as HTMLCanvasElement),
    isDebug: () => false, refreshProfileContour() {},
  });
  for (const [viewportWidth, height] of [[390, 844], [1366, 768], [1920, 1080], [1280, 1600], [1024, 1366], [1024, 768], [1180, 820], [960, 600]]) {
    width = viewportWidth!;
    camera.aspect = width / height!;
    journey.buildCameraPath();
    focus = palpation = 0;
    journey.updateCameraForProgress(1);
    if (width === 390 || height === 1366) {
      assert.equal(camera.zoom, 2.7, "phones and portrait tablets retain the inset profile after resizing");
      continue;
    }
    const mobile = width < 1024;
    const distance = mobile ? 8.5 : 6;
    const halfHeight = Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV / 2)) * distance;
    const offsetX = 0.52 * halfHeight * camera.aspect;
    for (const [nextFocus, nextPalpation, zoom] of [[0, 0, 1], [1, 0, 1.9], [1, 1, mobile ? 3.25 : 1.65]]) {
      focus = nextFocus!;
      palpation = nextPalpation!;
      journey.updateCameraForProgress(1);
      assert.equal(camera.zoom, zoom, `original zoom at ${width}×${height}, focus ${focus}, palpation ${palpation}`);
      const expectedX = placement.position.x + (mobile && palpation ? 0 : offsetX / zoom!);
      const expectedY = mobile && palpation
        ? 0.8 + chest.center.y + halfHeight / zoom! * 0.3 - chest.center.z * 0.8 / 8.5
        : 0.8 - 0.2 * focus;
      assert.ok(Math.abs(camera.position.x - expectedX) < 1e-8, "original horizontal framing");
      assert.ok(Math.abs(camera.position.y - expectedY) < 1e-8, "original vertical framing");
      assert.ok(Math.abs(camera.position.z - placement.position.z - distance) < 1e-8, "original arrival distance");
    }
  }
  journey.dispose();
});

test("mobile symptoms and palpation enlarge the screen-right breast below the instruction cards", () => {
  for (const chest of [
    { center: new THREE.Vector3(0, 0.4, 0.5), halfWidth: 0.49 },
    { center: new THREE.Vector3(0, -0.11, 0.45), halfWidth: 0.68 },
  ]) {
    for (const [width, height] of [[320, 568], [390, 844], [427, 952], [768, 1024], [1024, 1366], [844, 390]]) {
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
      const selectedBreast = center.clone().add(new THREE.Vector3(chest.halfWidth * 0.55, 0, 0));
      const observationZoom = camera.zoom;
      assert.ok(observationZoom > 2.5, `symptoms show more detail at ${width}×${height}`);
      // Check forward and reverse transitions: the same breast stays centered.
      for (palpation of [0, 0.5, 1, 0.5, 0]) {
        journey.updateCameraForProgress(1);
        assert.ok(camera.zoom >= observationZoom, `palpation keeps chest detail at ${width}×${height}`);
        const demonstration = selectedBreast.clone().project(camera);
        assert.ok(Math.abs(demonstration.x) < 0.01, `the model's left breast is centered at ${width}×${height}`);
        assert.ok(center.clone().project(camera).x < -0.1, "the view moves toward screen right");
        for (const side of [0.15, 0.95]) {
          const edge = center.clone().add(new THREE.Vector3(chest.halfWidth * side, 0, 0)).project(camera);
          assert.ok(Math.abs(edge.x) < 1, `the selected breast and gesture fit at ${width}×${height}`);
        }
        assert.ok(demonstration.y > 0 && demonstration.y < 0.4, `the breast stays below the upper notes at ${width}×${height}`);
      }
      const head = placement.position.clone().add(new THREE.Vector3(0, 1.3, 0)).project(camera);
      assert.ok(head.y > 1, `the head stays above the viewport at ${width}×${height}`);
      const lowerBody = placement.position.clone().add(new THREE.Vector3(0, -2.5, 0)).project(camera);
      assert.ok(lowerBody.y < -1, `palpation crops the lower body at ${width}×${height}`);
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
