<template>
  <div ref="containerRef" class="relative w-full h-full min-h-[350px] md:min-h-[500px]">
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
    <canvas ref="canvasRef" class="relative z-10 block h-full w-full touch-none" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, watch } from "vue";
import * as THREE from "three";
import { gsap } from "gsap";

type SymptomType = "none" | "asymmetry" | "skin" | "dimpling" | "nipple";
type MaterialStyle = "original" | "glass" | "glow" | "iridescent";
type MorphSymptomType = Exclude<SymptomType, "none" | "nipple">;

const symptomMorphNames: MorphSymptomType[] = ["asymmetry", "skin", "dimpling"];

interface Props {
  modelUrl?: string;
  scrollProgress?: number; // 0 to 100
  autoRotate?: boolean;
  enableZoom?: boolean;
  symptomType?: SymptomType;
  materialStyle?: MaterialStyle;
  shapeType?: "round" | "asymmetric" | "ptose" | "mastectomy";
}

const props = withDefaults(defineProps<Props>(), {
  modelUrl: "",
  scrollProgress: 0,
  autoRotate: true,
  enableZoom: false,
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
let symptomRoot: THREE.Group | null = null;
const symptomLayers = new Map<SymptomType, THREE.Group>();
const symptomMorphMeshes: THREE.Mesh[] = [];
interface AnimatedDroplet {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  normal: THREE.Vector3;
  phase: number;
  lateral: number;
}
const animatedDroplets: AnimatedDroplet[] = [];
let nippleSourceBead: THREE.Mesh | null = null;

interface SymptomColorState {
  original?: THREE.BufferAttribute | THREE.InterleavedBufferAttribute;
  skin: THREE.Float32BufferAttribute;
  dimpling: THREE.Float32BufferAttribute;
}
const symptomColorStates = new WeakMap<THREE.BufferGeometry, SymptomColorState>();
const dropletFallOffset = new THREE.Vector3();
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

  applySymptomTint(props.symptomType);
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

const symptomSmoothstep = (edge0: number, edge1: number, value: number) => {
  const normalized = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const symptomGaussian = (
  x: number,
  y: number,
  centerX: number,
  centerY: number,
  radiusX: number,
  radiusY: number
) => {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  return Math.exp(-(dx * dx + dy * dy) * 2.4);
};

const createSkinReliefNormalAttribute = (
  geometry: THREE.BufferGeometry,
  positionDelta: Float32Array
) => {
  const sourcePositions = geometry.getAttribute("position");
  const sourceNormals = geometry.getAttribute("normal");
  const deformedGeometry = geometry.clone();
  const deformedPositions = sourcePositions.clone();

  for (let index = 0; index < sourcePositions.count; index += 1) {
    deformedPositions.setXYZ(
      index,
      sourcePositions.getX(index) + positionDelta[index * 3],
      sourcePositions.getY(index) + positionDelta[index * 3 + 1],
      sourcePositions.getZ(index) + positionDelta[index * 3 + 2]
    );
  }

  deformedGeometry.morphAttributes = {};
  deformedGeometry.setAttribute("position", deformedPositions);
  deformedGeometry.deleteAttribute("normal");
  deformedGeometry.computeVertexNormals();

  const deformedNormals = deformedGeometry.getAttribute("normal");
  const normalDelta = new Float32Array(sourceNormals.count * 3);
  for (let index = 0; index < sourceNormals.count; index += 1) {
    normalDelta[index * 3] = deformedNormals.getX(index) - sourceNormals.getX(index);
    normalDelta[index * 3 + 1] = deformedNormals.getY(index) - sourceNormals.getY(index);
    normalDelta[index * 3 + 2] = deformedNormals.getZ(index) - sourceNormals.getZ(index);
  }

  deformedGeometry.dispose();
  const attribute = new THREE.Float32BufferAttribute(normalDelta, 3);
  attribute.name = "skin";
  return attribute;
};

const ensureSkinReliefMorph = (mesh: THREE.Mesh) => {
  if (mesh.morphTargetDictionary?.skin !== undefined) return;

  const geometry = mesh.geometry;
  const positions = geometry.getAttribute("position");
  if (!positions) return;
  if (!geometry.getAttribute("normal")) geometry.computeVertexNormals();
  const normals = geometry.getAttribute("normal");
  const bounds = new THREE.Box3().setFromBufferAttribute(positions);
  const center = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const targetX = center.x + half.x * 0.35;
  const targetY = center.y + half.y * 0.17;
  const delta = new Float32Array(positions.count * 3);

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const frontWeight = symptomSmoothstep(center.z, center.z + half.z * 0.9, z);
    const skinWeight =
      symptomGaussian(
        x,
        y,
        targetX,
        targetY,
        half.x * 0.31,
        half.y * 0.23
      ) * frontWeight;
    const skinX = (x - targetX) / (half.x * 0.31);
    const skinY = (y - targetY) / (half.y * 0.23);
    const cellularWave =
      Math.sin(skinX * 18.5 + Math.sin(skinY * 3.1) * 0.8) *
      Math.sin(skinY * 20.5 - Math.sin(skinX * 2.7) * 0.7);
    const pore = Math.pow(Math.max(0, cellularWave), 5);
    const fineRelief =
      Math.sin(skinX * 31.3 + skinY * 7.1) *
      Math.sin(skinY * 28.7 - skinX * 5.3);
    const offset =
      skinWeight * half.z * (0.007 + fineRelief * 0.004 - pore * 0.04);

    delta[index * 3] = normals.getX(index) * offset;
    delta[index * 3 + 1] = normals.getY(index) * offset;
    delta[index * 3 + 2] = normals.getZ(index) * offset;
  }

  const positionAttribute = new THREE.Float32BufferAttribute(delta, 3);
  positionAttribute.name = "skin";
  const positionMorphs = geometry.morphAttributes.position ?? [];
  const targetIndex = positionMorphs.length;
  positionMorphs.push(positionAttribute);
  geometry.morphAttributes.position = positionMorphs;

  const normalMorphs = geometry.morphAttributes.normal ?? [];
  while (normalMorphs.length < targetIndex) {
    normalMorphs.push(new THREE.Float32BufferAttribute(new Float32Array(normals.count * 3), 3));
  }
  normalMorphs.push(createSkinReliefNormalAttribute(geometry, delta));
  geometry.morphAttributes.normal = normalMorphs;
  geometry.morphTargetsRelative = true;

  mesh.morphTargetDictionary ??= {};
  mesh.morphTargetDictionary.skin = targetIndex;
  mesh.morphTargetInfluences ??= [];
  while (mesh.morphTargetInfluences.length <= targetIndex) mesh.morphTargetInfluences.push(0);
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
};

const createSymptomColorState = (mesh: THREE.Mesh) => {
  const geometry = mesh.geometry;
  const existing = symptomColorStates.get(geometry);
  if (existing) return existing;

  const positions = geometry.getAttribute("position");
  const bounds = new THREE.Box3().setFromBufferAttribute(positions);
  const center = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const skinCenterX = center.x + half.x * 0.35;
  const skinCenterY = center.y + half.y * 0.17;
  const dimpleCenters = [
    [center.x - half.x * 0.43, center.y + half.y * 0.22],
    [center.x - half.x * 0.3, center.y + half.y * 0.08],
    [center.x - half.x * 0.42, center.y - half.y * 0.04],
  ];
  const skinColors = new Float32Array(positions.count * 3);
  const dimpleColors = new Float32Array(positions.count * 3);
  const neutral = new THREE.Color(0xffffff);
  const irritatedSkin = new THREE.Color(0xd74f68);
  const crustTone = new THREE.Color(0x7d303d);
  const mixed = new THREE.Color();

  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const frontWeight = symptomSmoothstep(center.z, center.z + half.z * 0.9, z);
    const skinWeight =
      symptomGaussian(
        x,
        y,
        skinCenterX,
        skinCenterY,
        half.x * 0.31,
        half.y * 0.23
      ) * frontWeight;
    const skinX = (x - skinCenterX) / (half.x * 0.31);
    const skinY = (y - skinCenterY) / (half.y * 0.23);
    const cellularWave =
      Math.sin(skinX * 18.5 + Math.sin(skinY * 3.1) * 0.8) *
      Math.sin(skinY * 20.5 - Math.sin(skinX * 2.7) * 0.7);
    const pore = Math.pow(Math.max(0, cellularWave), 5);
    const skinBlend = THREE.MathUtils.clamp(skinWeight * (0.18 + pore * 0.62), 0, 0.7);
    mixed.lerpColors(neutral, irritatedSkin, skinBlend);
    skinColors[index * 3] = mixed.r;
    skinColors[index * 3 + 1] = mixed.g;
    skinColors[index * 3 + 2] = mixed.b;

    let dimpleWeight = 0;
    dimpleCenters.forEach(([dimpleX, dimpleY]) => {
      dimpleWeight = Math.max(
        dimpleWeight,
        symptomGaussian(
          x,
          y,
          dimpleX,
          dimpleY,
          half.x * 0.11,
          half.y * 0.085
        ) * frontWeight
      );
    });
    const irregularity = 0.72 + Math.sin(x * 83 + y * 57) * 0.12;
    const dimpleBlend = THREE.MathUtils.clamp(dimpleWeight * irregularity * 0.68, 0, 0.68);
    mixed.lerpColors(neutral, crustTone, dimpleBlend);
    dimpleColors[index * 3] = mixed.r;
    dimpleColors[index * 3 + 1] = mixed.g;
    dimpleColors[index * 3 + 2] = mixed.b;
  }

  const state: SymptomColorState = {
    original: geometry.getAttribute("color"),
    skin: new THREE.Float32BufferAttribute(skinColors, 3),
    dimpling: new THREE.Float32BufferAttribute(dimpleColors, 3),
  };
  symptomColorStates.set(geometry, state);
  return state;
};

const applySymptomTint = (symptom: SymptomType) => {
  symptomMorphMeshes.forEach((mesh) => {
    const state = createSymptomColorState(mesh);
    const tint = symptom === "skin" || symptom === "dimpling" ? state[symptom] : undefined;

    if (tint) mesh.geometry.setAttribute("color", tint);
    else if (state.original) mesh.geometry.setAttribute("color", state.original);
    else mesh.geometry.deleteAttribute("color");

    const useVertexColors = Boolean(tint || state.original);
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach((material) => {
      (material as THREE.MeshStandardMaterial).vertexColors = useVertexColors;
      material.needsUpdate = true;
    });
  });
};

const findMorphSurfaceAnchors = (
  name: MorphSymptomType,
  requestedCount: number
): SurfaceAnchor[] => {
  if (!modelGroup) return [];
  modelGroup.updateMatrixWorld(true);

  const candidates: Array<{ mesh: THREE.Mesh; index: number; strength: number }> = [];
  symptomMorphMeshes.forEach((mesh) => {
    const targetIndex = mesh.morphTargetDictionary?.[name];
    const morphPositions =
      targetIndex === undefined ? undefined : mesh.geometry.morphAttributes.position?.[targetIndex];
    if (!morphPositions) return;

    let maximumStrength = 0;
    for (let index = 0; index < morphPositions.count; index += 1) {
      maximumStrength = Math.max(
        maximumStrength,
        Math.hypot(
          morphPositions.getX(index),
          morphPositions.getY(index),
          morphPositions.getZ(index)
        )
      );
    }
    if (maximumStrength <= Number.EPSILON) return;
    const threshold = maximumStrength * 0.55;
    for (let index = 0; index < morphPositions.count; index += 1) {
      const strength = Math.hypot(
        morphPositions.getX(index),
        morphPositions.getY(index),
        morphPositions.getZ(index)
      );
      if (strength >= threshold) candidates.push({ mesh, index, strength });
    }
  });
  candidates.sort((left, right) => right.strength - left.strength);

  const anchors: SurfaceAnchor[] = [];
  const inverseGroupMatrix = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
  for (const candidate of candidates) {
    const { mesh, index } = candidate;
    const targetIndex = mesh.morphTargetDictionary?.[name];
    if (targetIndex === undefined) continue;
    const positions = mesh.geometry.getAttribute("position");
    const normals = mesh.geometry.getAttribute("normal");
    const morphPosition = mesh.geometry.morphAttributes.position?.[targetIndex];
    const morphNormal = mesh.geometry.morphAttributes.normal?.[targetIndex];
    if (!positions || !normals || !morphPosition) continue;

    const point = new THREE.Vector3(
      morphPosition.getX(index),
      morphPosition.getY(index),
      morphPosition.getZ(index)
    );
    const normal = new THREE.Vector3(
      morphNormal?.getX(index) ?? 0,
      morphNormal?.getY(index) ?? 0,
      morphNormal?.getZ(index) ?? 0
    );
    if (mesh.geometry.morphTargetsRelative) {
      point.add(
        new THREE.Vector3(
          positions.getX(index),
          positions.getY(index),
          positions.getZ(index)
        )
      );
      normal.add(
        new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index))
      );
    }

    const groupPoint = modelGroup.worldToLocal(mesh.localToWorld(point));
    if (anchors.some((anchor) => anchor.point.distanceTo(groupPoint) < 0.12)) continue;

    const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
    const groupNormal = normal
      .applyMatrix3(normalMatrix)
      .normalize()
      .transformDirection(inverseGroupMatrix)
      .normalize();
    anchors.push({ point: groupPoint, normal: groupNormal });
    if (anchors.length >= requestedCount) break;
  }
  return anchors;
};

const addCrustRelief = (layer: THREE.Group) => {
  const anchors = findMorphSurfaceAnchors("dimpling", 3);
  if (!anchors.length) return;

  const geometry = new THREE.DodecahedronGeometry(1, 0);
  const positions = geometry.getAttribute("position");
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const irregularity = 1 + Math.sin(x * 9.7 + y * 7.3 + z * 11.1) * 0.13;
    positions.setXYZ(index, x * irregularity, y * irregularity, z);
  }
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    color: 0x5d2928,
    roughness: 0.93,
    metalness: 0,
  });
  const crusts = new THREE.InstancedMesh(geometry, material, anchors.length);
  crusts.name = "integrated-crusts";
  crusts.castShadow = true;
  crusts.receiveShadow = true;
  crusts.userData.preserveMaterial = true;

  const transform = new THREE.Object3D();
  anchors.forEach((anchor, index) => {
    transform.position.copy(anchor.point).addScaledVector(anchor.normal, 0.0015);
    transform.quaternion.setFromUnitVectors(markerForward, anchor.normal);
    const width = 0.025 + index * 0.004;
    transform.scale.set(width, width * (0.58 + index * 0.07), 0.005 + index * 0.001);
    transform.updateMatrix();
    crusts.setMatrixAt(index, transform.matrix);
  });
  crusts.instanceMatrix.needsUpdate = true;
  crusts.computeBoundingSphere();
  layer.add(crusts);
};

const addNippleDischarge = (
  layer: THREE.Group,
  loadedModel: THREE.Object3D,
  x: number,
  y: number
) => {
  const anchor = findFrontSurface(loadedModel, x, y);
  if (!anchor) return;

  const liquidMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xa7133b,
    roughness: 0.12,
    metalness: 0,
    clearcoat: 1,
    clearcoatRoughness: 0.035,
    transparent: true,
    opacity: 0.94,
    depthWrite: true,
  });

  nippleSourceBead = new THREE.Mesh(
    new THREE.SphereGeometry(0.017, 24, 16),
    liquidMaterial
  );
  nippleSourceBead.name = "nipple-discharge-source";
  nippleSourceBead.position.copy(anchor.point).addScaledVector(anchor.normal, 0.021);
  nippleSourceBead.userData.preserveMaterial = true;
  nippleSourceBead.renderOrder = 12;
  layer.add(nippleSourceBead);

  const dropletProfile = [
    new THREE.Vector2(0, -0.09),
    new THREE.Vector2(0.014, -0.078),
    new THREE.Vector2(0.021, -0.056),
    new THREE.Vector2(0.018, -0.034),
    new THREE.Vector2(0.008, -0.012),
    new THREE.Vector2(0, 0),
  ];
  const dropletGeometry = new THREE.LatheGeometry(dropletProfile, 24);

  [0, 0.333, 0.666].forEach((phase, index) => {
    const droplet = new THREE.Mesh(dropletGeometry, liquidMaterial);
    droplet.name = `falling-nipple-droplet-${index + 1}`;
    droplet.position.copy(anchor.point).addScaledVector(anchor.normal, 0.022);
    droplet.userData.preserveMaterial = true;
    droplet.castShadow = true;
    droplet.renderOrder = 12;
    layer.add(droplet);
    animatedDroplets.push({
      mesh: droplet,
      origin: droplet.position.clone(),
      normal: anchor.normal.clone(),
      phase,
      lateral: (index - 1) * 0.012,
    });
  });
};

const updateSymptomVisibility = (symptom: SymptomType) => {
  symptomMorphMeshes.forEach((mesh) => {
    if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;

    symptomMorphNames.forEach((name) => {
      const index = mesh.morphTargetDictionary?.[name];
      if (index !== undefined) mesh.morphTargetInfluences![index] = 0;
    });

    if (symptomMorphNames.includes(symptom as MorphSymptomType)) {
      const targetIndex = mesh.morphTargetDictionary[symptom];
      if (targetIndex !== undefined) mesh.morphTargetInfluences[targetIndex] = 1;
    }
  });

  symptomLayers.forEach((layer, type) => {
    layer.visible = symptom !== "none" && type === symptom;
  });
  applySymptomTint(symptom);
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

  createLayer("asymmetry");
  createLayer("skin");

  const dimplingLayer = createLayer("dimpling");
  addCrustRelief(dimplingLayer);

  const nippleLayer = createLayer("nipple");
  addNippleDischarge(nippleLayer, loadedModel, 0.34, 0.26);

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
              if (
                symptomMorphNames.some(
                  (name) => child.morphTargetDictionary?.[name] !== undefined
                )
              ) {
                embeddedSymptomMeshes.push(child);
              }
            }
          });

          if (primarySymptomMesh) {
            ensureSkinReliefMorph(primarySymptomMesh);
          }
          new Set([
            ...embeddedSymptomMeshes,
            ...(primarySymptomMesh ? [primarySymptomMesh] : []),
          ]).forEach((mesh) => {
            symptomMorphMeshes.push(mesh);
            createSymptomColorState(mesh);
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
  registerModelMaterials(mockBust, true);
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

  if (symptomLayers.get("nipple")?.visible) {
    if (nippleSourceBead) {
      const beadScale = 0.82 + (Math.sin(elapsedTime * 4.8) + 1) * 0.09;
      nippleSourceBead.scale.setScalar(beadScale);
    }

    animatedDroplets.forEach(({ mesh, origin, normal, phase, lateral }) => {
      const cycle = (elapsedTime * 0.48 + phase) % 1;
      const formationEnd = 0.2;
      mesh.visible = true;
      mesh.position.copy(origin);

      if (cycle < formationEnd) {
        const formation = symptomSmoothstep(0, formationEnd, cycle);
        mesh.position.addScaledVector(normal, formation * 0.012);
        mesh.scale.set(0.58 + formation * 0.42, 0.08 + formation * 0.92, 0.58 + formation * 0.42);
        return;
      }

      const fall = (cycle - formationEnd) / (1 - formationEnd);
      const gravity = fall * fall;
      const disappear = 1 - symptomSmoothstep(0.84, 1, fall);
      dropletFallOffset.set(lateral * fall, -0.68 * gravity, 0);
      mesh.position
        .addScaledVector(normal, 0.012 + fall * 0.055)
        .add(dropletFallOffset);
      mesh.scale.set(
        (1 - fall * 0.16) * disappear,
        (1.18 + (1 - fall) * 0.42) * disappear,
        (1 - fall * 0.16) * disappear
      );
      if (disappear < 0.03) mesh.visible = false;
    });
  }

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
