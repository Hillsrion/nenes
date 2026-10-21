import * as THREE from "three";
import { journeyFruitChoices } from "../../../config/bust-fruit-catalog";
import { loadingFruitSequence } from "../../../config/loading-fruits";
import { createFruitModel } from "../../../utils/loading-fruit-models";
import { fruitSelectionOffset, fruitLandingCount, fruitSelectionColumn, FRUIT_FALL_STAGGER } from "../../../utils/fruit-selection-motion";
import { fruitFlightPosition } from "../../../utils/fruit-flight-motion";

export const FRUIT_CAMERA_DISTANCE = 8;

export function createJourneyFruits(scene: THREE.Scene, reducedMotion: boolean, lightweight = false) {
  const group = new THREE.Group();
  group.name = "journey-fruit-selection";
  group.visible = false;
  scene.add(group);
  const records: Array<{ pivot: THREE.Group; index: number; materials: THREE.MeshStandardMaterial[] }> = [];
  let disposed = false;
  let startTime = 0;
  let active = false;
  let landedCount = 0;
  let selectedIndex = 0;
  let hoveredIndex = -1;
  let halfWidth = 3;
  let responsiveScale = 1;
  let flight: { pivot: THREE.Group; start: THREE.Vector3; rotation: THREE.Quaternion; index: number } | null = null;
  const flightTurn = new THREE.Quaternion();
  const flightUp = new THREE.Vector3(0, 1, 0);
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const definitions = [
    loadingFruitSequence[4],
    { ...loadingFruitSequence[4], name: "pamplemousse", color: "#efad56", highlight: "#ffe7aa" },
  ];
  const ready = Promise.all(definitions.map(async (definition, index) => {
    let model: THREE.Group;
    try {
      model = await createFruitModel(definition, lightweight);
    } catch {
      // Keep a recognizable choice even if a fruit asset cannot be fetched.
      model = new THREE.Group();
      const geometry = new THREE.SphereGeometry(1, 32, 24);
      ownedGeometries.add(geometry);
      model.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.6 })));
    }
    if (disposed) { disposeMaterials(model); return; }
    const pivot = new THREE.Group();
    model.scale.setScalar(journeyFruitChoices[index].visualScale);
    model.scale.y *= 0.82;
    model.rotation.set(0.12, 0.05 + index * 0.25, 0.06);
    pivot.add(model);
    group.add(pivot);
    // Keep the same shader variant throughout the entrance fade.
    const materials: THREE.MeshStandardMaterial[] = [];
    model.traverse(child => {
      if (!(child instanceof THREE.Mesh)) return;
      const meshMaterials = Array.isArray(child.material) ? child.material : [child.material];
      meshMaterials.forEach(material => {
        material.transparent = true;
        materials.push(material as THREE.MeshStandardMaterial);
      });
    });
    records.push({ pivot, index, materials });
    layout();
  }));

  function layout() {
    records.forEach(({ pivot, index }) => {
      pivot.scale.setScalar(responsiveScale);
      pivot.position.x = fruitSelectionColumn(index) * halfWidth;
    });
  }
  function disposeMaterials(root: THREE.Object3D) {
    root.traverse(child => {
      if (child instanceof THREE.Mesh) {
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach(material => material.dispose());
        // Loaded geometry and textures belong to the shared fruit cache.
      }
    });
  }
  function clearFlight() {
    if (!flight) return;
    disposeMaterials(flight.pivot);
    flight.pivot.removeFromParent();
    flight = null;
  }
  function updateFlight(progress: number | null, camera?: THREE.PerspectiveCamera) {
    if (progress === null || reducedMotion || !camera) { clearFlight(); return; }
    if (!flight || flight.index !== selectedIndex) {
      clearFlight();
      const source = records.find(record => record.index === selectedIndex)?.pivot;
      if (!source) return;
      const start = camera.worldToLocal(source.getWorldPosition(new THREE.Vector3()));
      const pivot = source.clone(true);
      pivot.name = "journey-fruit-flight";
      pivot.visible = true;
      pivot.quaternion.copy(camera.getWorldQuaternion(new THREE.Quaternion()).invert()
        .multiply(source.getWorldQuaternion(new THREE.Quaternion())));
      pivot.scale.copy(source.getWorldScale(new THREE.Vector3()));
      pivot.traverse(child => {
        if (!(child instanceof THREE.Mesh)) return;
        const cloneMaterial = (material: THREE.Material) => {
          const clone = material.clone();
          // Keep the viewport covered until the model is ready to be revealed.
          clone.side = THREE.DoubleSide;
          clone.transparent = false;
          clone.opacity = 1;
          clone.depthTest = clone.depthWrite = true;
          return clone;
        };
        child.material = Array.isArray(child.material) ? child.material.map(cloneMaterial) : cloneMaterial(child.material);
        child.renderOrder = 10000;
      });
      camera.add(pivot);
      flight = { pivot, start, rotation: pivot.quaternion.clone(), index: selectedIndex };
    }
    const position = fruitFlightPosition(progress, flight.start.x, flight.start.y, Math.max(4, halfWidth));
    flight.pivot.position.set(position.x, position.y, position.z);
    flightTurn.setFromAxisAngle(flightUp, progress * Math.PI * 2);
    flight.pivot.quaternion.copy(flightTurn).multiply(flight.rotation);
  }
  return {
    ready,
    place(center: THREE.Vector3, aspect: number, fov: number) {
      group.position.copy(center);
      responsiveScale = Math.min(1, aspect);
      halfWidth = Math.tan(THREE.MathUtils.degToRad(fov) / 2) * FRUIT_CAMERA_DISTANCE * aspect;
      layout();
    },
    setActive(value: boolean) {
      if (value && !active && !group.visible) startTime = performance.now() / 1000;
      active = value;
    },
    select(index: number, hover = -1) { selectedIndex = index; hoveredIndex = hover; },
    tick(now: number, opacity: number, flightProgress: number | null = null, camera?: THREE.PerspectiveCamera) {
      updateFlight(flightProgress, camera);
      if (flightProgress !== null) opacity *= 1 - THREE.MathUtils.smoothstep(flightProgress, 0, 0.12);
      if (opacity > 0.001 && !group.visible) startTime = now;
      group.visible = opacity > 0.001;
      if (!group.visible) { landedCount = 0; return; }
      landedCount = fruitLandingCount(now - startTime, reducedMotion);
      records.forEach(({ pivot, index, materials }) => {
        pivot.visible = flightProgress === null || index !== selectedIndex;
        const motion = fruitSelectionOffset(now - startTime - index * FRUIT_FALL_STAGGER, reducedMotion);
        pivot.position.y = motion.y;
        pivot.rotation.z = motion.rotation;
        pivot.rotation.y = reducedMotion ? 0 : Math.sin(now * 0.65 + index) * 0.12;
        materials.forEach(material => {
          material.opacity = opacity;
          material.depthWrite = opacity >= 0.999;
          material.emissive?.set(index < landedCount && (index === selectedIndex || index === hoveredIndex) ? 0x592015 : 0x000000);
          material.emissiveIntensity = 0.16;
        });
      });
    },
    get active() { return active; },
    get landedCount() { return landedCount; },
    get isEntering() { return group.visible && landedCount < records.length && !reducedMotion; },
    dispose() {
      disposed = true;
      clearFlight();
      disposeMaterials(group);
      ownedGeometries.forEach(geometry => geometry.dispose());
      ownedGeometries.clear();
      group.removeFromParent();
      records.length = 0;
    },
  };
}
