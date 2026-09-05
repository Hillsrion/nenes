<template>
  <div ref="containerRef" class="pointer-events-none absolute inset-0 z-10" aria-hidden="true">
    <canvas ref="canvasRef" class="block h-full w-full" />
    <div v-if="unavailable && active" class="absolute inset-x-0 bottom-0 flex flex-wrap justify-center text-6xl leading-none">
      <span v-for="(fruit, index) in fallbackFruits" :key="index">{{ fruit.emoji }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import * as THREE from "three";
import Matter from "matter-js";
import { loadingFruitSequence } from "~/config/loading-fruits";
import { createFruitModel } from "~/utils/loading-fruit-models";
import { createFruitPilePhysics, FRUIT_PHYSICS_STEP } from "~/utils/fruit-pile-physics";

const props = withDefaults(defineProps<{ active: boolean; entrance?: "rain" | "right" }>(), { entrance: "rain" });
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const unavailable = ref(false);
const fallbackFruits = loadingFruitSequence;
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.OrthographicCamera | null = null;
let physics: ReturnType<typeof createFruitPilePhysics> | null = null;
let observer: IntersectionObserver | null = null;
let resizeObserver: ResizeObserver | null = null;
let motionQuery: MediaQueryList | null = null;
let frame = 0;
let lastTime = 0;
let accumulator = 0;
let visible = false;
let ready = false;
let disposed = false;
let width = 0;
let height = 0;
const templates: THREE.Group[] = [];
const fruits: { model: THREE.Group; body: Matter.Body }[] = [];

// Project each fruit's silhouette so the visible model and collision shape agree.
const getHull = (model: THREE.Group) => {
  model.updateMatrixWorld(true);
  const points: Matter.Vector[] = [];
  const vertex = new THREE.Vector3();
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const positions = child.geometry.getAttribute("position");
    for (let index = 0; index < positions.count; index += 1) {
      vertex.fromBufferAttribute(positions, index).applyMatrix4(child.matrixWorld);
      points.push({ x: vertex.x, y: -vertex.y });
    }
  });
  return Matter.Vertices.hull(points);
};

const render = () => {
  if (!renderer || !scene || !camera) return;
  fruits.forEach(({ model, body }) => {
    model.position.set(body.position.x - width / 2, height / 2 - body.position.y, 0);
    model.rotation.z = -body.angle;
  });
  renderer.render(scene, camera);
};

const pause = () => {
  cancelAnimationFrame(frame);
  frame = 0;
  lastTime = 0;
};

const tick = (time: number) => {
  frame = 0;
  if (!physics || disposed || !visible || document.hidden) return;
  accumulator += lastTime ? Math.min(time - lastTime, 50) : FRUIT_PHYSICS_STEP;
  lastTime = time;
  while (accumulator >= FRUIT_PHYSICS_STEP) {
    physics.step();
    accumulator -= FRUIT_PHYSICS_STEP;
  }
  render();
  if (!physics.settled) frame = requestAnimationFrame(tick);
  else lastTime = 0;
};

const resume = () => {
  if (!ready || !props.active || !physics || !visible || disposed || document.hidden) return;
  if (motionQuery?.matches) {
    // Compute a resting pile without displaying any fall or bounce.
    pause();
    for (let step = 0; step < 1800 && !physics.settled; step += 1) physics.step();
    render();
  } else if (!frame && !physics.settled) {
    lastTime = 0;
    frame = requestAnimationFrame(tick);
  } else render();
};

const handleVisibility = () => document.hidden ? pause() : resume();

const resize = () => {
  if (!containerRef.value || !renderer || !camera) return;
  const bounds = containerRef.value.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  if (physics && width && height && (width !== bounds.width || height !== bounds.height)) {
    const scale = physics.resize(bounds.width, bounds.height);
    fruits.forEach(({ model }) => model.scale.multiplyScalar(scale));
  }
  width = bounds.width;
  height = bounds.height;
  camera.left = -width / 2;
  camera.right = width / 2;
  camera.top = height / 2;
  camera.bottom = -height / 2;
  camera.updateProjectionMatrix();
  renderer.setSize(width, height, false);
  render();
  resume();
};

const disposeMaterials = (model: THREE.Group) => {
  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => material.dispose());
  });
};

onMounted(async () => {
  if (!containerRef.value || !canvasRef.value) return;
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  motionQuery.addEventListener("change", resume);
  document.addEventListener("visibilitychange", handleVisibility);
  try {
    scene = new THREE.Scene();
    camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 4000);
    camera.position.z = 2000;
    renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.value,
      alpha: true,
      antialias: true,
      powerPreference: "low-power",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.25));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    scene.add(new THREE.HemisphereLight(0xfff5f7, 0x5a1839, 1.7));
    const key = new THREE.DirectionalLight(0xfff5e5, 3.1);
    key.position.set(-500, 700, 1000);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xf29ab7, 1.8);
    fill.position.set(500, 200, 800);
    scene.add(fill);
    resize();
    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(containerRef.value);
    observer = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting;
      if (visible) resume();
      else pause();
    });
    observer.observe(containerRef.value);

    await Promise.all(loadingFruitSequence.map(async (definition) => {
      try {
        const model = await createFruitModel(definition);
        if (disposed) disposeMaterials(model);
        else templates.push(model);
      } catch (error) {
        console.warn(`Fruit unavailable: ${definition.name}`, error);
      }
    }));
    if (disposed) return;
    if (!templates.length) throw new Error("No fruit models available");
    physics = createFruitPilePhysics(width, height, Math.random, props.entrance);
    const diameter = Math.min(145, Math.max(64, width / 10));
    const count = props.entrance === "right"
      ? Math.min(56, Math.max(28, Math.round(width / diameter * 4.2)))
      : Math.min(36, Math.max(18, Math.round(width / diameter * 2.6)));
    let bag: THREE.Group[] = [];
    for (let index = 0; index < count; index += 1) {
      if (!bag.length) {
        bag = [...templates];
        for (let slot = bag.length - 1; slot > 0; slot -= 1) {
          const other = Math.floor(Math.random() * (slot + 1));
          [bag[slot], bag[other]] = [bag[other], bag[slot]];
        }
      }
      const model = new THREE.Group();
      const presentation = bag.pop()!.clone(true);
      presentation.rotation.set((Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 1.2, 0);
      presentation.scale.setScalar(diameter * (0.78 + Math.random() * 0.4) / 2.15);
      model.add(presentation);
      const hull = getHull(model);
      const center = Matter.Vertices.centre(hull);
      presentation.position.set(-center.x, center.y, 0);
      const body = physics.add(hull, index, count);
      scene!.add(model);
      fruits.push({ model, body });
    }
    ready = true;
    render();
    resume();
  } catch (error) {
    console.warn("Fruit pile unavailable:", error);
    unavailable.value = true;
    pause();
    renderer?.dispose();
    renderer = null;
  }
});

watch(() => props.active, resume);

onUnmounted(() => {
  disposed = true;
  pause();
  observer?.disconnect();
  resizeObserver?.disconnect();
  motionQuery?.removeEventListener("change", resume);
  document.removeEventListener("visibilitychange", handleVisibility);
  physics?.dispose();
  // Clones share geometry/textures with the existing model cache; only own materials are disposed.
  templates.forEach(disposeMaterials);
  templates.length = 0;
  fruits.length = 0;
  scene?.clear();
  renderer?.dispose();
  renderer?.forceContextLoss();
  renderer = null;
  scene = null;
  camera = null;
});
</script>
