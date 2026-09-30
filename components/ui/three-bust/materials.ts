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

// Satin pearl shared by the material preview and the home busts. Broader,
// softer highlights retain the iridescence without a polished glass finish.
export const createIridescentMaterial = () =>
  new THREE.MeshPhysicalMaterial({
    color: 0xbba7e8,
    roughness: 0.42,
    metalness: 0.1,
    transmission: 0.08,
    thickness: 0.6,
    ior: 1.34,
    envMapIntensity: 0.5,
    clearcoat: 0.3,
    clearcoatRoughness: 0.4,
    iridescence: 1,
    iridescenceIOR: 1.45,
    iridescenceThicknessRange: [160, 680],
    sheen: 0.65,
    sheenColor: new THREE.Color(0x69f3e5),
    sheenRoughness: 0.5,
  });
