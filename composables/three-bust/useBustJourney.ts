import { isConstrainedDevice, getRenderPixelRatio, normalizeLoadedBust, getBustChestFraming, registerBustSymptoms, addBustLighting } from "~/components/ui/three-bust/scene-utils";
import { useBustSymptomPresentation } from "./useBustSymptomPresentation";
import { createJourneyFruits } from "~/components/ui/three-bust/journey-fruits";
import { createJourneyCamera, CAMERA_FOV } from "~/components/ui/three-bust/journey-camera";
import { ref, onMounted, onUnmounted, watch, useId } from "vue";
import { createPalpationPlayback } from "~/components/ui/three-bust/palpation-playback";
import { projectProfileContour } from "~/components/ui/three-bust/profile-contour";
import { createIridescentMaterial } from "~/components/ui/three-bust/materials";
import * as THREE from "three";
import { gsap } from "gsap";
import {
  createSymptomEffects,
} from "~/components/ui/three-bust/symptom-effects";

import type { BustJourneyProps, BustJourneyEvents } from "~/components/ui/three-bust/types";

export function useBustJourney(props: Required<BustJourneyProps>, emit: BustJourneyEvents) {
  // Tuning constants for the scripted camera move. Proportions are derived from
  // each bust's normalized bounds so a new GLB keeps the same framing.
  const FIRST_MODEL_SCALE = 1.15;
  const SECOND_MODEL_SCALE = 1.65;
  const BASE_BUST_HEIGHT = 2.8;
  const containerRef = ref<HTMLDivElement | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const isLoading = ref(true);
  const secondModelLoading = ref(true);
  let fruits: ReturnType<typeof createJourneyFruits> | null = null;
  let secondLoadVersion = 0;
  let loadBust: ((url: string) => Promise<import("three/examples/jsm/loaders/GLTFLoader.js").GLTF | null>) | null = null;
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
  let chestFraming: ReturnType<typeof getBustChestFraming> = null;
  const secondBaseMaterials = new Map<THREE.Material, { opacity: number; transparent: boolean; depthWrite: boolean }>();
  let animationPlayback: ReturnType<typeof createPalpationPlayback> | null = null;
  const animationTime = ref(0);
  let previousAnimationTimestamp = 0;
  let reduceMotion = false;
  // Mobile skips the screening bust and keeps a virtual departure anchor
  // until the fruit selection. Only desktop needs to load the first GLB.
  let firstBounds = new THREE.Box3(new THREE.Vector3(-1, -1.4, -0.5), new THREE.Vector3(1, 1.82, 0.5));
  let loadingFirstModel = false;
  const symptomEffects = createSymptomEffects(() => secondGroup);
  const presentation = useBustSymptomPresentation({
    getGroup: () => secondGroup, getRotation: () => props.secondRotationY,
    getSymptom: () => props.symptomType, effects: symptomEffects,
    refreshProfileContour, scheduleRender: (duration) => scheduleRender(duration),
    onSymptomReady: (symptom) => emit("symptomReady", symptom),
  });
  const { profileLabelOpacity } = presentation;

  // Separate instances keep the second bust's fade and symptom tint independent.
  const firstMaterial = createIridescentMaterial();
  const secondMaterial = createIridescentMaterial();
  const secondMaterialDefaults = {
    opacity: secondMaterial.opacity,
    transparent: secondMaterial.transparent,
    depthWrite: secondMaterial.depthWrite,
  };
  const symptomFraming = { progress: props.focusSymptoms || props.palpationProgress > 0 ? 1 : 0 };
  let framingNotified = false;
  const notifyFramingReady = () => {
    if (!framingNotified && isVisible && props.focusSymptoms && symptomFraming.progress >= 0.999 &&
      !presentation.isRotating && secondGroup && Math.abs(secondGroup.rotation.y) < 0.001) {
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
    presentation.isRotating ||
    symptomEffects.isTransitioning() ||
    props.symptomType === "nipple" ||
    (props.fruitSelectionActive === true && !reduceMotion) ||
    (props.fruitTransitionActive === true && !reduceMotion);

  const applyBustMaterial = (root: THREE.Object3D, material: THREE.Material) => {
    root.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;
      child.material = material;
      child.material.needsUpdate = true;
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

  const journeyCamera = createJourneyCamera({
    getSceneState: () => ({ camera, firstBounds, secondPlacement, scene }),
    isDebug: () => props.debugPath,
    getSelectedFruitIndex: () => props.selectedFruitIndex,
    getPalpationProgress: () => props.palpationProgress,
    getPalpationFraming: () => chestFraming,
    getSymptomFocus: () => symptomFraming.progress,
    getCanvas: () => canvasRef.value,
    refreshProfileContour,
  });
  const { buildCameraPath, updateCameraForProgress } = journeyCamera;

  const disposeRoot = (root: THREE.Object3D | null) => {
    root?.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      (Array.isArray(child.material) ? child.material : [child.material]).forEach(material => {
        if (material !== firstMaterial && material !== secondMaterial) material.dispose();
      });
    });
  };
  const clearSecondModel = () => {
    animationPlayback?.dispose();
    animationPlayback = null;
    symptomEffects.dispose();
    secondBaseMaterials.clear();
    Object.assign(secondMaterial, secondMaterialDefaults);
    secondMaterial.needsUpdate = true;
    disposeRoot(secondRoot);
    secondGroup?.clear();
    secondRoot = null;
    chestFraming = null;
    animationTime.value = 0;
    previousAnimationTimestamp = 0;
    profileContour.value = null;
    framingNotified = false;
  };
  const attachSecondModel = (gltf: import("three/examples/jsm/loaders/GLTFLoader.js").GLTF | null) => {
    const secondScene = gltf?.scene;
    if (secondScene && secondGroup && secondPlacement) {
      clearSecondModel();
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
      chestFraming = getBustChestFraming(secondScene);
      secondGroup.rotation.y = props.secondRotationY;
      registerBustSymptoms(secondScene, !!gltf?.animations.some(clip =>
        clip.tracks.some(track => track.name.includes("morphTargetInfluences"))
      ), symptomEffects);
      if (gltf?.animations.length) {
        animationPlayback = createPalpationPlayback(secondScene, gltf.animations, gltf.parser.json.extras?.palpationStudy?.steps ?? []);
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

    secondModelLoading.value = false;
  };
  const replaceSecondModel = async (url: string) => {
    if (!loadBust || !initialized || isLoading.value) return;
    const version = ++secondLoadVersion;
    secondModelLoading.value = true;
    const gltf = await loadBust(url);
    if (disposed || version !== secondLoadVersion) { disposeRoot(gltf?.scene ?? null); return; }
    if (gltf) { attachSecondModel(gltf); emit("modelReady", url); }
    secondModelLoading.value = false;
    buildCameraPath();
    updateCameraForProgress(props.cameraProgress);
    refreshProfileContour();
    scheduleRender(500);
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
    reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(CAMERA_FOV, width / height, 0.1, 100);
    scene.add(camera);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: true,
      antialias: true,
      // Debug captures rely on toDataURL, which needs the drawing buffer kept.
      preserveDrawingBuffer: props.debugPath,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(getRenderPixelRatio());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    const [{ RoomEnvironment }, { GLTFLoader }, { MeshoptDecoder }] = await Promise.all([
      import("three/examples/jsm/environments/RoomEnvironment.js"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/libs/meshopt_decoder.module.js"),
    ]);
    if (disposed) return;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
    scene.environment = environmentTexture;
    roomEnvironment.dispose();
    pmremGenerator.dispose();

    addBustLighting(scene);

    firstGroup = new THREE.Group();
    scene.add(firstGroup);
    firstGroup.visible = window.innerWidth >= 1024;
    secondPlacement = new THREE.Group();
    secondGroup = new THREE.Group();
    secondPlacement.add(secondGroup);
    scene.add(secondPlacement);

    const loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
    loadBust = (url: string) =>
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

    const loadedSecondUrl = props.secondModelUrl;
    const [firstGLTF, secondGLTF] = await Promise.all([
      window.innerWidth >= 1024 ? loadBust(props.firstModelUrl) : Promise.resolve(null),
      loadBust(loadedSecondUrl),
    ]);
    if (disposed || !renderer || !scene || !camera) {
      disposeRoot(firstGLTF?.scene ?? null);
      disposeRoot(secondGLTF?.scene ?? null);
      return;
    }

    const firstScene = firstGLTF?.scene;
    if (firstScene && firstGroup) {
      firstBounds = normalizeLoadedBust(firstScene, BASE_BUST_HEIGHT * FIRST_MODEL_SCALE);
      applyBustMaterial(firstScene, firstMaterial);
      firstRoot = firstScene;
      firstGroup.add(firstScene);
    }

    attachSecondModel(secondGLTF);
    if (secondGLTF) emit("modelReady", loadedSecondUrl);

    fruits = createJourneyFruits(scene, reduceMotion);
    await fruits.ready;
    if (disposed) return;
    fruits.select(props.selectedFruitIndex, props.hoveredFruitIndex);
    fruits.setActive(props.fruitSelectionActive);
    emit("fruitReady");

    buildCameraPath();
    fruits?.place(journeyCamera.getFruitCenter(), camera.aspect, CAMERA_FOV);
    updateCameraForProgress(props.cameraProgress);
    refreshProfileContour();
    isLoading.value = false;
    if (props.secondModelUrl !== loadedSecondUrl) void replaceSecondModel(props.secondModelUrl);
    scheduleRender();
  };

  const handleResize = () => {
    if (!containerRef.value || !camera || !renderer) return;

    const rect = containerRef.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return;

    camera.aspect = width / height;
    if (firstGroup) firstGroup.visible = window.innerWidth >= 1024;
    // A tablet rotation or desktop resize can reveal the shared screening bust.
    if (window.innerWidth >= 1024 && !isLoading.value && !firstRoot && !loadingFirstModel && loadBust) {
      loadingFirstModel = true;
      void loadBust(props.firstModelUrl).then(gltf => {
        loadingFirstModel = false;
        if (disposed || !firstGroup) { disposeRoot(gltf?.scene ?? null); return; }
        if (!gltf) return;
        firstRoot = gltf.scene;
        firstBounds = normalizeLoadedBust(firstRoot, BASE_BUST_HEIGHT * FIRST_MODEL_SCALE);
        applyBustMaterial(firstRoot, firstMaterial);
        firstGroup.add(firstRoot);
        const size = firstBounds.getSize(new THREE.Vector3());
        secondPlacement?.position.set(size.x * 1.15 + 2.2, 0, -(size.y * 1.55 + 3.4));
        handleResize();
      });
    }
    camera.updateProjectionMatrix();
    buildCameraPath();
    fruits?.place(journeyCamera.getFruitCenter(), camera.aspect, CAMERA_FOV);
    updateCameraForProgress(journeyCamera.progress >= 0 ? journeyCamera.progress : props.cameraProgress);
    renderer.setPixelRatio(getRenderPixelRatio());
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
      : props.fruitTransitionActive || presentation.isRotating
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

    const fruitOpacity = props.cameraProgress < 0.5
      ? THREE.MathUtils.smoothstep(props.cameraProgress, 0.38, 0.5)
      : 1 - THREE.MathUtils.smoothstep(props.cameraProgress, 0.5, 0.68);
    fruits?.tick(elapsedTime, fruitOpacity, props.fruitTransitionActive ? props.fruitTransitionProgress : null, camera);
    symptomEffects.tick(elapsedTime);
    notifyFramingReady();
    presentation.notifySymptomReady();
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
        isVisible = entry?.isIntersecting ?? false;
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
    fruits?.dispose();
    ++secondLoadVersion;
    disposed = true;
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
    journeyCamera.dispose();
  });

  watch(() => props.secondModelUrl, url => { void replaceSecondModel(url); });
  watch(() => props.fruitSelectionActive, active => {
    fruits?.setActive(active);
    scheduleRender(200);
  });
  watch(() => [props.fruitTransitionActive, props.fruitTransitionProgress], () => scheduleRender(400));
  watch(() => [props.selectedFruitIndex, props.hoveredFruitIndex], () => {
    fruits?.select(props.selectedFruitIndex, props.hoveredFruitIndex);
    buildCameraPath();
    updateCameraForProgress(props.cameraProgress);
    scheduleRender(200);
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

  return {
    containerRef, canvasRef, isLoading, secondModelLoading, animationTime,
    profileLabelOpacity, profileCurveId, profileContour,
  };
}
