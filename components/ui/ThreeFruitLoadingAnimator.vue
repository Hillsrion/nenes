<template>
  <div
    ref="containerRef"
    class="relative h-full w-full"
    role="img"
    :aria-label="`${currentFruit.name}, modèle 3D de chargement`"
  >
    <canvas ref="canvasRef" class="block h-full w-full" aria-hidden="true" />

    <div v-if="isUnavailable" class="fruit-fallback" aria-hidden="true">
      {{ currentFruit.emoji }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import * as THREE from "three";
import {
  loadingFruitSequence,
  type LoadingFruitDefinition,
} from "~/config/loading-fruits";
import { createFruitModel, preloadFruitModels } from "~/utils/loading-fruit-models";

interface Props {
  progress: number;
  fruitIndex?: number;
  pair?: boolean;
  randomize?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  pair: false,
  randomize: true,
});
const emit = defineEmits<{ ready: [] }>();
const loaderFruitCount = Math.min(6, loadingFruitSequence.length);

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isUnavailable = ref(false);
const currentIndex = ref(props.fruitIndex ?? 0);
const loaderIndexes = ref(
  Array.from({ length: loaderFruitCount }, (_, index) => index)
);
const currentFruit = computed(
  () => loadingFruitSequence[currentIndex.value] ?? loadingFruitSequence[0]
);

let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let fruitGroup: THREE.Group | null = null;
let animationFrameId = 0;
let resizeObserver: ResizeObserver | null = null;
let lastTransitionIndex = -1;
let transitionRequestId = 0;
let hasEmittedReady = false;
let reducedMotion = false;

const notifyReady = () => {
  if (hasEmittedReady) return;
  hasEmittedReady = true;
  emit("ready");
};

const createRandomLoaderIndexes = () => {
  const indexes = loadingFruitSequence.map((_, index) => index);
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [indexes[index], indexes[swapIndex]] = [indexes[swapIndex], indexes[index]];
  }
  return indexes.slice(0, loaderFruitCount);
};

const getFruitIndex = (progress: number) => {
  if (props.fruitIndex !== undefined) {
    return Math.max(0, Math.min(loadingFruitSequence.length - 1, props.fruitIndex));
  }

  const normalizedProgress = Math.max(0, Math.min(100, progress));
  const slot = Math.min(
    loaderIndexes.value.length - 1,
    Math.floor((normalizedProgress / 100) * loaderIndexes.value.length)
  );
  return loaderIndexes.value[slot] ?? 0;
};

const applyPresentation = (
  model: THREE.Group,
  definition: LoadingFruitDefinition
) => {
  const [rotationX, rotationY, rotationZ] = definition.rotation ?? [0, 0, 0];
  model.rotation.set(rotationX, rotationY, rotationZ);
  model.scale.setScalar(definition.scale ?? 1);
};

const disposeModelMaterials = (model: THREE.Object3D) => {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
};

const transitionToFruit = async (index: number, immediate = false) => {
  if (!scene || !fruitGroup || index === lastTransitionIndex) return;

  currentIndex.value = index;
  lastTransitionIndex = index;
  const requestId = ++transitionRequestId;
  const definition = loadingFruitSequence[index];

  try {
    const model = await createFruitModel(definition);
    if (!fruitGroup || requestId !== transitionRequestId) {
      disposeModelMaterials(model);
      return;
    }

    applyPresentation(model, definition);

    const previousGroup = fruitGroup.userData.current as THREE.Group | undefined;
    if (previousGroup) {
      gsap.killTweensOf(previousGroup.scale);
      previousGroup.removeFromParent();
      disposeModelMaterials(previousGroup);
    }

    const presentationGroup = new THREE.Group();
    if (props.pair) {
      const secondModel = model.clone(true);
      const fruitPair = new THREE.Group();
      model.position.x = -0.62;
      secondModel.position.x = 0.62;
      fruitPair.add(model, secondModel);
      fruitPair.scale.setScalar(0.78);
      presentationGroup.add(fruitPair);
    } else {
      presentationGroup.add(model);
    }
    presentationGroup.scale.setScalar(immediate || reducedMotion ? 1 : 0.82);
    fruitGroup.add(presentationGroup);
    fruitGroup.userData.current = presentationGroup;
    isUnavailable.value = false;
    notifyReady();

    if (!immediate && !reducedMotion) {
      gsap.to(presentationGroup.scale, {
        x: 1,
        y: 1,
        z: 1,
        duration: 0.2,
        ease: "back.out(1.4)",
      });
    }
  } catch (error) {
    if (requestId !== transitionRequestId) return;
    console.warn(`Unable to load fruit model: ${definition.modelUrl}`, error);
    isUnavailable.value = true;
    notifyReady();
  }
};

const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;
  const { width, height } = containerRef.value.getBoundingClientRect();
  if (!width || !height) return;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
};

const tick = () => {
  if (!renderer || !scene || !camera || !fruitGroup) return;
  const elapsed = performance.now() / 1000;
  const activeFruit = fruitGroup.userData.current as THREE.Group | undefined;

  if (activeFruit && !reducedMotion) {
    activeFruit.rotation.y = Math.sin(elapsed * 0.72) * 0.28;
    activeFruit.rotation.z = Math.sin(elapsed * 1.45) * 0.018;
    activeFruit.position.y = Math.sin(elapsed * 2) * 0.035;
  }

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(tick);
};

const initThree = () => {
  if (!canvasRef.value || !containerRef.value) return;
  const { width, height } = containerRef.value.getBoundingClientRect();
  if (!width || !height) return;

  try {
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 5.1);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: true,
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;

    scene.add(new THREE.HemisphereLight(0xfff5f7, 0x5a1839, 1.7));

    const keyLight = new THREE.DirectionalLight(0xfff5e5, 3.1);
    keyLight.position.set(-3.5, 4, 5);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xf29ab7, 1.8);
    fillLight.position.set(3, 1, 2);
    scene.add(fillLight);

    fruitGroup = new THREE.Group();
    scene.add(fruitGroup);

    void transitionToFruit(getFruitIndex(props.progress), true);
    resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(containerRef.value);
    tick();
  } catch (error) {
    console.warn("3D loading fruit unavailable:", error);
    isUnavailable.value = true;
    notifyReady();
  }
};

watch(
  () => [props.progress, props.fruitIndex] as const,
  ([progress]) => {
    const nextIndex = getFruitIndex(progress);
    currentIndex.value = nextIndex;
    void transitionToFruit(nextIndex);
  }
);

onMounted(() => {
  reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (props.fruitIndex === undefined) {
    loaderIndexes.value = props.randomize
      ? createRandomLoaderIndexes()
      : Array.from({ length: loaderFruitCount }, (_, index) => index);
  }
  const indexes =
    props.fruitIndex === undefined ? loaderIndexes.value : [getFruitIndex(props.progress)];
  const modelUrls = indexes.map((index) => loadingFruitSequence[index].modelUrl);
  void preloadFruitModels([...new Set(modelUrls)]);
  requestAnimationFrame(initThree);
});

onUnmounted(() => {
  transitionRequestId += 1;
  resizeObserver?.disconnect();
  if (animationFrameId) cancelAnimationFrame(animationFrameId);
  if (fruitGroup) {
    const activeFruit = fruitGroup.userData.current as THREE.Group | undefined;
    if (activeFruit) gsap.killTweensOf(activeFruit.scale);
    if (activeFruit) disposeModelMaterials(activeFruit);
    fruitGroup.clear();
  }
  renderer?.dispose();
  scene = null;
  camera = null;
  renderer = null;
  fruitGroup = null;
});
</script>

<style scoped>
.fruit-fallback {
  position: absolute;
  inset: 12%;
  display: grid;
  place-items: center;
  border-radius: 48% 52% 46% 54%;
  background: radial-gradient(circle at 32% 25%, #fff3a7 0 8%, #f5cf38 34%, #7d294c 100%);
  font-size: clamp(2rem, 8vw, 4rem);
  filter: drop-shadow(0 10px 14px rgb(65 14 38 / 0.2));
}
</style>
