<template>
  <div ref="containerRef" class="relative h-full w-full">
    <canvas
      ref="canvasRef"
      class="relative z-10 block h-full w-full touch-none transition-opacity duration-700"
      :class="isLoading ? 'opacity-0' : 'opacity-100'"
    />
    <svg
      v-if="profileLabel && profileContour"
      class="profile-contour-label pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible text-primary"
      :viewBox="`0 0 ${profileContour.width} ${profileContour.height}`"
      :style="{
        opacity: isLoading || profileLabelProgress <= 0 ? 0 : profileLabelOpacity,
        transition: 'opacity 240ms ease-out',
      }"
      aria-hidden="true"
    >
      <defs><path :id="profileCurveId" :d="profileContour.path" /></defs>
      <text class="font-serif" fill="currentColor" :font-size="Math.max(24, Math.min(38, profileContour.height * 0.031))">
        <textPath :href="`#${profileCurveId}`" :startOffset="`${100 * (1 - profileLabelProgress)}%`">{{ profileLabel.toLocaleLowerCase('fr-FR') }}</textPath>
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, useId } from "vue";
import { projectProfileContour } from "./three-bust/profile-contour";
import { createGeneratedShapeMaterial, createGlassMaterial } from "./three-bust/materials";
import * as THREE from "three";
import { gsap } from "gsap";
import {
  createSymptomEffects,
  type SymptomType,
} from "./three-bust/symptom-effects";

interface Props {
  firstModelUrl?: string;
  secondModelUrl?: string;
  /** 0: screening framing on the first bust · 1: locked profile framing on the second. */
  cameraProgress?: number;
  symptomType?: SymptomType;
  profileLabel?: string;
  profileLabelProgress?: number;
  secondRotationY?: number;
  debugPath?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  firstModelUrl: "",
  secondModelUrl: "",
  cameraProgress: 0,
  symptomType: "none",
  profileLabel: "",
  profileLabelProgress: 0,
  secondRotationY: 0,
  debugPath: false,
});

// Tuning constants for the scripted camera move. Proportions are derived from
// each bust's normalized bounds so a new GLB keeps the same framing.
const FIRST_MODEL_SCALE = 1.15;
const SECOND_MODEL_SCALE = 1.05;
const BASE_BUST_HEIGHT = 2.8;
const CAMERA_FOV = 40;
/** Arrival matches the former sticky viewer: bust center at -0.45 NDC x. */
const ARRIVAL_CENTER_NDC_X = -0.45;
/** Camera distance on arrival, identical to the sticky viewer. */
const ARRIVAL_DISTANCE = 6;
/** First bust fills ~135% of the viewport height, as in the screening cut. */
const START_FILL = 1.35;
/** Below this camera progress the first bust keeps its gentle idle spin. */
const IDLE_SPIN_PROGRESS = 0.02;

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref(true);
const profileLabelOpacity = ref(1);
const profileCurveId = `bust-contour-${useId()}`;
const profileContour = ref<ReturnType<typeof projectProfileContour>>(null);
const refreshProfileContour = () => {
  const root = secondPlacement;
  if (!props.profileLabel || !root || !camera || !containerRef.value) return;
  const { width, height } = containerRef.value.getBoundingClientRect();
  if (width > 0 && height > 0) profileContour.value = projectProfileContour(root, camera, width, height);
};

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let firstGroup: THREE.Group | null = null;
let firstRoot: THREE.Object3D | null = null;
let secondPlacement: THREE.Group | null = null;
let secondGroup: THREE.Group | null = null;
let secondRoot: THREE.Object3D | null = null;
let firstBounds = new THREE.Box3();
let secondLocalBounds = new THREE.Box3();
const symptomEffects = createSymptomEffects(() => secondGroup);
const glassMaterial = createGlassMaterial();
const clayMaterial = createGeneratedShapeMaterial();
let positionCurve: THREE.CatmullRomCurve3 | null = null;
let targetCurve: THREE.CatmullRomCurve3 | null = null;
const tmpTarget = new THREE.Vector3();
let lastCameraProgress = -1;
let environmentTexture: THREE.Texture | null = null;
let animationFrameId = 0;
let viewportObserver: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let initialized = false;
let disposed = false;
let isVisible = false;
let lastRenderTime = 0;
let renderUntil = 0;
let visibilityChangeHandler: (() => void) | null = null;
let modelIsRotating = false;
let profileTurnTimer = 0;
let queuedSymptom: SymptomType | null = null;

type PerformanceNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const isConstrainedDevice = () => {
  const currentNavigator = navigator as PerformanceNavigator;
  return (
    currentNavigator.connection?.saveData === true ||
    (currentNavigator.deviceMemory ?? 8) <= 4 ||
    (currentNavigator.hardwareConcurrency ?? 8) <= 4
  );
};

const stopRendering = () => {
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  animationFrameId = 0;
};

const scheduleRender = (duration = 0) => {
  if (duration > 0) renderUntil = Math.max(renderUntil, performance.now() + duration);
  if (
    animationFrameId ||
    !renderer ||
    !isVisible ||
    document.hidden ||
    disposed
  ) return;
  animationFrameId = requestAnimationFrame(tick);
};

const needsContinuousRendering = () =>
  (!props.debugPath && lastCameraProgress < IDLE_SPIN_PROGRESS) ||
  modelIsRotating ||
  symptomEffects.isTransitioning() ||
  props.symptomType === "nipple";

// Normalize a freshly loaded GLB exactly like ThreeBustViewer does: strip the
// symptom skin helper, recenter, scale to the target height and lift slightly.
const normalizeLoadedBust = (root: THREE.Object3D, targetHeight: number) => {
  root.getObjectByName("SYMPTOM_skin")?.removeFromParent();
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && !child.geometry.getAttribute("normal")) {
      child.geometry.computeVertexNormals();
    }
  });
  const box = new THREE.Box3().setFromObject(root);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const scale = targetHeight / Math.max(size.x, size.y, size.z);
  root.scale.set(scale, scale, scale);
  root.position.sub(center.multiplyScalar(scale));
  root.position.y += 0.2;
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
};

const applyGlassMaterial = (root: THREE.Object3D) => {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;
    child.material = glassMaterial;
    child.material.needsUpdate = true;
  });
};

const applyClayMaterial = (root: THREE.Object3D) => {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;
    child.material = clayMaterial;
    child.material.needsUpdate = true;
  });
};

const registerSecondModelSymptoms = (root: THREE.Object3D) => {
  let primarySymptomMesh: THREE.Mesh | null = null;
  let primaryVertexCount = 0;
  const embeddedSymptomMeshes: THREE.Mesh[] = [];
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const vertexCount = child.geometry.getAttribute("position")?.count ?? 0;
    if (!child.userData.preserveMaterial && vertexCount > primaryVertexCount) {
      primarySymptomMesh = child;
      primaryVertexCount = vertexCount;
    }
    if (["asymmetry", "skin", "dimpling"].some(
      (name) => child.morphTargetDictionary?.[name] !== undefined
    )) {
      embeddedSymptomMeshes.push(child);
    }
  });
  new Set([
    ...embeddedSymptomMeshes,
    ...(primarySymptomMesh ? [primarySymptomMesh] : []),
  ]).forEach((mesh) => {
    symptomEffects.registerMesh(mesh, mesh === primarySymptomMesh);
  });
};

/**
 * Camera choreography. The move rides two Catmull-Rom splines (eye + look-at)
 * through four beats: screening framing, wide orbit on the first bust's right,
 * over-the-shoulder pass, then the arrival pose locked on the second bust.
 * The arrival beat reproduces the former sticky viewer pose (same distance,
 * same left-edge bleed) so the symptoms sequence starts pixel-identical.
 */
const buildCameraPath = () => {
  if (!camera || !firstGroup || !secondPlacement) return;
  const aspect = camera.aspect;
  const halfFov = THREE.MathUtils.degToRad(CAMERA_FOV) / 2;

  const firstSize = firstBounds.getSize(new THREE.Vector3());
  const firstCenter = firstBounds.getCenter(new THREE.Vector3());
  const secondSize = secondLocalBounds.getSize(new THREE.Vector3());
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

  // Beat 3 — over the right shoulder: the camera grazes the shoulder from the
  // front-right along the shoulder->second-bust axis, so the shoulder stays in
  // the near-field left of frame while the second bust appears ahead.
  const shoulderY = firstBounds.max.y - 0.18 * firstSize.y;
  const shoulderPoint = new THREE.Vector3(
    firstBounds.max.x * 0.85,
    shoulderY,
    firstCenter.z - 0.1 * firstSize.z
  );
  const secondChest = new THREE.Vector3(
    secondCenterWorld.x,
    secondCenterWorld.y + 0.22 * secondSize.y,
    secondCenterWorld.z
  );
  const p2 = new THREE.Vector3(
    shoulderPoint.x + 0.28 * firstSize.y,
    shoulderPoint.y + 0.05 * firstSize.y,
    shoulderPoint.z + 0.28 * firstSize.y
  );
  const t2 = shoulderPoint
    .clone()
    .lerp(secondChest, 0.9)
    .add(new THREE.Vector3(0.06 * firstSize.y, 0, 0));

  // Beat 2 — wide orbit keeping the first bust in frame while swinging right.
  const p1 = new THREE.Vector3(
    Math.max(p0.x, p2.x) + 0.3 * firstSize.x,
    THREE.MathUtils.lerp(p0.y, p2.y, 0.55) + 0.04 * firstSize.y,
    THREE.MathUtils.lerp(p0.z, p2.z, 0.55)
  );
  const t1 = new THREE.Vector3(
    firstCenter.x - 0.15 * firstSize.x,
    firstCenter.y + 0.1 * firstSize.y,
    firstCenter.z - 0.6 * firstSize.z
  );

  // Beat 4 — arrival, locked on the second bust in profile. The lateral
  // offset derives from the half-width at the true camera-to-subject distance
  // so the bust center lands exactly at the target NDC x (left edge bleed,
  // matching the former sticky viewer proportions).
  const arrivalHalfWidth = Math.tan(halfFov) * ARRIVAL_DISTANCE * aspect;
  const arrivalOffsetX = -ARRIVAL_CENTER_NDC_X * arrivalHalfWidth;
  const p3 = new THREE.Vector3(
    secondCenterWorld.x + arrivalOffsetX,
    secondCenterWorld.y + 0.6,
    secondCenterWorld.z + ARRIVAL_DISTANCE
  );
  const t3 = new THREE.Vector3(
    secondCenterWorld.x + arrivalOffsetX,
    secondCenterWorld.y - 0.2,
    secondCenterWorld.z
  );

  // Beats 4a/4b — exit the shoulder wide right, clear the first bust's back
  // plane, then dive left-down toward the arrival pose.
  const p2b = new THREE.Vector3(
    Math.max(p2.x - 0.15 * firstSize.y, firstBounds.max.x + 0.12 * firstSize.y),
    THREE.MathUtils.lerp(p2.y, p3.y, 0.35),
    firstBounds.min.z - 0.11 * firstSize.y
  );
  const p2c = new THREE.Vector3(
    THREE.MathUtils.lerp(p2b.x, p3.x, 0.6),
    THREE.MathUtils.lerp(p2b.y, p3.y, 0.75),
    THREE.MathUtils.lerp(p2b.z, p3.z, 0.5)
  );
  const t2b = t2.clone().lerp(t3, 0.55);

  positionCurve = new THREE.CatmullRomCurve3(
    [p0, p1, p2, p2b, p2c, p3],
    false,
    "centripetal"
  );
  targetCurve = new THREE.CatmullRomCurve3(
    [t0, t1, t2, t2b, t3],
    false,
    "centripetal"
  );

  if (props.debugPath && scene) {
    scene.getObjectByName("journey-debug")?.removeFromParent();
    const debugGroup = new THREE.Group();
    debugGroup.name = "journey-debug";
    const addCurve = (curve: THREE.CatmullRomCurve3, color: number) => {
      debugGroup.add(new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(curve.getPoints(120)),
        new THREE.LineBasicMaterial({ color })
      ));
      curve.points.forEach((point) => {
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
    scene.add(debugGroup);
  }
};

const updateCameraForProgress = (progress: number) => {
  if (!camera || !positionCurve || !targetCurve) return;
  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  positionCurve.getPoint(clamped, camera.position);
  targetCurve.getPoint(clamped, tmpTarget);
  camera.lookAt(tmpTarget);
  camera.updateMatrixWorld();
  if (props.debugPath) {
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
    (window as any).__journeyCanvas = canvasRef.value;
  }
  if (clamped >= 0.999 && lastCameraProgress < 0.999) {
    refreshProfileContour();
  }
  lastCameraProgress = clamped;
};

const getSecondCenterWorld = () => {
  if (!secondPlacement) return null;
  const center = secondPlacement.position.clone();
  center.y += 0.2;
  return center;
};

const initThree = async () => {
  if (initialized || disposed || !canvasRef.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (!width || !height) return;
  // A fixed viewport-filling container is never taller than the viewport; if
  // it is, a transformed ancestor is absorbing `fixed` (loading-gate exit).
  // Retry once that transform has transitioned away.
  if (height > window.innerHeight * 1.5) {
    initialized = false;
    window.setTimeout(() => void initThree(), 700);
    return;
  }
  initialized = true;
  const constrainedDevice = isConstrainedDevice();

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);

  renderer = new THREE.WebGLRenderer({
    canvas: canvasRef.value,
    alpha: true,
    antialias: true,
    // Debug captures rely on toDataURL, which needs the drawing buffer kept.
    preserveDrawingBuffer: props.debugPath,
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, constrainedDevice ? 1 : 1.25));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.15;

  const [{ RoomEnvironment }, { GLTFLoader }] = await Promise.all([
    import("three/examples/jsm/environments/RoomEnvironment.js"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
  ]);
  if (disposed) return;
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  scene.environment = environmentTexture;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  // Lighting mirrors ThreeBustViewer so both busts keep their studio look.
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.5);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(0xf472b6, 3.0);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
  fillLight.position.set(-6, 2, 4);
  scene.add(fillLight);
  const topLight = new THREE.PointLight(0xffe4e6, 2.0, 10);
  topLight.position.set(0, 3, 2);
  scene.add(topLight);

  firstGroup = new THREE.Group();
  scene.add(firstGroup);
  secondPlacement = new THREE.Group();
  secondGroup = new THREE.Group();
  secondPlacement.add(secondGroup);
  scene.add(secondPlacement);

  const loader = new GLTFLoader();
  const loadBust = (url: string) =>
    new Promise<THREE.Object3D | null>((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      loader.load(
        url,
        (gltf) => resolve(gltf.scene),
        undefined,
        (error) => {
          console.error("Journey stage: unable to load bust, skipping it.", error);
          resolve(null);
        }
      );
    });

  const [firstScene, secondScene] = await Promise.all([
    loadBust(props.firstModelUrl),
    loadBust(props.secondModelUrl),
  ]);
  if (disposed || !renderer || !scene || !camera) return;

  if (firstScene && firstGroup) {
    firstBounds = normalizeLoadedBust(firstScene, BASE_BUST_HEIGHT * FIRST_MODEL_SCALE);
    applyGlassMaterial(firstScene);
    firstRoot = firstScene;
    firstGroup.add(firstScene);
  }

  if (secondScene && secondGroup) {
    secondLocalBounds = normalizeLoadedBust(secondScene, BASE_BUST_HEIGHT * SECOND_MODEL_SCALE);
    applyClayMaterial(secondScene);
    // Place the second bust deep and left of the first one so the camera can
    // travel over the shoulder before settling in front of it.
    const firstSize = firstBounds.getSize(new THREE.Vector3());
    secondPlacement.position.set(
      -(firstSize.x * 0.75 + 1.4),
      0,
      -(firstSize.y * 1.55 + 3.4)
    );
    secondRoot = secondScene;
    secondGroup.add(secondScene);
    secondGroup.rotation.y = props.secondRotationY;
    registerSecondModelSymptoms(secondScene);
    symptomEffects.build(secondScene, props.symptomType);
    symptomEffects.applyTint(props.symptomType);
  }

  buildCameraPath();
  updateCameraForProgress(props.cameraProgress);
  refreshProfileContour();
  isLoading.value = false;
  scheduleRender();
};

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;

  const rect = containerRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;
  if (!width || !height) return;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  buildCameraPath();
  updateCameraForProgress(lastCameraProgress >= 0 ? lastCameraProgress : props.cameraProgress);
  renderer.setSize(width, height, false);
  refreshProfileContour();
  scheduleRender();
};

const tick = (timestamp: number) => {
  animationFrameId = 0;
  if (!renderer || !scene || !camera) return;
  if (!isVisible || document.hidden || disposed) return;

  const targetFps = isConstrainedDevice()
    ? 24
    : modelIsRotating
      ? 60
      : 30;
  if (timestamp - lastRenderTime < 1000 / targetFps) {
    scheduleRender();
    return;
  }
  lastRenderTime = timestamp;

  const elapsedTime = timestamp / 1000;

  // While the opening framing holds, the first bust keeps the same gentle
  // idle spin and float as the standalone screening viewer. Debug mode freezes
  // it so the camera path can be inspected frame by frame.
  if (firstGroup && firstRoot && !props.debugPath && lastCameraProgress < IDLE_SPIN_PROGRESS) {
    firstRoot.rotation.y += 0.0028;
    firstGroup.position.y = Math.sin(elapsedTime * 1.5) * 0.05;
    scheduleRender();
  }

  symptomEffects.tick(elapsedTime);
  renderer.render(scene, camera);
  if (needsContinuousRendering() || timestamp < renderUntil) scheduleRender();
};

onMounted(() => {
  if (!process.client || !containerRef.value) return;

  visibilityChangeHandler = () => {
    if (document.hidden) stopRendering();
    else scheduleRender();
  };
  document.addEventListener("visibilitychange", visibilityChangeHandler);

  viewportObserver = new IntersectionObserver(
    ([entry]) => {
      isVisible = entry.isIntersecting;
      if (!isVisible) {
        stopRendering();
        return;
      }
      if (!initialized) void initThree();
      else scheduleRender();
    },
    { rootMargin: "200px 0px", threshold: 0 }
  );
  viewportObserver.observe(containerRef.value);

  resizeObserver = new ResizeObserver(handleResize);
  resizeObserver.observe(containerRef.value);
});

onUnmounted(() => {
  disposed = true;
  window.clearTimeout(profileTurnTimer);
  viewportObserver?.disconnect();
  resizeObserver?.disconnect();
  if (visibilityChangeHandler) {
    document.removeEventListener("visibilitychange", visibilityChangeHandler);
  }
  stopRendering();
  if (renderer) {
    renderer.dispose();
    renderer.forceContextLoss();
  }
  environmentTexture?.dispose();
  glassMaterial.dispose();
  clayMaterial.dispose();

  [firstRoot, secondRoot].forEach((root) => {
    root?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  });
  symptomEffects.dispose();
  if (secondGroup) gsap.killTweensOf(secondGroup.rotation);

  if (scene) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material !== glassMaterial && material !== clayMaterial) material?.dispose();
        });
      }
    });
  }

  renderer = null;
  scene = null;
  camera = null;
  firstGroup = null;
  firstRoot = null;
  secondPlacement = null;
  secondGroup = null;
  secondRoot = null;
  positionCurve = null;
  targetCurve = null;
});

watch(
  () => props.cameraProgress,
  (progress) => {
    updateCameraForProgress(progress);
    scheduleRender(400);
  }
);

watch(
  () => props.secondRotationY,
  (rotationY) => {
    if (!secondGroup) return;
    window.clearTimeout(profileTurnTimer);
    const returnsToProfile = Math.abs(rotationY - Math.PI / 2) < 0.01;
    modelIsRotating = true;

    const turn = () => {
      gsap.to(secondGroup!.rotation, {
        y: rotationY,
        duration: 0.7,
        ease: "power2.inOut",
        overwrite: true,
        onUpdate: () => scheduleRender(),
        onComplete: () => {
          modelIsRotating = false;
          if (returnsToProfile) {
            refreshProfileContour();
            profileLabelOpacity.value = 1;
          } else if (queuedSymptom) {
            const symptom = queuedSymptom;
            queuedSymptom = null;
            symptomEffects.update(symptom);
          }
          scheduleRender(120);
        },
      });
    };

    // The curved label belongs to the profile view. Fade it out completely
    // before the bust turns so the two motions never compete visually.
    if (!returnsToProfile && profileLabelOpacity.value > 0) {
      profileLabelOpacity.value = 0;
      profileTurnTimer = window.setTimeout(turn, 250);
    } else {
      turn();
    }
  }
);

watch(
  () => props.symptomType,
  (newSymptom) => {
    if (newSymptom === "none") {
      queuedSymptom = null;
      symptomEffects.update(newSymptom);
    } else if (modelIsRotating) {
      queuedSymptom = newSymptom;
      return;
    } else {
      symptomEffects.update(newSymptom);
    }
    scheduleRender(newSymptom === "nipple" ? 0 : 150);
  }
);
</script>
