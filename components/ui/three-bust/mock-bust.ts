import * as THREE from "three";
import { gsap } from "gsap";

export function createMockBustController() {
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
    const pos = torsoGeom.getAttribute("position");
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

  return { createStylizedMockBust, animateToShape, dispose() { skinMaterial.dispose(); baseMaterial.dispose(); goldMaterial.dispose(); } };
}
