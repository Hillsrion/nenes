<template>
  <div
    ref="containerRef"
    class="relative h-full w-full"
    :class="compact ? 'min-h-0' : 'min-h-[350px] md:min-h-[500px]'"
  >
    <div
      aria-hidden="true"
      class="absolute inset-0 transition-all duration-700"
      :class="materialBackdropClass"
    />

    <!-- Loading indicator -->
    <div
      v-if="isLoading"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-transparent transition-opacity duration-300"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs text-primary font-medium tracking-wider uppercase opacity-80">Chargement 3D...</p>
      </div>
    </div>

    <!-- WebGL Canvas -->
    <canvas
      ref="canvasRef"
      class="relative z-10 block h-full w-full touch-none"
      :class="{ 'pointer-events-none': !interactive }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { gsap } from "gsap";
import {
  createSymptomEffects,
  type SymptomType,
} from "./three-bust/symptom-effects";

type MaterialStyle = "original" | "glass" | "glow" | "iridescent";

interface Props {
  modelUrl?: string;
  scrollProgress?: number; // 0 to 100
  autoRotate?: boolean;
  enableZoom?: boolean;
  interactive?: boolean;
  compact?: boolean;
  initialRotationY?: number;
  symptomType?: SymptomType;
  materialStyle?: MaterialStyle;
  shapeType?: "round" | "asymmetric" | "ptose" | "mastectomy";
}

const props = withDefaults(defineProps<Props>(), {
  modelUrl: "",
  scrollProgress: 0,
  autoRotate: true,
  enableZoom: false,
  interactive: true,
  compact: false,
  initialRotationY: 0,
  symptomType: "none",
  materialStyle: "original",
  shapeType: "round",
});

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

// Three.js instances
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let modelGroup: THREE.Group | null = null;
let mockBust: THREE.Group | null = null;
let loadedBustModel: THREE.Object3D | null = null;
const symptomEffects = createSymptomEffects(() => modelGroup);
const modelMaterialEntries: Array<{
  mesh: THREE.Mesh;
  originalMaterial: THREE.Material | THREE.Material[];
  hasTexture: boolean;
}> = [];
let controls: any = null;
let composer: any = null;
let bloomPass: any = null;
let environmentTexture: THREE.Texture | null = null;
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
  color: 0xe2aabf,
  roughness: 0.78,
  metalness: 0,
  envMapIntensity: 0.18,
  clearcoat: 0.08,
  clearcoatRoughness: 0.8,
});

const glassMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffd8ea,
  roughness: 0.08,
  metalness: 0,
  transmission: 0.88,
  thickness: 1.25,
  ior: 1.42,
  attenuationColor: new THREE.Color(0xff8fbd),
  attenuationDistance: 1.8,
  envMapIntensity: 1.35,
  clearcoat: 1,
  clearcoatRoughness: 0.06,
  transparent: true,
  opacity: 0.94,
  side: THREE.DoubleSide,
});

const glowMaterial = new THREE.MeshPhysicalMaterial({
  color: 0x160315,
  emissive: 0xff087f,
  emissiveIntensity: 0.72,
  roughness: 0.34,
  metalness: 0.08,
  envMapIntensity: 0.3,
  clearcoat: 0.45,
  clearcoatRoughness: 0.28,
});

const iridescentMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xbba7e8,
  roughness: 0.22,
  metalness: 0.18,
  transmission: 0.08,
  thickness: 0.6,
  ior: 1.34,
  envMapIntensity: 0.75,
  clearcoat: 0.78,
  clearcoatRoughness: 0.12,
  iridescence: 1,
  iridescenceIOR: 1.45,
  iridescenceThicknessRange: [160, 680],
  sheen: 0.9,
  sheenColor: new THREE.Color(0x69f3e5),
  sheenRoughness: 0.28,
});

const materialForStyle = (style: MaterialStyle) => {
  if (style === "glass") return glassMaterial;
  if (style === "glow") return glowMaterial;
  if (style === "iridescent") return iridescentMaterial;
  return null;
};

const applyMaterialStyle = (style: MaterialStyle) => {
  const experimentMaterial = materialForStyle(style);

  if (scene) {
    scene.background = style === "glow" ? new THREE.Color(0x080411) : null;
  }

  modelMaterialEntries.forEach(({ mesh, originalMaterial, hasTexture }) => {
    mesh.material =
      style === "original"
        ? hasTexture
          ? originalMaterial
          : generatedShapeMaterial
        : experimentMaterial ?? originalMaterial;

    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      material.needsUpdate = true;
    });
  });

  if (bloomPass) {
    bloomPass.strength = style === "glow" ? 0.68 : style === "iridescent" ? 0.12 : 0;
    bloomPass.radius = style === "glow" ? 0.46 : 0.2;
    bloomPass.threshold = style === "glow" ? 0.58 : 0.78;
  }

  if (renderer) {
    renderer.toneMappingExposure =
      style === "glow" ? 0.72 : style === "glass" ? 1.2 : style === "iridescent" ? 0.9 : 1.1;
  }

  symptomEffects.applyTint(props.symptomType);
};

const registerModelMaterials = (root: THREE.Object3D, keepUntexturedOriginal = false) => {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.userData.preserveMaterial) return;

    const sourceMaterials = Array.isArray(child.material)
      ? child.material
      : [child.material];
    const hasTexture =
      keepUntexturedOriginal ||
      sourceMaterials.some((material) =>
        Boolean((material as THREE.MeshStandardMaterial | undefined)?.map)
      );

    modelMaterialEntries.push({
      mesh: child,
      originalMaterial: child.material,
      hasTexture,
    });
  });

  applyMaterialStyle(props.materialStyle);
};

// Gold Kintsugi style material for the mastectomy scar
const goldMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xd4af37, // Gold
  metalness: 0.9,
  roughness: 0.15,
  clearcoat: 1.0,
  clearcoatRoughness: 0.1,
});

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

  const [{ RoomEnvironment }, { EffectComposer }, { RenderPass }, { UnrealBloomPass }] =
    await Promise.all([
      import("three/examples/jsm/environments/RoomEnvironment.js"),
      import("three/examples/jsm/postprocessing/EffectComposer.js"),
      import("three/examples/jsm/postprocessing/RenderPass.js"),
      import("three/examples/jsm/postprocessing/UnrealBloomPass.js"),
    ]);
  const pmremGenerator = new THREE.PMREMGenerator(renderer);
  const roomEnvironment = new RoomEnvironment();
  environmentTexture = pmremGenerator.fromScene(roomEnvironment, 0.04).texture;
  scene.environment = environmentTexture;
  roomEnvironment.dispose();
  pmremGenerator.dispose();

  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0, 0.2, 0.78);
  composer.addPass(bloomPass);
  applyMaterialStyle(props.materialStyle);

  // OrbitControls
  const { OrbitControls } = await import("three/examples/jsm/controls/OrbitControls.js");
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableRotate = props.interactive;
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
          loadedBustModel = loadedModel;
          loadedModel.getObjectByName("SYMPTOM_skin")?.removeFromParent();
          let primarySymptomMesh: THREE.Mesh | null = null;
          let primaryVertexCount = 0;
          const embeddedSymptomMeshes: THREE.Mesh[] = [];

          // Traverse to apply beautiful materials and shadows
          loadedModel.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;

              if (!child.geometry.getAttribute("normal")) {
                child.geometry.computeVertexNormals();
              }

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
            }
          });

          new Set([
            ...embeddedSymptomMeshes,
            ...(primarySymptomMesh ? [primarySymptomMesh] : []),
          ]).forEach((mesh) => {
            symptomEffects.registerMesh(mesh, mesh === primarySymptomMesh);
          });

          registerModelMaterials(loadedModel);

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
          modelGroup.rotation.y = props.initialRotationY;
          symptomEffects.build(loadedModel, props.symptomType);
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
  registerModelMaterials(mockBust, true);
  modelGroup.add(mockBust);
  modelGroup.rotation.y = props.initialRotationY;
  
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
  composer?.setSize(width, height);
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

  symptomEffects.tick(elapsedTime);
  // If scrollProgress is driven by GSAP, apply it
  if (props.scrollProgress !== 0) {
    updateRotationFromScroll(props.scrollProgress);
  }

  if (props.materialStyle === "glow") {
    glowMaterial.emissiveIntensity = 0.7 + Math.sin(elapsedTime * 1.8) * 0.08;
  }

  if (composer && props.materialStyle === "glow") composer.render();
  else renderer.render(scene, camera);
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
  composer?.dispose?.();
  environmentTexture?.dispose();
  
  // Dispose geometries and materials
  skinMaterial.dispose();
  baseMaterial.dispose();
  generatedShapeMaterial.dispose();
  glassMaterial.dispose();
  glowMaterial.dispose();
  iridescentMaterial.dispose();
  goldMaterial.dispose();

  if (loadedBustModel) {
    loadedBustModel.traverse((child) => {
      if (child instanceof THREE.Mesh) child.geometry.dispose();
    });
    const originalMaterials = new Set<THREE.Material>();
    modelMaterialEntries.forEach(({ originalMaterial }) => {
      const materials = Array.isArray(originalMaterial) ? originalMaterial : [originalMaterial];
      materials.forEach((material) => originalMaterials.add(material));
    });
    originalMaterials.forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) value.dispose();
      });
      material.dispose();
    });
  }
  modelMaterialEntries.length = 0;

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
    symptomEffects.update(newSymptom);
  }
);

watch(
  () => props.materialStyle,
  (newStyle) => {
    applyMaterialStyle(newStyle);
  }
);
</script>

<style scoped>
/* Ensuring GPU acceleration on canvas container */
canvas {
  will-change: transform;
}
</style>
