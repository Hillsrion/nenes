import * as THREE from "three";
import { FRUIT_CAMERA_DISTANCE, FRUIT_COLUMN_NDC } from "./journey-fruits";

const CAMERA_FOV = 40;
/** Keep the symptoms bust slightly left of center to clear the cards. */
const ARRIVAL_CENTER_NDC_X = -0.52;
/** Camera distance on arrival, identical to the sticky viewer. */
const ARRIVAL_DISTANCE = 6;
/** First bust fills ~135% of the viewport height, as in the screening cut. */
const START_FILL = 1.35;
const SYMPTOMS_ZOOM = 1.9;
const PALPATION_ZOOM = 1.65;

interface JourneyCameraContext {
  getSceneState: () => {
    camera: THREE.PerspectiveCamera | null;
    firstBounds: THREE.Box3;
    secondPlacement: THREE.Group | null;
    scene: THREE.Scene | null;
  };
  isDebug: () => boolean;
  getSelectedFruitIndex?: () => number;
  getPalpationProgress: () => number;
  getSymptomFocus: () => number;
  getCanvas: () => HTMLCanvasElement | null;
  refreshProfileContour: () => void;
}

export function createJourneyCamera(context: JourneyCameraContext) {
  let positionCurve: THREE.CubicBezierCurve3 | null = null;
  let targetCurve: THREE.CubicBezierCurve3 | null = null;
  let departurePosition: THREE.CubicBezierCurve3 | null = null;
  let departureTarget: THREE.CubicBezierCurve3 | null = null;
  const fruitCenter = new THREE.Vector3();
  const tmpTarget = new THREE.Vector3();
  let lastCameraProgress = -1;
  /**
   * Camera choreography. Matched eye and look-at curves travel directly past
   * the first bust's screen-right shoulder toward the second bust, without reversing
   * horizontal direction.
   * The arrival beat keeps the symptoms bust near the left edge as the
   * screening camera hands off to this shared scene.
   */
  const buildCameraPath = () => {
    const { camera, firstBounds, secondPlacement, scene } = context.getSceneState();
    if (!camera || !secondPlacement) return;
    const aspect = camera.aspect;
    const arrivalDistance = aspect < 1 ? 8.5 : ARRIVAL_DISTANCE;
    const halfFov = THREE.MathUtils.degToRad(CAMERA_FOV) / 2;

    const firstSize = firstBounds.getSize(new THREE.Vector3());
    const firstCenter = firstBounds.getCenter(new THREE.Vector3());
    const secondCenterWorld = secondPlacement.position.clone();
    secondCenterWorld.y += 0.2;

    // Beat 1 — opening framing: the first bust fills the right of the viewport.
    const startDepth = firstSize.y / (2 * Math.tan(halfFov) * START_FILL);
    const startHalfWidth = Math.tan(halfFov) * startDepth * aspect;
    const p0 = new THREE.Vector3(
      firstCenter.x - 0.48 * startHalfWidth,
      firstCenter.y + 0.2 * firstSize.y,
      firstCenter.z + startDepth
    );
    const t0 = new THREE.Vector3(
      firstCenter.x - 0.48 * startHalfWidth,
      firstCenter.y - 0.02 * firstSize.y,
      firstCenter.z
    );

    // Arrival, locked on the second bust in profile. The lateral
    // offset derives from the half-width at the true camera-to-subject distance
    // so the bust center lands exactly at the target NDC x (left edge bleed,
    // matching the former sticky viewer proportions).
    const arrivalHalfWidth = Math.tan(halfFov) * arrivalDistance * aspect;
    const arrivalOffsetX = -ARRIVAL_CENTER_NDC_X * arrivalHalfWidth;
    const arrival = new THREE.Vector3(
      secondCenterWorld.x + arrivalOffsetX,
      secondCenterWorld.y + 0.6,
      secondCenterWorld.z + arrivalDistance
    );
    const arrivalTarget = new THREE.Vector3(
      secondCenterWorld.x + arrivalOffsetX,
      secondCenterWorld.y - 0.2,
      secondCenterWorld.z
    );

    const shoulderX = firstBounds.max.x + 0.18 * firstSize.x;
    const eye1 = p0.clone().lerp(arrival, 0.3);
    eye1.x = Math.min(arrival.x, Math.max(eye1.x, shoulderX));
    eye1.y = firstBounds.max.y - 0.15 * firstSize.y;
    const eye2 = p0.clone().lerp(arrival, 0.72);
    eye2.x = Math.min(arrival.x, Math.max(eye2.x, eye1.x));

    const look1 = t0.clone().lerp(arrivalTarget, 0.25);
    const look2 = t0.clone().lerp(arrivalTarget, 0.78);
    // Pause in a centered fruit gallery before taking the selected shoulder path.
    fruitCenter.set(firstSize.x * 0.8 + 2.2, 0, -(firstSize.y * 0.8 + 2));
    const fruitEye = fruitCenter.clone().add(new THREE.Vector3(0, 0, FRUIT_CAMERA_DISTANCE));
    positionCurve = new THREE.CubicBezierCurve3(
      p0, eye1.clone().lerp(fruitEye, 0.25), fruitEye.clone().add(new THREE.Vector3(-0.8, 0.65, -0.5)), fruitEye,
    );
    targetCurve = new THREE.CubicBezierCurve3(t0, look1, fruitCenter.clone().add(new THREE.Vector3(-0.5, 0, 0)), fruitCenter.clone());
    const selectedOffset = ((context.getSelectedFruitIndex?.() ?? 1) - 1)
      * FRUIT_COLUMN_NDC * Math.tan(halfFov) * FRUIT_CAMERA_DISTANCE * aspect;
    const selectedCenter = fruitCenter.clone().add(new THREE.Vector3(selectedOffset, 0, 0));
    departurePosition = new THREE.CubicBezierCurve3(
      fruitEye, fruitEye.clone().add(new THREE.Vector3(selectedOffset * 0.5, 0.6, -2.8)), eye2, arrival,
    );
    departureTarget = new THREE.CubicBezierCurve3(fruitCenter.clone(), selectedCenter, look2, arrivalTarget);

    if (context.isDebug() && scene) {
      scene.getObjectByName("journey-debug")?.removeFromParent();
      const debugGroup = new THREE.Group();
      debugGroup.name = "journey-debug";
      const addCurve = (curve: THREE.CubicBezierCurve3, color: number) => {
        debugGroup.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
          new THREE.LineBasicMaterial({ color })
        ));
        [curve.v0, curve.v1, curve.v2, curve.v3].forEach((point) => {
          const marker = new THREE.Mesh(
            new THREE.SphereGeometry(0.08, 12, 12),
            new THREE.MeshBasicMaterial({ color })
          );
          marker.position.copy(point);
          debugGroup.add(marker);
        });
      };
      addCurve(positionCurve, 0x22c55e);
      addCurve(targetCurve, 0xf472b6);
      addCurve(departurePosition, 0x22c55e);
      addCurve(departureTarget, 0xf472b6);
      scene.add(debugGroup);
    }
  };

  const updateCameraForProgress = (progress: number) => {
    const { camera, firstBounds } = context.getSceneState();
    if (!camera || !positionCurve || !targetCurve) return;
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    if (clamped <= 0.5) {
      positionCurve.getPoint(clamped * 2, camera.position);
      targetCurve.getPoint(clamped * 2, tmpTarget);
    } else {
      departurePosition!.getPoint((clamped - 0.5) * 2, camera.position);
      departureTarget!.getPoint((clamped - 0.5) * 2, tmpTarget);
    }
    // Keep the chest in the same left column through symptoms and palpation.
    const modelProgress = THREE.MathUtils.smoothstep(clamped, 0.5, 1);
    const focus = context.getSymptomFocus() * modelProgress;
    const palpation = THREE.MathUtils.clamp(context.getPalpationProgress(), 0, 1) * modelProgress;
    camera.zoom = THREE.MathUtils.lerp(
      THREE.MathUtils.lerp(1, SYMPTOMS_ZOOM, focus), PALPATION_ZOOM, palpation
    );
    const offsetX = -ARRIVAL_CENTER_NDC_X * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * (camera.aspect < 1 ? 8.5 : ARRIVAL_DISTANCE) * camera.aspect;
    const correctionX = offsetX * (1 - 1 / camera.zoom);
    camera.position.x -= correctionX;
    tmpTarget.x -= correctionX;
    camera.position.y -= 0.2 * focus;
    tmpTarget.y -= 0.2 * focus;
    camera.updateProjectionMatrix();
    camera.lookAt(tmpTarget);
    camera.updateMatrixWorld();
    if (context.isDebug()) {
      // Inspection hook for ?journeyDebug=1: live camera pose + bust anchors.
      (window as any).__journeyCamera = {
        progress: clamped,
        camera: camera.position.toArray(),
        target: tmpTarget.toArray(),
        firstCenter: firstBounds.getCenter(new THREE.Vector3()).toArray(),
        secondCenter: (() => {
          const center = getSecondCenterWorld();
          return center ? center.toArray() : null;
        })(),
      };
      (window as any).__journeyCanvas = context.getCanvas();
    }
    if (clamped >= 0.999 && lastCameraProgress < 0.999) {
      context.refreshProfileContour();
    }
    lastCameraProgress = clamped;
  };

  const getSecondCenterWorld = () => {
    const { secondPlacement } = context.getSceneState();
    if (!secondPlacement) return null;
    const center = secondPlacement.position.clone();
    center.y += 0.2;
    return center;
  };

  return {
    buildCameraPath, updateCameraForProgress,
    getFruitCenter: () => fruitCenter.clone(),
    get progress() { return lastCameraProgress; },
    dispose() { positionCurve = null; targetCurve = null; departurePosition = null; departureTarget = null; },
  };
}

export { CAMERA_FOV };
