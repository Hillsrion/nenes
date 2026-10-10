import * as THREE from "three";
import type { createSymptomEffects } from "./symptom-effects";

type PerformanceNavigator = Navigator & {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
};

const isConstrainedDevice = () => {
  const currentNavigator = navigator as PerformanceNavigator;
  return (
    currentNavigator.connection?.saveData === true ||
    window.innerWidth < 1024 ||
    currentNavigator.maxTouchPoints > 0 ||
    (currentNavigator.deviceMemory ?? 8) <= 4 ||
    (currentNavigator.hardwareConcurrency ?? 8) <= 4
  );
};

// Apply the same pixel budget to the photo transitions, fruit scenes and busts.
const getRenderPixelRatio = (maximum = 1.25) =>
  Math.min(window.devicePixelRatio || 1, isConstrainedDevice() ? 1 : maximum);

// Normalize a freshly loaded GLB exactly like ThreeBustViewer does: strip the
// symptom skin helper, recenter, scale to the target height and lift slightly.
const normalizeLoadedBust = (root: THREE.Object3D, targetHeight: number, verticalOffset = 0) => {
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
  root.position.y += 0.2 + verticalOffset;
  root.updateMatrixWorld(true);
  return new THREE.Box3().setFromObject(root);
};

// Neutral vertices and the existing symptom profile locate the chest without
// including animated hands or large morph endpoints in the camera framing.
const getBustChestFraming = (root: THREE.Object3D) => {
  let body: THREE.Mesh | null = null;
  root.traverse(child => {
    if (child instanceof THREE.Mesh && child.userData.symptomProfile?.breast) body = child;
  });
  if (!body || !root.parent) return null;
  const mesh = body as THREE.Mesh;
  const bounds = new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute('position'));
  const center = bounds.getCenter(new THREE.Vector3());
  const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const [breastX, breastY] = mesh.userData.symptomProfile.breast;
  root.parent.updateWorldMatrix(true, true);
  const toGroup = (point: THREE.Vector3) => root.parent!.worldToLocal(mesh.localToWorld(point));
  const chest = toGroup(new THREE.Vector3(center.x, center.y + half.y * breastY, bounds.max.z));
  const edge = toGroup(new THREE.Vector3(center.x + half.x * (Math.abs(breastX) + 0.25), center.y + half.y * breastY, bounds.max.z));
  return { center: chest, halfWidth: Math.abs(edge.x - chest.x) };
};

const registerBustSymptoms = (root: THREE.Object3D, animated: boolean, symptomEffects: ReturnType<typeof createSymptomEffects>) => {
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

function addBustLighting(scene: THREE.Scene, useShadows = false) {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);

  // Key Studio Light (Warm)
  const keyLight = new THREE.DirectionalLight(0xfff3e0, 2.5);
  keyLight.position.set(5, 5, 5);
  keyLight.castShadow = useShadows;
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

}

export { isConstrainedDevice, getRenderPixelRatio, normalizeLoadedBust, getBustChestFraming, registerBustSymptoms, addBustLighting };
