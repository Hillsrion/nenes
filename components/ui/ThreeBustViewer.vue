<template>
  <div ref="containerRef" class="relative w-full h-full min-h-[350px] md:min-h-[500px]">
    <!-- Loading indicator -->
    <div
      v-if="isLoading"
      class="absolute inset-0 flex items-center justify-center bg-transparent transition-opacity duration-300 pointer-events-none"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs text-primary font-medium tracking-wider uppercase opacity-80">Chargement 3D...</p>
      </div>
    </div>

    <!-- WebGL Canvas -->
    <canvas ref="canvasRef" class="w-full h-full block touch-none" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { gsap } from "gsap";

type SymptomType = "none" | "asymmetry" | "skin" | "dimpling" | "nipple";

interface Props {
  modelUrl?: string;
  scrollProgress?: number; // 0 to 100
  autoRotate?: boolean;
  enableZoom?: boolean;
  symptomType?: SymptomType;
  shapeType?: "round" | "asymmetric" | "ptose" | "mastectomy";
}

const props = withDefaults(defineProps<Props>(), {
  modelUrl: "",
  scrollProgress: 0,
  autoRotate: true,
  enableZoom: false,
  symptomType: "none",
  shapeType: "round",
});

const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const isLoading = ref(true);

// Three.js instances
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let modelGroup: THREE.Group | null = null;
let mockBust: THREE.Group | null = null;
let symptomRoot: THREE.Group | null = null;
let embeddedSkinLayer: THREE.Object3D | null = null;
const symptomLayers = new Map<SymptomType, THREE.Group>();
const symptomPulseObjects: THREE.Object3D[] = [];
const symptomMorphMeshes: THREE.Mesh[] = [];
let controls: any = null;
let animationFrameId = 0;

// Individual meshes for shape morphing
let breastLeftMesh: THREE.Mesh | null = null;
let breastRightMesh: THREE.Mesh | null = null;
let scarMesh: THREE.Mesh | null = null;

// Materials
const skinMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xfbcfe8, // Soft rose pink
  roughness: 0.35,
  metalness: 0.05,
  clearcoat: 0.4,
  clearcoatRoughness: 0.25,
  sheen: 0.8,
  sheenColor: 0xf472b6,
  transmission: 0.1, // Gives a slight organic look
  thickness: 0.5,
});

const baseMaterial = new THREE.MeshStandardMaterial({
  color: 0xf5e0eb, // Soft pastel cream pink
  roughness: 0.5,
  metalness: 0.1,
});

// Neutral clay material for shape-only photogrammetry exports.
const generatedShapeMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xf3c8d8,
  roughness: 0.72,
  metalness: 0,
  clearcoat: 0.08,
  clearcoatRoughness: 0.8,
});

// Gold Kintsugi style material for the mastectomy scar
const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd4af37, // Gold
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

interface SurfaceAnchor {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

const markerForward = new THREE.Vector3(0, 0, 1);

const findFrontSurface = (
  loadedModel: THREE.Object3D,
  x: number,
  y: number
): SurfaceAnchor | null => {
  if (!modelGroup) return null;

  modelGroup.updateMatrixWorld(true);

  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(x, y, 3),
    new THREE.Vector3(0, 0, -1)
  );
  const hit = raycaster
    .intersectObject(loadedModel, true)
    .find((intersection) => intersection.face && intersection.object instanceof THREE.Mesh);

  if (!hit?.face) return null;

  const mesh = hit.object as THREE.Mesh;
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
  const inverseGroupMatrix = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();

  return {
    point: modelGroup.worldToLocal(hit.point.clone()),
    normal: worldNormal.transformDirection(inverseGroupMatrix).normalize(),
  };
};

const placeOnSurface = (
  object: THREE.Object3D,
  anchor: SurfaceAnchor,
  offset = 0.018
) => {
  object.position.copy(anchor.point).addScaledVector(anchor.normal, offset);
  object.quaternion.setFromUnitVectors(markerForward, anchor.normal);
};

const registerPulse = (object: THREE.Object3D) => {
  object.userData.baseScale = object.scale.clone();
  symptomPulseObjects.push(object);
};

const addSurfaceRing = (
  layer: THREE.Group,
  anchor: SurfaceAnchor,
  innerRadius: number,
  outerRadius: number,
  color: number,
  opacity = 0.9
) => {
  const marker = new THREE.Mesh(
    new THREE.RingGeometry(innerRadius, outerRadius, 64),
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  marker.renderOrder = 10;
  placeOnSurface(marker, anchor);
  registerPulse(marker);
  layer.add(marker);
};

const addSkinPatch = (layer: THREE.Group, anchor: SurfaceAnchor) => {
  const patch = new THREE.Group();
  const patchMaterial = new THREE.MeshBasicMaterial({
    color: 0xd94c64,
    transparent: true,
    opacity: 0.4,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const patchDisc = new THREE.Mesh(new THREE.CircleGeometry(0.24, 64), patchMaterial);
  patchDisc.renderOrder = 9;
  patch.add(patchDisc);

  const poreOffsets = [
    [-0.11, 0.05],
    [-0.05, 0.13],
    [0.04, 0.11],
    [0.12, 0.04],
    [-0.13, -0.05],
    [-0.04, -0.02],
    [0.07, -0.04],
    [0.01, -0.13],
  ];
  const poreMaterial = new THREE.MeshBasicMaterial({
    color: 0x8f253c,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  poreOffsets.forEach(([x, y]) => {
    const pore = new THREE.Mesh(new THREE.CircleGeometry(0.015, 20), poreMaterial);
    pore.position.set(x, y, 0.004);
    pore.renderOrder = 11;
    patch.add(pore);
  });

  placeOnSurface(patch, anchor, 0.02);
  registerPulse(patch);
  layer.add(patch);
};

const addNippleMarker = (
  layer: THREE.Group,
  loadedModel: THREE.Object3D,
  x: number,
  y: number
) => {
  const anchor = findFrontSurface(loadedModel, x, y);
  if (!anchor) return;

  addSurfaceRing(layer, anchor, 0.075, 0.1, 0xb42347, 0.95);

  const center = new THREE.Mesh(
    new THREE.SphereGeometry(0.038, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x8f1837 })
  );
  center.position.copy(anchor.point).addScaledVector(anchor.normal, 0.04);
  center.renderOrder = 12;
  layer.add(center);

  const dropletAnchor = findFrontSurface(loadedModel, x, y - 0.18);
  if (dropletAnchor) {
    const droplet = new THREE.Mesh(
      new THREE.SphereGeometry(0.034, 24, 16),
      new THREE.MeshPhysicalMaterial({
        color: 0xc72850,
        roughness: 0.28,
        clearcoat: 0.7,
      })
    );
    droplet.scale.set(0.72, 1.35, 0.72);
    droplet.position.copy(dropletAnchor.point).addScaledVector(dropletAnchor.normal, 0.045);
    droplet.renderOrder = 12;
    registerPulse(droplet);
    layer.add(droplet);
  }
};

const updateSymptomVisibility = (symptom: SymptomType) => {
  symptomMorphMeshes.forEach((mesh) => {
    if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

    Object.values(mesh.morphTargetDictionary).forEach((index) => {
      mesh.morphTargetInfluences![index] = 0;
    });

    if (symptom === "asymmetry" || symptom === "dimpling") {
      const targetIndex = mesh.morphTargetDictionary[symptom];
      if (targetIndex !== undefined) mesh.morphTargetInfluences[targetIndex] = 1;
    }
  });

  if (embeddedSkinLayer) embeddedSkinLayer.visible = symptom === "skin";

  symptomLayers.forEach((layer, type) => {
    const replacedByEmbeddedLayer = type === "skin" && Boolean(embeddedSkinLayer);
    layer.visible = symptom !== "none" && type === symptom && !replacedByEmbeddedLayer;
  });
};

const buildSymptomLayers = (loadedModel: THREE.Object3D) => {
  if (!modelGroup) return;

  symptomRoot = new THREE.Group();
  symptomRoot.name = "symptom-overlays";
  modelGroup.add(symptomRoot);

  const createLayer = (type: SymptomType) => {
    const layer = new THREE.Group();
    layer.name = `symptom-${type}`;
    layer.visible = false;
    symptomRoot?.add(layer);
    symptomLayers.set(type, layer);
    return layer;
  };

  const asymmetryLayer = createLayer("asymmetry");
  const leftBreast = findFrontSurface(loadedModel, -0.34, 0.32);
  const rightBreast = findFrontSurface(loadedModel, 0.34, 0.32);
  if (leftBreast) addSurfaceRing(asymmetryLayer, leftBreast, 0.27, 0.3, 0xe08a2e);
  if (rightBreast) addSurfaceRing(asymmetryLayer, rightBreast, 0.34, 0.38, 0xc24b65);

  const skinLayer = createLayer("skin");
  const skinAnchor = findFrontSurface(loadedModel, 0.35, 0.38);
  if (skinAnchor) addSkinPatch(skinLayer, skinAnchor);

  const dimplingLayer = createLayer("dimpling");
  [
    [-0.42, 0.4],
    [-0.28, 0.25],
    [-0.4, 0.12],
  ].forEach(([x, y], index) => {
    const anchor = findFrontSurface(loadedModel, x, y);
    if (!anchor) return;
    addSurfaceRing(
      dimplingLayer,
      anchor,
      0.035 + index * 0.006,
      0.065 + index * 0.008,
      0x9e2944,
      0.95
    );
  });

  const nippleLayer = createLayer("nipple");
  addNippleMarker(nippleLayer, loadedModel, 0.34, 0.26);

  updateSymptomVisibility(props.symptomType);
};

// Helper: Build a beautiful stylized mock bust
const createStylizedMockBust = (): THREE.Group => {
  const group = new THREE.Group();

  // Torso / Buste principal
  const torsoGeom = new THREE.CylinderGeometry(0.8, 1.1, 2.0, 32, 16);
  // Deform the cylinder to make it more anatomically shaped
  const pos = torsoGeom.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const y = pos.getY(i);
    let z = pos.getZ(i);
    // Narrow down the waist
    if (y < 0) {
      pos.setX(i, x * 0.95);
      pos.setZ(i, z * 0.85);
    }
    // Flatten front-back slightly
    pos.setZ(i, z * 0.8);
  }
  torsoGeom.computeVertexNormals();

  const torso = new THREE.Mesh(torsoGeom, skinMaterial);
  torso.position.y = 0.2;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // Poitrine gauche
  const breastLGeom = new THREE.SphereGeometry(0.48, 32, 32);
  breastLeftMesh = new THREE.Mesh(breastLGeom, skinMaterial);
  breastLeftMesh.scale.set(1.0, 1.0, 1.25); // Slightly elongated forward
  breastLeftMesh.position.set(-0.35, 0.45, 0.65);
  breastLeftMesh.rotation.x = 0.1;
  breastLeftMesh.rotation.y = 0.1;
  breastLeftMesh.castShadow = true;
  group.add(breastLeftMesh);

  // Poitrine droite
  const breastRGeom = new THREE.SphereGeometry(0.48, 32, 32);
  breastRightMesh = new THREE.Mesh(breastRGeom, skinMaterial);
  breastRightMesh.scale.set(1.0, 1.0, 1.25);
  breastRightMesh.position.set(0.35, 0.45, 0.65);
  breastRightMesh.rotation.x = 0.1;
  breastRightMesh.rotation.y = -0.1;
  breastRightMesh.castShadow = true;
  group.add(breastRightMesh);

  // Mastectomy Scar (decorative gold kintsugi line)
  // We model a stylized branch/scar shape using a torus segment or a curved shape
  const scarGeom = new THREE.TorusGeometry(0.4, 0.03, 8, 24, Math.PI);
  scarMesh = new THREE.Mesh(scarGeom, goldMaterial);
  scarMesh.position.set(-0.35, 0.45, 0.65);
  scarMesh.rotation.set(0.2, 0.5, 0.8);
  scarMesh.scale.set(0, 0, 0); // Hidden by default
  scarMesh.castShadow = true;
  group.add(scarMesh);

  // Cou / Neck
  const neckGeom = new THREE.CylinderGeometry(0.35, 0.38, 0.6, 32);
  const neck = new THREE.Mesh(neckGeom, skinMaterial);
  neck.position.set(0, 1.3, 0);
  neck.castShadow = true;
  group.add(neck);

  // Base du socle
  const standGeom = new THREE.CylinderGeometry(1.2, 1.3, 0.25, 32);
  const stand = new THREE.Mesh(standGeom, baseMaterial);
  stand.position.set(0, -0.9, 0);
  stand.receiveShadow = true;
  stand.castShadow = true;
  group.add(stand);

  const columnGeom = new THREE.CylinderGeometry(0.5, 0.5, 0.5, 32);
  const column = new THREE.Mesh(columnGeom, baseMaterial);
  column.position.set(0, -0.65, 0);
  column.castShadow = true;
  group.add(column);

  // Center group slightly
  group.position.y = 0.25;

  return group;
};

// Morph breast shapes based on active tab
const animateToShape = (shape: "round" | "asymmetric" | "ptose" | "mastectomy", immediate = false) => {
  if (!breastLeftMesh || !breastRightMesh || !scarMesh) return;

  const duration = immediate ? 0 : 0.8;
  const ease = "power2.inOut";

  if (shape === "round") {
    gsap.to(breastLeftMesh.scale, { x: 1.0, y: 1.0, z: 1.25, duration, ease });
    gsap.to(breastLeftMesh.position, { x: -0.35, y: 0.45, z: 0.65, duration, ease });
    
    gsap.to(breastRightMesh.scale, { x: 1.0, y: 1.0, z: 1.25, duration, ease });
    gsap.to(breastRightMesh.position, { x: 0.35, y: 0.45, z: 0.65, duration, ease });
    
    gsap.to(scarMesh.scale, { x: 0, y: 0, z: 0, duration, ease });
  } else if (shape === "asymmetric") {
    // Left breast is smaller, right is larger
    gsap.to(breastLeftMesh.scale, { x: 0.78, y: 0.78, z: 1.0, duration, ease });
    gsap.to(breastLeftMesh.position, { x: -0.35, y: 0.42, z: 0.58, duration, ease });
    
    gsap.to(breastRightMesh.scale, { x: 1.15, y: 1.15, z: 1.45, duration, ease });
    gsap.to(breastRightMesh.position, { x: 0.35, y: 0.46, z: 0.72, duration, ease });
    
    gsap.to(scarMesh.scale, { x: 0, y: 0, z: 0, duration, ease });
  } else if (shape === "ptose") {
    // Both breasts are slightly elongated downwards
    gsap.to(breastLeftMesh.scale, { x: 0.95, y: 1.2, z: 1.1, duration, ease });
    gsap.to(breastLeftMesh.position, { x: -0.35, y: 0.32, z: 0.60, duration, ease });
    
    gsap.to(breastRightMesh.scale, { x: 0.95, y: 1.2, z: 1.1, duration, ease });
    gsap.to(breastRightMesh.position, { x: 0.35, y: 0.32, z: 0.60, duration, ease });
    
    gsap.to(scarMesh.scale, { x: 0, y: 0, z: 0, duration, ease });
  } else if (shape === "mastectomy") {
    // Left breast is removed (flat), right is standard. Gold scar is revealed on the left.
    gsap.to(breastLeftMesh.scale, { x: 0.01, y: 0.01, z: 0.01, duration, ease });
    gsap.to(breastLeftMesh.position, { x: -0.35, y: 0.45, z: 0.1, duration, ease });
    
    gsap.to(breastRightMesh.scale, { x: 1.0, y: 1.0, z: 1.25, duration, ease });
    gsap.to(breastRightMesh.position, { x: 0.35, y: 0.45, z: 0.65, duration, ease });
    
    gsap.to(scarMesh.scale, { x: 1.0, y: 1.0, z: 1.0, duration, ease });
  }
};

// Initialize ThreeJS
const initThree = async () => {
  if (!canvasRef.value || !containerRef.value) return;

  const rect = containerRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

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
    powerPreference: "high-performance",
  });
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;

  // OrbitControls
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = props.enableZoom;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 3; // Keep rotation bounded vertically
  controls.maxPolarAngle = Math.PI / 1.7;

  // Lighting
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Key Studio Light (Warm)
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.5);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.width = 1024;
  keyLight.shadow.mapSize.height = 1024;
  keyLight.shadow.bias = -0.001;
  scene.add(keyLight);

  // Rim Light (Pink Accent)
  const rimLight = new THREE.DirectionalLight(0xf472b6, 3.0);
  rimLight.position.set(-5, 3, -4);
  scene.add(rimLight);

  // Fill Light (Soft cool light)
  const fillLight = new THREE.DirectionalLight(0xe0f2fe, 1.2);
  fillLight.position.set(-6, 2, 4);
  scene.add(fillLight);

  // Top Accent Point Light
  const topLight = new THREE.PointLight(0xffe4e6, 2.0, 10);
  topLight.position.set(0, 3, 2);
  scene.add(topLight);

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

          // Traverse to apply beautiful materials and shadows
          loadedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (!child.geometry.getAttribute("normal")) {
                child.geometry.computeVertexNormals();
              }

              const sourceMaterials = Array.isArray(child.material)
                ? child.material
                : [child.material];
              const hasTexture = sourceMaterials.some((material) =>
                Boolean((material as THREE.MeshStandardMaterial | undefined)?.map)
              );

              // Shape-only GLBs contain geometry without a material or texture.
              if (!hasTexture && !child.userData.preserveMaterial) {
                child.material = generatedShapeMaterial;
              }

              if (
                child.morphTargetDictionary?.asymmetry !== undefined ||
                child.morphTargetDictionary?.dimpling !== undefined
              ) {
                symptomMorphMeshes.push(child);
              }
            }
          });

          embeddedSkinLayer = loadedModel.getObjectByName("SYMPTOM_skin") ?? null;
          if (embeddedSkinLayer) embeddedSkinLayer.visible = false;

          // Center the loaded model inside the group
          const box = new THREE.Box3().setFromObject(loadedModel);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());

          // Scale model to fit scene nicely
          const maxDim = Math.max(size.x, size.y, size.z);
          const targetHeight = 2.8;
          const scale = targetHeight / maxDim;
          loadedModel.scale.set(scale, scale, scale);
          
          loadedModel.position.sub(center.multiplyScalar(scale));
          loadedModel.position.y += 0.2; // Adjust vertical center

          modelGroup.add(loadedModel);
          buildSymptomLayers(loadedModel);
          isLoading.value = false;
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

  // Handle Resize
  window.addEventListener("resize", handleResize);

  // Animation Loop
  tick();
};

const loadMockBust = () => {
  if (!modelGroup) return;
  mockBust = createStylizedMockBust();
  modelGroup.add(mockBust);
  
  // Set initial shape immediately without animation
  animateToShape(props.shapeType, true);
  
  isLoading.value = false;
};

// Resize Handler
const handleResize = () => {
  if (!containerRef.value || !camera || !renderer) return;

  const rect = containerRef.value.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  camera.aspect = width / height;
  camera.updateProjectionMatrix();

  renderer.setSize(width, height);
};

// Scroll Reaction
const updateRotationFromScroll = (progress: number) => {
  if (!modelGroup) return;
  // Map scroll progress (0-100) to rotation (ex. -45deg to +45deg)
  const targetRotationY = ((progress - 50) / 100) * Math.PI * 0.8;
  // Smoothly interpolate rotation
  modelGroup.rotation.y = THREE.MathUtils.lerp(modelGroup.rotation.y, targetRotationY, 0.1);
};

// Render Loop
const tick = () => {
  if (!renderer || !scene || !camera) return;

  const elapsedTime = clock.getElapsedTime();

  // Update controls
  if (controls) {
    controls.update();
  }

  // Handle auto rotation when not scrolling or user dragging
  if (modelGroup && props.autoRotate && (!controls || controls.state === -1)) {
    // Subtle breathing animation + slow auto spin
    modelGroup.position.y = 0.25 + Math.sin(elapsedTime * 1.5) * 0.05;
    
    // Only auto spin if scroll progress is not actively mutating rotation
    if (props.scrollProgress === 0) {
      modelGroup.rotation.y += 0.003;
    }
  }

  const symptomPulse = 1 + Math.sin(elapsedTime * 3.2) * 0.045;
  symptomPulseObjects.forEach((object) => {
    if (!object.visible && !object.parent?.visible) return;
    const baseScale = object.userData.baseScale as THREE.Vector3 | undefined;
    if (baseScale) object.scale.copy(baseScale).multiplyScalar(symptomPulse);
  });

  // If scrollProgress is driven by GSAP, apply it
  if (props.scrollProgress !== 0) {
    updateRotationFromScroll(props.scrollProgress);
  }

  renderer.render(scene, camera);
  animationFrameId = requestAnimationFrame(tick);
};

const clock = new THREE.Clock();

onMounted(() => {
  if (process.client) {
    // Short delay to let the DOM settle and get correct dimensions
    setTimeout(() => {
      initThree();
    }, 100);
  }
});

onUnmounted(() => {
  if (process.client) {
    window.removeEventListener("resize", handleResize);
  }
  if (animationFrameId) {
    cancelAnimationFrame(animationFrameId);
  }
  if (controls) {
    controls.dispose();
  }
  if (renderer) {
    renderer.dispose();
  }
  
  // Dispose geometries and materials
  skinMaterial.dispose();
  baseMaterial.dispose();
  generatedShapeMaterial.dispose();
  goldMaterial.dispose();

  if (symptomRoot) {
    symptomRoot.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
  }
  
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
});

// Watch shapeType change and animate
watch(
  () => props.shapeType,
  (newShape) => {
    if (newShape) {
      animateToShape(newShape);
    }
  }
);

// Watch scroll progress change
watch(
  () => props.scrollProgress,
  (newVal) => {
    if (newVal !== undefined) {
      updateRotationFromScroll(newVal);
    }
  }
);

watch(
  () => props.symptomType,
  (newSymptom) => {
    updateSymptomVisibility(newSymptom);
  }
);
</script>

<style scoped>
/* Ensuring GPU acceleration on canvas container */
canvas {
  will-change: transform;
}
</style>
