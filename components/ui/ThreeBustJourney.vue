<template>
  <div ref="containerRef" class="relative h-full w-full" :data-animation-step="animationStep" :data-animation-time="animationTime.toFixed(2)" :data-model-rotation="secondRotationY">
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
        opacity: isLoading || profileLabelProgress <= 0 ? 0 : profileLabelOpacity * secondModelOpacity,
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
import { createPalpationPlayback } from "./three-bust/palpation-playback";
import { projectProfileContour } from "./three-bust/profile-contour";
import { createIridescentMaterial } from "./three-bust/materials";
import * as THREE from "three";
import { gsap } from "gsap";
import {
  createSymptomEffects,
  type SymptomType,
} from "./three-bust/symptom-effects";

interface Props {
  animationStep?: string;
  firstModelUrl?: string;
  secondModelUrl?: string;
  /** 0: screening framing on the first bust · 1: locked profile framing on the second. */
  cameraProgress?: number;
  focusSymptoms?: boolean;
  /** Scroll progress between symptoms and the closer palpation framing. */
  palpationProgress?: number;
  secondModelOpacity?: number;
  symptomType?: SymptomType;
  profileLabel?: string;
  profileLabelProgress?: number;
  secondRotationY?: number;
  debugPath?: boolean;
}

const emit = defineEmits<{
  framingReady: [];
  symptomReady: [symptom: SymptomType];
}>();

const props = withDefaults(defineProps<Props>(), {
  animationStep: "observation",
  firstModelUrl: "",
  secondModelUrl: "",
  cameraProgress: 0,
  focusSymptoms: false,
  palpationProgress: 0,
  secondModelOpacity: 1,
  symptomType: "none",
  profileLabel: "",
  profileLabelProgress: 0,
  secondRotationY: 0,
  debugPath: false,
});

// Tuning constants for the scripted camera move. Proportions are derived from
// each bust's normalized bounds so a new GLB keeps the same framing.
const FIRST_MODEL_SCALE = 1.15;
const SECOND_MODEL_SCALE = 1.65;
const BASE_BUST_HEIGHT = 2.8;
const CAMERA_FOV = 40;
/** Keep the symptoms bust slightly left of center to clear the cards. */
const ARRIVAL_CENTER_NDC_X = -0.52;
/** Camera distance on arrival, identical to the sticky viewer. */
const ARRIVAL_DISTANCE = 6;
/** First bust fills ~135% of the viewport height, as in the screening cut. */
const START_FILL = 1.35;
const SYMPTOMS_ZOOM = 1.9;
const PALPATION_ZOOM = 1.65;

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
const secondBaseMaterials = new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
let animationPlayback: ReturnType<typeof createPalpationPlayback> | null = null;
const animationTime = ref(0);
let previousAnimationTimestamp = 0;
let reduceMotion = false;
let firstBounds = new THREE.Box3();
const symptomEffects = createSymptomEffects(() => secondGroup);
// Separate instances keep the second bust's fade and symptom tint independent.
const firstMaterial = createIridescentMaterial();
const secondMaterial = createIridescentMaterial();
let positionCurve: THREE.CubicBezierCurve3 | null = null;
let targetCurve: THREE.CubicBezierCurve3 | null = null;
const tmpTarget = new THREE.Vector3();
let lastCameraProgress = -1;
const symptomFraming = { progress: props.focusSymptoms || props.palpationProgress > 0 ? 1 : 0 };
let lastSettledSymptom: SymptomType = "none";
let framingNotified = false;
const notifyFramingReady = () => {
  if (!framingNotified && isVisible && props.focusSymptoms && symptomFraming.progress >= 0.999 &&
    !modelIsRotating && secondGroup && Math.abs(secondGroup.rotation.y) < 0.001) {
    framingNotified = true;
    emit("framingReady");
  }
};
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
  (animationPlayback?.active && !reduceMotion) ||
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

const applyBustMaterial = (root: THREE.Object3D, material: THREE.Material) => {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;
    child.material = material;
    child.material.needsUpdate = true;
  });
};

const registerSecondModelSymptoms = (root: THREE.Object3D, animated: boolean) => {
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
    symptomEffects.registerMesh(mesh, mesh === primarySymptomMesh && !animated);
  });
};

const updateSecondModelOpacity = (opacity: number) => {
  const alpha = THREE.MathUtils.clamp(opacity, 0, 1);
  if (secondPlacement) secondPlacement.visible = alpha > 0;
  secondBaseMaterials.forEach((original, material) => {
    const fading = alpha < 1;
    const transparent = original.transparent || fading;
    const depthWrite = original.depthWrite && !fading;
    if (material.transparent !== transparent || material.depthWrite !== depthWrite) {
      material.transparent = transparent;
      material.depthWrite = depthWrite;
      material.needsUpdate = true;
    }
    material.opacity = original.opacity * alpha;
  });
  symptomEffects.setGlobalOpacity(alpha);
  scheduleRender(120);
};

/**
 * Camera choreography. Matched eye and look-at curves travel directly past
 * the first bust's screen-right shoulder toward the second bust, without reversing
 * horizontal direction.
 * The arrival beat keeps the symptoms bust near the left edge as the
 * screening camera hands off to this shared scene.
 */
const buildCameraPath = () => {
  if (!camera || !firstGroup || !secondPlacement) return;
  const aspect = camera.aspect;
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
  const arrivalHalfWidth = Math.tan(halfFov) * ARRIVAL_DISTANCE * aspect;
  const arrivalOffsetX = -ARRIVAL_CENTER_NDC_X * arrivalHalfWidth;
  const arrival = new THREE.Vector3(
    secondCenterWorld.x + arrivalOffsetX,
    secondCenterWorld.y + 0.6,
    secondCenterWorld.z + ARRIVAL_DISTANCE
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
  positionCurve = new THREE.CubicBezierCurve3(p0, eye1, eye2, arrival);
  targetCurve = new THREE.CubicBezierCurve3(t0, look1, look2, arrivalTarget);

  if (props.debugPath && scene) {
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
    scene.add(debugGroup);
  }
};

const updateCameraForProgress = (progress: number) => {
  if (!camera || !positionCurve || !targetCurve) return;
  const clamped = THREE.MathUtils.clamp(progress, 0, 1);
  positionCurve.getPoint(clamped, camera.position);
  targetCurve.getPoint(clamped, tmpTarget);
  // Keep the chest in the same left column through symptoms and palpation.
  const focus = symptomFraming.progress * clamped;
  const palpation = THREE.MathUtils.clamp(props.palpationProgress, 0, 1) * clamped;
  camera.zoom = THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(1, SYMPTOMS_ZOOM, focus), PALPATION_ZOOM, palpation
  );
  const offsetX = -ARRIVAL_CENTER_NDC_X * Math.tan(THREE.MathUtils.degToRad(CAMERA_FOV) / 2) * ARRIVAL_DISTANCE * camera.aspect;
  const correctionX = offsetX * (1 - 1 / camera.zoom);
  camera.position.x -= correctionX;
  tmpTarget.x -= correctionX;
  camera.position.y -= 0.2 * focus;
  tmpTarget.y -= 0.2 * focus;
  camera.updateProjectionMatrix();
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
  renderer.toneMappingExposure = 0.9;

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
    new Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF | null>((resolve) => {
      if (!url) {
        resolve(null);
        return;
      }
      loader.load(
        url,
        (gltf) => resolve(gltf),
        undefined,
        (error) => {
          console.error("Journey stage: unable to load bust, skipping it.", error);
          resolve(null);
        }
      );
    });

  const [firstGLTF, secondGLTF] = await Promise.all([
    loadBust(props.firstModelUrl),
    loadBust(props.secondModelUrl),
  ]);
  if (disposed || !renderer || !scene || !camera) return;

  const firstScene = firstGLTF?.scene;
  const secondScene = secondGLTF?.scene;
  if (firstScene && firstGroup) {
    firstBounds = normalizeLoadedBust(firstScene, BASE_BUST_HEIGHT * FIRST_MODEL_SCALE);
    applyBustMaterial(firstScene, firstMaterial);
    firstRoot = firstScene;
    firstGroup.add(firstScene);
  }

  if (secondScene && secondGroup) {
    normalizeLoadedBust(secondScene, BASE_BUST_HEIGHT * SECOND_MODEL_SCALE);
    secondScene.position.y -= 0.48;
    applyBustMaterial(secondScene, secondMaterial);
    // Place the second bust deep and to screen right, along the camera's
    // shoulder pass, while preserving the final framing around that bust.
    const firstSize = firstBounds.getSize(new THREE.Vector3());
    secondPlacement.position.set(
      firstSize.x * 1.15 + 2.2,
      0,
      -(firstSize.y * 1.55 + 3.4)
    );
    secondRoot = secondScene;
    secondGroup.add(secondScene);
    secondGroup.rotation.y = props.secondRotationY;
    registerSecondModelSymptoms(secondScene, !!secondGLTF?.animations.some(clip =>
      clip.tracks.some(track => track.name.includes("morphTargetInfluences"))
    ));
    if (secondGLTF?.animations.length) {
      animationPlayback = createPalpationPlayback(secondScene, secondGLTF.animations, secondGLTF.parser.json.extras?.palpationStudy?.steps ?? []);
      animationPlayback.selectStep(props.animationStep);
      reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    }
    symptomEffects.build(secondScene, props.symptomType);
    symptomEffects.applyTint(props.symptomType);
    secondScene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => {
        if (!secondBaseMaterials.has(material)) {
          secondBaseMaterials.set(material, {
            opacity: material.opacity,
            transparent: material.transparent,
            depthWrite: material.depthWrite,
          });
        }
      });
    });
    updateSecondModelOpacity(props.secondModelOpacity);
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
  if (animationPlayback?.active && !reduceMotion) {
    animationPlayback.update(previousAnimationTimestamp ? Math.min((timestamp - previousAnimationTimestamp) / 1000, 0.1) : 0);
    animationTime.value = animationPlayback.time;
  }
  previousAnimationTimestamp = timestamp;

  symptomEffects.tick(elapsedTime);
  notifyFramingReady();
  if (!symptomEffects.isTransitioning() && !modelIsRotating && !queuedSymptom &&
    lastSettledSymptom !== props.symptomType) {
    lastSettledSymptom = props.symptomType;
    if (props.symptomType !== "none") emit("symptomReady", props.symptomType);
  }
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
  animationPlayback?.dispose();
  disposed = true;
  window.clearTimeout(profileTurnTimer);
  gsap.killTweensOf(symptomFraming);
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
  firstMaterial.dispose();
  secondMaterial.dispose();

  [firstRoot, secondRoot].forEach((root) => {
    root?.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
      }
    });
  });
  symptomEffects.dispose();
  secondBaseMaterials.clear();
  if (secondGroup) gsap.killTweensOf(secondGroup.rotation);

  if (scene) {
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Line) {
        child.geometry?.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material !== firstMaterial && material !== secondMaterial) material?.dispose();
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

watch(() => props.animationStep, step => {
  animationPlayback?.selectStep(step);
  animationTime.value = animationPlayback?.time ?? 0;
  previousAnimationTimestamp = 0;
  scheduleRender();
});

watch(
  () => props.cameraProgress,
  (progress) => {
    updateCameraForProgress(progress);
    scheduleRender(400);
  }
);

watch([() => props.focusSymptoms, () => props.palpationProgress > 0], ([focused, palpating]) => {
  framingNotified = false;
  gsap.to(symptomFraming, {
    progress: focused || palpating ? 1 : 0,
    duration: reduceMotion ? 0 : 0.9,
    ease: "power2.inOut",
    overwrite: true,
    onUpdate: () => {
      updateCameraForProgress(props.cameraProgress);
      scheduleRender();
    },
    onComplete: () => {
      refreshProfileContour();
      notifyFramingReady();
    },
  });
});

watch(() => props.palpationProgress, () => {
  updateCameraForProgress(props.cameraProgress);
  scheduleRender();
});

watch(() => props.secondModelOpacity, updateSecondModelOpacity);

watch(
  () => props.secondRotationY,
  (rotationY) => {
    if (!secondGroup) return;
    window.clearTimeout(profileTurnTimer);
    const returnsToProfile = Math.abs(Math.abs(rotationY) - Math.PI / 2) < 0.01;
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
    lastSettledSymptom = "none";
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
