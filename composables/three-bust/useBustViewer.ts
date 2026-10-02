import { useViewerFraming } from "./useViewerFraming";
import { isConstrainedDevice, normalizeLoadedBust, registerBustSymptoms, addBustLighting } from "~/components/ui/three-bust/scene-utils";
import { useBustSymptomPresentation } from "./useBustSymptomPresentation";
import { computed, ref, onMounted, onUnmounted, watch, useId } from "vue";
import { useBustPlayback } from "./useBustPlayback";
import { projectProfileContour } from "~/components/ui/three-bust/profile-contour";
import * as THREE from "three";
import {
  createSymptomEffects,
} from "~/components/ui/three-bust/symptom-effects";

import { createMockBustController } from "~/components/ui/three-bust/mock-bust";
import { createViewerMaterials } from "~/components/ui/three-bust/viewer-materials";
import type { BustViewerProps, BustEvents } from "~/components/ui/three-bust/types";

export function useBustViewer(props: Required<Omit<BustViewerProps, "animationStep">> & Pick<BustViewerProps, "animationStep">, emit: BustEvents) {
  const materialBackdropClass = computed(() => {
    if (props.materialStyle === "glass") {
      return "bg-[radial-gradient(circle_at_55%_45%,rgba(255,255,255,0.96)_0%,rgba(219,238,255,0.72)_34%,rgba(255,221,237,0.38)_62%,transparent_78%)]";
    }
    if (props.materialStyle === "glow") {
      return "bg-[radial-gradient(circle_at_55%_48%,#4b164b_0%,#1c0a2d_44%,#080411_78%)]";
    }
    if (props.materialStyle === "iridescent") {
      return "bg-[radial-gradient(circle_at_55%_45%,rgba(255,255,255,0.95)_0%,rgba(213,255,250,0.6)_30%,rgba(230,216,255,0.55)_55%,rgba(255,226,239,0.35)_76%,transparent_88%)]";
    }
    return "bg-transparent";
  });

  const containerRef = ref<HTMLDivElement | null>(null);
  const canvasRef = ref<HTMLCanvasElement | null>(null);
  const isLoading = ref(true);
  const profileCurveId = `bust-contour-${useId()}`;
  const profileContour = ref<ReturnType<typeof projectProfileContour>>(null);
  const refreshProfileContour = () => {
    const root = loadedBustModel ?? mockBust;
    if (!props.profileLabel || !root || !camera || !containerRef.value) return;
    const { width, height } = containerRef.value.getBoundingClientRect();
    if (width > 0 && height > 0) profileContour.value = projectProfileContour(root, camera, width, height);
  };

  // Three.js instances
  let renderer: THREE.WebGLRenderer | null = null;
  let scene: THREE.Scene | null = null;
  let camera: THREE.PerspectiveCamera | null = null;
  let modelGroup: THREE.Group | null = null;
  let mockBust: THREE.Group | null = null;
  let loadedBustModel: THREE.Object3D | null = null;
  const playback = useBustPlayback({
    getStep: () => props.animationStep, isEnabled: () => props.animationEnabled,
    scheduleRender: () => scheduleRender(),
  });
  const {
    animationDuration, animationTime, animationPlaying, animationSteps,
    currentAnimationStep, currentAnimationSegment, animationGestureLabel,
    selectAnimationStep, toggleAnimation, seekAnimation,
  } = playback;
  const symptomEffects = createSymptomEffects(() => modelGroup);
  const presentation = useBustSymptomPresentation({
    getGroup: () => modelGroup, getRotation: () => props.initialRotationY,
    getSymptom: () => props.symptomType, effects: symptomEffects,
    refreshProfileContour, scheduleRender: (duration) => scheduleRender(duration),
    onSymptomReady: (symptom) => emit("symptomReady", symptom),
  });
  const { profileLabelOpacity } = presentation;

  let controls: import("three/examples/jsm/controls/OrbitControls.js").OrbitControls & { state?: number } | null = null;
  let environmentTexture: THREE.Texture | null = null;
  let animationFrameId = 0;
  let viewportObserver: IntersectionObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let initTimer = 0;
  let initialized = false;
  let disposed = false;
  let isVisible = false;
  let lastRenderTime = 0;
  let renderUntil = 0;
  let visibilityChangeHandler: (() => void) | null = null;
  let controlsActive = false;
  const needsContinuousRendering = () =>
    playback.needsFrames ||
    (props.autoRotate && !playback.hasAnimation) ||
    controlsActive ||
    presentation.isRotating ||
    symptomEffects.isTransitioning() ||
    props.symptomType === "nipple" ||
    props.materialStyle === "glow";

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

  const { alignModelHorizontally, updateSymptomFraming, notifyFramingReady } = useViewerFraming(props, {
    getGroup: () => modelGroup, getCamera: () => camera, getControls: () => controls,
    isVisible: () => isVisible, isRotating: () => presentation.isRotating,
    onFramingReady: () => emit("framingReady"), refreshProfileContour, scheduleRender,
  });

  const { createStylizedMockBust, animateToShape, dispose: disposeMockMaterials } = createMockBustController();

  const materials = createViewerMaterials({
    getRenderer: () => renderer, getScene: () => scene, getCamera: () => camera,
    containerRef, isDisposed: () => disposed, getStyle: () => props.materialStyle,
    getSymptom: () => props.symptomType, applyTint: symptomEffects.applyTint, scheduleRender,
  });
  const { applyMaterialStyle, ensureComposer, registerModelMaterials } = materials;

  // Initialize ThreeJS
  const initThree = async () => {
    if (initialized || disposed || !canvasRef.value || !containerRef.value) return;

    const rect = containerRef.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    if (!width || !height) return;
    initialized = true;
    const constrainedDevice = isConstrainedDevice();

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.8, 6.0); // Set camera high and back

    // Renderer
    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: true,
      antialias: true,
      // The symptoms sequence has a short, scripted turn even though it is not
      // user-interactive. Keep that transition on the dedicated GPU.
      powerPreference: props.interactive || Boolean(props.profileLabel) ? "high-performance" : "low-power",
    });
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, constrainedDevice ? 1 : props.interactive ? 1.5 : 1.25)
    );
    // Non-glow scenes intentionally remain transparent: their host section owns
    // the background colour and it must not jump when the canvas fades in.
    renderer.setClearColor(0x000000, 0);
    const useShadows = props.interactive && !props.compact && !constrainedDevice;
    renderer.shadowMap.enabled = useShadows;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    const [{ RoomEnvironment }, { OrbitControls }] = await Promise.all([
      import("three/examples/jsm/environments/RoomEnvironment.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]);
    if (disposed) return;
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvironment = new RoomEnvironment();
    environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
    scene.environment = environmentTexture;
    roomEnvironment.dispose();
    pmremGenerator.dispose();

    applyMaterialStyle(props.materialStyle);
    if (props.materialStyle === "glow") await ensureComposer();
    if (disposed || !renderer || !scene || !camera) return;

    // OrbitControls
    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableRotate = props.interactive;
    controls.enableZoom = props.enableZoom;
    controls.enablePan = false;
    controls.minPolarAngle = Math.PI / 3; // Keep rotation bounded vertically
    controls.maxPolarAngle = Math.PI / 1.7;
    updateSymptomFraming();
    controls.addEventListener("start", () => {
      controlsActive = true;
      scheduleRender();
    });
    controls.addEventListener("change", () => scheduleRender());
    controls.addEventListener("end", () => {
      controlsActive = false;
      scheduleRender(500);
    });

    addBustLighting(scene, useShadows);

    // Main Model Group
    modelGroup = new THREE.Group();
    scene.add(modelGroup);

    // Load Model or Create Mock
    if (props.modelUrl) {
      try {
        const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");
        const loader = new GLTFLoader();

        loader.load(
          props.modelUrl,
          (gltf) => {
            if (!modelGroup || !scene) return;

            const loadedModel = gltf.scene;
            loadedBustModel = loadedModel;
            playback.load(gltf);
            loadedModel.getObjectByName("SYMPTOM_skin")?.removeFromParent();
            loadedModel.traverse((child) => {
              if (child instanceof THREE.Mesh) {
                child.castShadow = useShadows;
                child.receiveShadow = useShadows;
                if (!child.geometry.getAttribute("normal")) child.geometry.computeVertexNormals();
              }
            });
            registerBustSymptoms(loadedModel, gltf.animations.some(clip =>
              clip.tracks.some(track => track.name.includes("morphTargetInfluences"))
            ), symptomEffects);

            registerModelMaterials(loadedModel);

            normalizeLoadedBust(loadedModel, 2.8 * props.modelScale, props.modelVerticalOffset);

            modelGroup.add(loadedModel);
            modelGroup.rotation.y = props.initialRotationY;
            alignModelHorizontally();
            symptomEffects.build(loadedModel, props.symptomType);
            isLoading.value = false;
            refreshProfileContour();
            scheduleRender();
          },
          undefined,
          (error) => {
            console.error("Error loading GLTF model, falling back to mock bust:", error);
            loadMockBust();
          }
        );
      } catch (e) {
        console.error("Failed to load GLTFLoader, falling back to mock bust:", e);
        loadMockBust();
      }
    } else {
      loadMockBust();
    }

    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.value);
    scheduleRender();
  };

  const loadMockBust = () => {
    if (!modelGroup) return;
    mockBust = createStylizedMockBust();
    registerModelMaterials(mockBust, true);
    modelGroup.add(mockBust);
    modelGroup.rotation.y = props.initialRotationY;
    alignModelHorizontally();

    // Set initial shape immediately without animation
    animateToShape(props.shapeType, true);

    isLoading.value = false;
    refreshProfileContour();
    scheduleRender();
  };

  // Resize Handler
  const handleResize = () => {
    if (!containerRef.value || !camera || !renderer) return;

    const rect = containerRef.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    alignModelHorizontally();

    renderer.setSize(width, height, false);
    materials.resize(width, height);
    refreshProfileContour();
    scheduleRender();
  };

  // Scroll Reaction
  const updateRotationFromScroll = (progress: number) => {
    if (!modelGroup) return;
    // Map scroll progress (0-100) to rotation (ex. -45deg to +45deg)
    const targetRotationY = ((progress - 50) / 100) * Math.PI * 0.8;
    // The progress itself is already smoothed by the scroll timeline.
    modelGroup.rotation.y = targetRotationY;
  };

  // Render Loop
  const tick = (timestamp: number) => {
    animationFrameId = 0;
    if (!renderer || !scene || !camera) return;
    if (!isVisible || document.hidden || disposed) return;

    const targetFps = isConstrainedDevice()
      ? 24
      : presentation.isRotating
        ? 60
        : props.interactive
          ? 45
          : 30;
    if (timestamp - lastRenderTime < 1000 / targetFps) {
      scheduleRender();
      return;
    }
    lastRenderTime = timestamp;

    const elapsedTime = timestamp / 1000;
    playback.tick(timestamp);

    // Update controls
    if (controls) {
      controls.update();
    }

    // Handle auto rotation when not scrolling or user dragging
    if (modelGroup && props.autoRotate && !playback.hasAnimation && (!controls || controls.state === -1)) {
      // Subtle breathing animation + slow auto spin
      modelGroup.position.y = 0.25 + Math.sin(elapsedTime * 1.5) * 0.05;

      // Only auto spin if scroll progress is not actively mutating rotation
      if (props.scrollProgress === 0) {
        modelGroup.rotation.y += 0.003;
      }
    }

    symptomEffects.tick(elapsedTime);
    notifyFramingReady();
    presentation.notifySymptomReady();
    if (!materials.render(elapsedTime)) renderer.render(scene, camera);
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

        if (!initialized) {
          window.clearTimeout(initTimer);
          initTimer = window.setTimeout(() => void initThree(), 50);
        } else {
          scheduleRender();
        }
      },
      { rootMargin: "300px 0px", threshold: 0 }
    );
    viewportObserver.observe(containerRef.value);
  });

  onUnmounted(() => {
    disposed = true;
    window.clearTimeout(initTimer);
    viewportObserver?.disconnect();
    resizeObserver?.disconnect();
    if (visibilityChangeHandler) {
      document.removeEventListener("visibilitychange", visibilityChangeHandler);
    }
    stopRendering();
    if (controls) {
      controls.dispose();
    }
    materials.dispose();
    if (renderer) {
      renderer.dispose();
      renderer.forceContextLoss();
    }
    environmentTexture?.dispose();

    // Dispose geometries and materials
    disposeMockMaterials();

    if (loadedBustModel) {
      loadedBustModel.traverse((child) => {
        if (child instanceof THREE.Mesh) child.geometry.dispose();
      });
    }

    symptomEffects.dispose();

    if (mockBust) {
      mockBust.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.geometry.dispose();
          if (child.material instanceof THREE.Material) {
            child.material.dispose();
          }
        }
      });
    }

    controls = null;
    renderer = null;
    scene = null;
    camera = null;
    modelGroup = null;
  });

  // Watch shapeType change and animate
  watch(
    () => props.shapeType,
    (newShape) => {
      if (newShape) {
        animateToShape(newShape);
        scheduleRender(1000);
      }
    }
  );

  // Watch scroll progress change
  watch(
    () => props.scrollProgress,
    (newVal) => {
      if (newVal !== undefined) {
        updateRotationFromScroll(newVal);
        scheduleRender();
      }
    }
  );

  watch(
    () => props.materialStyle,
    (newStyle) => {
      applyMaterialStyle(newStyle);
      if (newStyle === "glow") void ensureComposer();
      scheduleRender(newStyle === "glow" ? 0 : 150);
    }
  );

  return {
    containerRef, canvasRef, isLoading, materialBackdropClass,
    profileLabelOpacity, profileCurveId, profileContour,
    animationTime, animationDuration, animationPlaying, animationSteps,
    currentAnimationStep, currentAnimationSegment, animationGestureLabel,
    selectAnimationStep, toggleAnimation, seekAnimation,
  };
}
