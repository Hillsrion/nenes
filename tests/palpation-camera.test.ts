import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { createJourneyCamera, CAMERA_FOV } from "../components/ui/three-bust/journey-camera";

test("the last palpation card pans to the opposite breast only in mobile close-ups", () => {
  for (const [width, height, pans] of [[390, 844, true], [844, 390, true], [768, 1024, true], [1366, 768, false]] as const) {
    const camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);
    const placement = new THREE.Group();
    placement.position.set(5, 0, -8);
    const chest = { center: new THREE.Vector3(0, 0.3, 0.4), halfWidth: 0.6 };
    let otherSide = 0;
    let palpation = 1;
    const journey = createJourneyCamera({
      getSceneState: () => ({ camera, firstBounds: new THREE.Box3(new THREE.Vector3(-1, -1.6, -0.4), new THREE.Vector3(1, 1.6, 0.4)), secondPlacement: placement, scene: null }),
      isDebug: () => false,
      getPalpationProgress: () => palpation,
      getOtherSideProgress: () => otherSide,
      getPalpationFraming: () => chest,
      getSymptomFocus: () => 1,
      getCanvas: () => ({ ownerDocument: { defaultView: { innerWidth: width } } }) as HTMLCanvasElement,
      refreshProfileContour() {},
    });
    journey.buildCameraPath();
    journey.updateCameraForProgress(1);
    const initial = camera.position.clone();
    const rotation = camera.quaternion.clone();
    const zoom = camera.zoom;
    otherSide = 0.5;
    journey.updateCameraForProgress(1);
    const middle = camera.position.clone();
    otherSide = 1;
    journey.updateCameraForProgress(1);
    const expectedShift = pans ? -chest.halfWidth * 1.1 : 0;
    assert.ok(Math.abs(camera.position.x - initial.x - expectedShift) < 1e-8);
    assert.ok(Math.abs(middle.x - (initial.x + camera.position.x) / 2) < 1e-8);
    assert.equal(camera.position.y, initial.y);
    assert.equal(camera.position.z, initial.z);
    assert.equal(camera.zoom, zoom);
    assert.ok(camera.quaternion.angleTo(rotation) < 1e-7, "pan preserves the viewing angle");
    otherSide = 0;
    journey.updateCameraForProgress(1);
    assert.ok(camera.position.distanceTo(initial) < 1e-8, "reverse scroll restores the first breast");
    palpation = 0;
    journey.updateCameraForProgress(1);
    const symptoms = camera.position.clone();
    otherSide = 1;
    journey.updateCameraForProgress(1);
    assert.ok(camera.position.distanceTo(symptoms) < 1e-8, "symptoms keep their existing framing");
    journey.dispose();
  }
});
