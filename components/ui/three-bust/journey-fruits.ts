import * as THREE from "three";
import { journeyFruitChoices } from "../../../config/bust-fruit-catalog";
import { loadingFruitSequence } from "../../../config/loading-fruits";
import { createFruitModel } from "../../../utils/loading-fruit-models";
import { fruitSelectionOffset } from "../../../utils/fruit-selection-motion";

export const FRUIT_CAMERA_DISTANCE = 8;
export const FRUIT_COLUMN_NDC = 0.54;

export function createJourneyFruits(scene: THREE.Scene, reducedMotion: boolean) {
  const group = new THREE.Group();
  group.name = "journey-fruit-selection";
  group.visible = false;
  scene.add(group);
  const records: Array<{ pivot: THREE.Group; index: number }> = [];
  let disposed = false;
  let startTime = 0;
  let active = false;
  let selectedIndex = 1;
  let hoveredIndex = -1;
  let halfWidth = 3;
  let responsiveScale = 1;
  const ownedGeometries = new Set<THREE.BufferGeometry>();
  const definitions = [
    loadingFruitSequence[0],
    loadingFruitSequence[4],
    { ...loadingFruitSequence[4], name: "pamplemousse", color: "#efad56", highlight: "#ffe7aa" },
  ];
  const ready = Promise.all(definitions.map(async (definition, index) => {
    let model: THREE.Group;
    try {
      model = await createFruitModel(definition);
    } catch {
      // Keep a recognizable choice even if a fruit asset cannot be fetched.
      model = new THREE.Group();
      const geometry = new THREE.SphereGeometry(1, 32, 24);
      ownedGeometries.add(geometry);
      geometry.scale(index === 0 ? 1.15 : 1, index === 0 ? 0.72 : 1, 1);
      model.add(new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: definition.color, roughness: 0.6 })));
    }
    if (disposed) { disposeMaterials(model); return; }
    const pivot = new THREE.Group();
    model.scale.setScalar(journeyFruitChoices[index].visualScale);
    if (index > 0) model.scale.y *= 0.82;
    model.rotation.set(0.12, -0.2 + index * 0.25, index === 0 ? -0.3 : 0.06);
    pivot.add(model);
    group.add(pivot);
    records.push({ pivot, index });
    layout();
  }));

  function layout() {
    records.forEach(({ pivot, index }) => {
      pivot.scale.setScalar(responsiveScale);
      pivot.position.x = (index - 1) * FRUIT_COLUMN_NDC * halfWidth;
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
    tick(now: number, opacity: number) {
      if (opacity > 0.001 && !group.visible) startTime = now;
      group.visible = opacity > 0.001;
      if (!group.visible) return;
      records.forEach(({ pivot, index }) => {
        const motion = fruitSelectionOffset(now - startTime - index * 0.14, reducedMotion);
        pivot.position.y = motion.y;
        pivot.rotation.z = motion.rotation;
        pivot.rotation.y = reducedMotion ? 0 : Math.sin(now * 0.65 + index) * 0.12;
        pivot.traverse(child => {
          if (!(child instanceof THREE.Mesh)) return;
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach(material => {
            const standard = material as THREE.MeshStandardMaterial;
            if (standard.transparent !== (opacity < 0.999)) {
              standard.transparent = opacity < 0.999;
              standard.needsUpdate = true;
            }
            standard.opacity = opacity;
            standard.depthWrite = opacity >= 0.999;
            standard.emissive?.set(index === selectedIndex || index === hoveredIndex ? 0x592015 : 0x000000);
            standard.emissiveIntensity = 0.16;
          });
        });
      });
    },
    get active() { return active; },
    dispose() {
      disposed = true;
      disposeMaterials(group);
      ownedGeometries.forEach(geometry => geometry.dispose());
      ownedGeometries.clear();
      group.removeFromParent();
      records.length = 0;
    },
  };
}
