import * as THREE from "three";

// Neutral clay material for shape-only photogrammetry exports. Shared by the
// single-model viewer and the two-model journey stage so both busts read as
// the same rose clay.
export const createGeneratedShapeMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xe2aabf,
    roughness: 0.78,
    metalness: 0,
    envMapIntensity: 0.18,
    clearcoat: 0.08,
    clearcoatRoughness: 0.8,
  });

export const createGlassMaterial = () =>
  new THREE.MeshPhysicalMaterial({
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
