import * as THREE from "three";
import { createCrustPatchGeometry } from "./crust-geometry";

export type SymptomType = "none" | "asymmetry" | "skin" | "dimpling" | "nipple";
type MorphSymptomType = Exclude<SymptomType, "none" | "nipple">;

const symptomMorphNames: MorphSymptomType[] = ["asymmetry", "skin", "dimpling"];
const markerForward = new THREE.Vector3(0, 0, 1);

interface SurfaceAnchor {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

interface MorphSurfaceAnchor extends SurfaceAnchor {
  neutralPoint: THREE.Vector3;
  neutralNormal: THREE.Vector3;
}

interface AnimatedDroplet {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  normal: THREE.Vector3;
}

interface SymptomColorState {
  neutral: Float32Array;
  blended: THREE.Float32BufferAttribute;
  skin: THREE.Float32BufferAttribute;
  dimpling: THREE.Float32BufferAttribute;
}

export interface SymptomEffectsController {
  applyTint: (symptom: SymptomType) => void;
  build: (loadedModel: THREE.Object3D, symptom: SymptomType) => void;
  dispose: () => void;
  registerMesh: (mesh: THREE.Mesh, ensureSkinRelief?: boolean) => void;
  tick: (elapsedTime: number) => void;
  isTransitioning: () => boolean;
  setGlobalOpacity: (opacity: number) => void;
  update: (symptom: SymptomType) => void;
}

export const createSymptomEffects = (
  getModelGroup: () => THREE.Group | null
): SymptomEffectsController => {
  let symptomRoot: THREE.Group | null = null;
  let nippleSourceBead: THREE.Mesh | null = null;
  const symptomLayers = new Map<SymptomType, THREE.Group>();
  const symptomMorphMeshes: THREE.Mesh[] = [];
  const animatedDroplets: AnimatedDroplet[] = [];
  const crustPatches: Array<{ mesh: THREE.Mesh; anchor: MorphSurfaceAnchor }> = [];
  const symptomColorStates = new WeakMap<THREE.BufferGeometry, SymptomColorState>();
  const weights = { asymmetry: 0, skin: 0, dimpling: 0, nipple: 0 };
  let fromWeights = { ...weights };
  let targetSymptom: SymptomType = "none";
  let transitionStart = 0;
  let transitioning = false;
  let globalOpacity = 1;
  const transitionDuration = 0.75;
  const layerMaterials = new Map<SymptomType, Map<THREE.Material, number>>();
  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  const findFrontSurface = (
    mesh: THREE.Mesh,
    x: number,
    y: number
  ): SurfaceAnchor | null => {
    const modelGroup = getModelGroup();
    if (!modelGroup) return null;

    modelGroup.updateMatrixWorld(true);
    const bounds = mesh.geometry.boundingBox!;
    // Cast in the body's coordinate system, excluding animated hands/helpers.
    const raycaster = new THREE.Raycaster(
      mesh.localToWorld(new THREE.Vector3(x, y, bounds.max.z + bounds.getSize(new THREE.Vector3()).z + 1)),
      new THREE.Vector3(0, 0, -1).transformDirection(mesh.matrixWorld)
    );
    const hit = raycaster
      .intersectObject(mesh, false)
      .find((intersection) => intersection.face && intersection.object instanceof THREE.Mesh);
    if (!hit?.face) return null;

    const inverseGroupMatrix = new THREE.Matrix4().copy(modelGroup.matrixWorld).invert();
    const normalMatrix = new THREE.Matrix3().getNormalMatrix(inverseGroupMatrix.multiply(mesh.matrixWorld));
    return {
      point: modelGroup.worldToLocal(hit.point.clone()),
      normal: (hit.normal ?? hit.face.normal).clone().applyMatrix3(normalMatrix).normalize(),
    };
  };

  const findNippleAnchor = (mesh: THREE.Mesh) => {
    // Profiles are calibrated against neutral vertices. Three's boundingBox
    // also includes every morph endpoint, including large palpation offsets.
    const bounds = new THREE.Box3().setFromBufferAttribute(mesh.geometry.getAttribute("position"));
    if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
    const center = bounds.getCenter(new THREE.Vector3());
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const profile = mesh.userData.symptomProfile;
    const [relativeX, relativeY] = profile?.nipple ?? profile?.breast ?? [0.35, 0.14];
    const x = center.x + half.x * relativeX;
    const y = center.y + half.y * relativeY;
    const initial = findFrontSurface(mesh, x, y);
    if (!initial) return null;

    // The seed may land on the nipple's flank. Its own normal then tilts the
    // search plane toward that flank, keeping the source off-center. Estimate
    // the breast's underlying slope outside the nipple before finding its tip.
    const radius = Math.min(half.x, half.y) * 0.045;
    const surroundingNormal = new THREE.Vector3();
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const surrounding = findFrontSurface(mesh, x + dx * radius * 2, y + dy * radius * 2);
      if (surrounding) surroundingNormal.add(surrounding.normal);
    }
    const searchNormal = surroundingNormal.lengthSq() > 0.001
      ? surroundingNormal.normalize() : initial.normal;
    let best = initial;
    let bestScore = 0;
    let bestX = x;
    let bestY = y;
    const consider = (candidateX: number, candidateY: number) => {
      if (Math.hypot(candidateX - x, candidateY - y) > radius + Number.EPSILON) return;
      const candidate = findFrontSurface(mesh, candidateX, candidateY);
      if (!candidate) return;
      const offset = candidate.point.clone().sub(initial.point);
      const score = offset.dot(searchNormal) - offset.length() * 0.06;
      if (score > bestScore) {
        best = candidate;
        bestScore = score;
        bestX = candidateX;
        bestY = candidateY;
      }
    };
    for (let row = -2; row <= 2; row += 1) {
      for (let column = -2; column <= 2; column += 1) {
        if (row * row + column * column > 4) continue;
        consider(x + column * radius / 2, y + row * radius / 2);
      }
    }
    // Resolve between coarse samples without widening the calibrated search.
    const refinementX = bestX;
    const refinementY = bestY;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      consider(refinementX + dx * radius / 4, refinementY + dy * radius / 4);
    }
    return best;
  };

  const smoothstep = (edge0: number, edge1: number, value: number) => {
    const normalized = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
    return normalized * normalized * (3 - 2 * normalized);
  };

  const gaussian = (
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
      const frontWeight = smoothstep(center.z, center.z + half.z * 0.9, z);
      const skinWeight =
        gaussian(x, y, targetX, targetY, half.x * 0.31, half.y * 0.23) * frontWeight;
      const skinX = (x - targetX) / (half.x * 0.31);
      const skinY = (y - targetY) / (half.y * 0.23);
      const cellularWave =
        Math.sin(skinX * 18.5 + Math.sin(skinY * 3.1) * 0.8) *
        Math.sin(skinY * 20.5 - Math.sin(skinX * 2.7) * 0.7);
      const pore = Math.pow(Math.max(0, cellularWave), 5);
      const fineRelief =
        Math.sin(skinX * 31.3 + skinY * 7.1) * Math.sin(skinY * 28.7 - skinX * 5.3);
      const offset = skinWeight * half.z * (0.007 + fineRelief * 0.004 - pore * 0.04);

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

  const createColorState = (mesh: THREE.Mesh) => {
    const geometry = mesh.geometry;
    const existing = symptomColorStates.get(geometry);
    if (existing) return existing;

    const positions = geometry.getAttribute("position");
    const bounds = new THREE.Box3().setFromBufferAttribute(positions);
    const center = bounds.getCenter(new THREE.Vector3());
    const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
    const profile = mesh.userData.symptomProfile;
    const skinCenterX = center.x + half.x * (profile?.skin?.[0] ?? 0.35);
    const skinCenterY = center.y + half.y * (profile?.skin?.[1] ?? 0.17);
    const dimpleCenters: number[][] = profile
      ? profile.dimples.map(([x, y]: number[]) => [center.x + half.x * x, center.y + half.y * y])
      : [
      [center.x - half.x * 0.43, center.y + half.y * 0.22],
      [center.x - half.x * 0.3, center.y + half.y * 0.08],
      [center.x - half.x * 0.42, center.y - half.y * 0.04],
    ];
    const neutralColors = new Float32Array(positions.count * 3);
    const skinColors = new Float32Array(positions.count * 3);
    const dimpleColors = new Float32Array(positions.count * 3);
    const neutral = new THREE.Color(0xffffff);
    const irritatedSkin = new THREE.Color(0xd74f68);
    const crustTone = new THREE.Color(0xb96e5e);
    const mixed = new THREE.Color();

    for (let index = 0; index < positions.count; index += 1) {
      const x = positions.getX(index);
      const y = positions.getY(index);
      const z = positions.getZ(index);
      const frontWeight = smoothstep(center.z, center.z + half.z * 0.9, z);
      const skinWeight =
        gaussian(x, y, skinCenterX, skinCenterY, half.x * 0.31, half.y * 0.23) * frontWeight;
      const skinX = (x - skinCenterX) / (half.x * 0.31);
      const skinY = (y - skinCenterY) / (half.y * 0.23);
      const cellularWave =
        Math.sin(skinX * 18.5 + Math.sin(skinY * 3.1) * 0.8) *
        Math.sin(skinY * 20.5 - Math.sin(skinX * 2.7) * 0.7);
      const pore = Math.pow(Math.max(0, cellularWave), 5);
      const skinBlend = THREE.MathUtils.clamp(skinWeight * (profile ? 0.32 : 0.18 + pore * 0.62), 0, 0.7);
      const original = geometry.getAttribute("color");
      if (original) neutral.setRGB(original.getX(index), original.getY(index), original.getZ(index));
      neutral.toArray(neutralColors, index * 3);
      mixed.lerpColors(neutral, irritatedSkin, skinBlend);
      skinColors[index * 3] = mixed.r;
      skinColors[index * 3 + 1] = mixed.g;
      skinColors[index * 3 + 2] = mixed.b;

      let dimpleWeight = 0;
      dimpleCenters.forEach(([dimpleX, dimpleY]) => {
        dimpleWeight = Math.max(
          dimpleWeight,
          gaussian(x, y, dimpleX, dimpleY, half.x * 0.11, half.y * 0.085) * frontWeight
        );
      });
      const irregularity = 0.72 + Math.sin(x * 83 + y * 57) * 0.12;
      const dimpleBlend = THREE.MathUtils.clamp(dimpleWeight * irregularity * 0.35, 0, 0.35);
      mixed.lerpColors(neutral, crustTone, dimpleBlend);
      dimpleColors[index * 3] = mixed.r;
      dimpleColors[index * 3 + 1] = mixed.g;
      dimpleColors[index * 3 + 2] = mixed.b;
    }

    const state: SymptomColorState = {
      neutral: neutralColors,
      blended: new THREE.Float32BufferAttribute(neutralColors.slice(), 3).setUsage(THREE.DynamicDrawUsage),
      skin: new THREE.Float32BufferAttribute(skinColors, 3),
      dimpling: new THREE.Float32BufferAttribute(dimpleColors, 3),
    };
    symptomColorStates.set(geometry, state);
    return state;
  };

  // Keep the same color buffer bound throughout the transition, including when
  // switching materials. Only upload colors while their weights are changing.
  const applyTint = (_symptom: SymptomType) => {
    symptomMorphMeshes.forEach((mesh) => {
      const state = createColorState(mesh);
      const colors = state.blended.array;
      for (let i = 0; i < colors.length; i += 1) {
        colors[i] = state.neutral[i]
          + (state.skin.array[i] - state.neutral[i]) * weights.skin
          + (state.dimpling.array[i] - state.neutral[i]) * weights.dimpling;
      }
      state.blended.needsUpdate = true;
      mesh.geometry.setAttribute("color", state.blended);
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach((material) => {
        const coloredMaterial = material as THREE.MeshStandardMaterial;
        if (!coloredMaterial.vertexColors) {
          coloredMaterial.vertexColors = true;
          material.needsUpdate = true;
        }
      });
    });
  };

  const findMorphSurfaceAnchors = (
    name: MorphSymptomType,
    requestedCount: number
  ): MorphSurfaceAnchor[] => {
    const modelGroup = getModelGroup();
    if (!modelGroup) return [];
    modelGroup.updateMatrixWorld(true);

    const candidates: Array<{ mesh: THREE.Mesh; index: number; strength: number }> = [];
    symptomMorphMeshes.forEach((mesh) => {
      const targetIndex = mesh.morphTargetDictionary?.[name];
      const morphPositions =
        targetIndex === undefined ? undefined : mesh.geometry.morphAttributes.position?.[targetIndex];
      if (!morphPositions) return;
      const positions = mesh.geometry.getAttribute("position");
      const strengthAt = (index: number) => Math.hypot(
        morphPositions.getX(index) - (mesh.geometry.morphTargetsRelative ? 0 : positions.getX(index)),
        morphPositions.getY(index) - (mesh.geometry.morphTargetsRelative ? 0 : positions.getY(index)),
        morphPositions.getZ(index) - (mesh.geometry.morphTargetsRelative ? 0 : positions.getZ(index))
      );

      let maximumStrength = 0;
      for (let index = 0; index < morphPositions.count; index += 1) {
        maximumStrength = Math.max(maximumStrength, strengthAt(index));
      }
      if (maximumStrength <= Number.EPSILON) return;
      const threshold = maximumStrength * 0.55;
      for (let index = 0; index < morphPositions.count; index += 1) {
        const strength = strengthAt(index);
        if (strength >= threshold) candidates.push({ mesh, index, strength });
      }
    });
    candidates.sort((left, right) => right.strength - left.strength);

    const anchors: MorphSurfaceAnchor[] = [];
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
          new THREE.Vector3(positions.getX(index), positions.getY(index), positions.getZ(index))
        );
        normal.add(new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index)));
      } else if (!morphNormal) {
        normal.set(normals.getX(index), normals.getY(index), normals.getZ(index));
      }

      const groupPoint = modelGroup.worldToLocal(mesh.localToWorld(point));
      if (anchors.some((anchor) => anchor.point.distanceTo(groupPoint) < 0.12)) continue;

      const normalMatrix = new THREE.Matrix3().getNormalMatrix(
        inverseGroupMatrix.clone().multiply(mesh.matrixWorld)
      );
      const neutralPoint = modelGroup.worldToLocal(mesh.localToWorld(new THREE.Vector3(
        positions.getX(index), positions.getY(index), positions.getZ(index)
      )));
      const neutralNormal = new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index))
        .applyMatrix3(normalMatrix).normalize();
      const groupNormal = normal
        .applyMatrix3(normalMatrix)
        .normalize();
      anchors.push({ point: groupPoint, normal: groupNormal, neutralPoint, neutralNormal });
      if (anchors.length >= requestedCount) break;
    }
    return anchors;
  };

  const addCrustRelief = (layer: THREE.Group) => {
    const anchors = findMorphSurfaceAnchors("dimpling", 3);
    if (!anchors.length) return;

    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff, vertexColors: true, roughness: 0.97, metalness: 0,
      side: THREE.DoubleSide,
    });
    const crusts = new THREE.Group();
    crusts.name = "integrated-crusts";
    anchors.forEach((anchor, index) => {
      const patch = new THREE.Mesh(createCrustPatchGeometry(index + 1), material);
      patch.name = `crust-patch-${index + 1}`;
      const width = 0.027 + index * 0.003;
      patch.scale.set(width, width * (0.72 + index * 0.06), width);
      patch.castShadow = true;
      patch.receiveShadow = true;
      patch.userData.preserveMaterial = true;
      crustPatches.push({ mesh: patch, anchor });
      crusts.add(patch);
    });
    layer.add(crusts);
  };

  const addNippleDischarge = (
    layer: THREE.Group,
    body: THREE.Mesh
  ) => {
    const anchor = findNippleAnchor(body);
    if (!anchor) return;

    const liquidMaterial = new THREE.MeshPhysicalMaterial({
      // One possible serous discharge; blood is not the universal appearance.
      color: 0xf5e8cb,
      roughness: 0.045,
      transmission: 0.72,
      ior: 1.333,
      thickness: 0.025,
      attenuationColor: new THREE.Color(0xf5e5c1),
      attenuationDistance: 0.16,
      specularIntensity: 1,
      clearcoat: 0.65,
      clearcoatRoughness: 0.025,
      transparent: true,
      opacity: 0.94,
      depthWrite: true,
    });
    nippleSourceBead = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), liquidMaterial);
    nippleSourceBead.name = "nipple-discharge-source";
    nippleSourceBead.position.copy(anchor.point).addScaledVector(anchor.normal, 0.001);
    nippleSourceBead.quaternion.setFromUnitVectors(markerForward, anchor.normal);
    nippleSourceBead.scale.set(0.009, 0.008, 0.004);
    nippleSourceBead.userData.preserveMaterial = true;
    nippleSourceBead.renderOrder = 12;
    layer.add(nippleSourceBead);

    const dropletProfile = [
      new THREE.Vector2(0, -0.035),
      new THREE.Vector2(0.004, -0.034),
      new THREE.Vector2(0.008, -0.031),
      new THREE.Vector2(0.011, -0.026),
      new THREE.Vector2(0.012, -0.021),
      new THREE.Vector2(0.010, -0.015),
      new THREE.Vector2(0.006, -0.009),
      new THREE.Vector2(0.003, -0.004),
      new THREE.Vector2(0.0025, 0),
    ];
    const profileCurve = new THREE.SplineCurve(dropletProfile);
    const dropletGeometry = new THREE.LatheGeometry(
      profileCurve.getPoints(48).map(point => new THREE.Vector2(Math.max(0, point.x), point.y)), 32
    );
    const droplet = new THREE.Mesh(dropletGeometry, liquidMaterial);
    droplet.name = "falling-nipple-droplet-1";
    droplet.position.copy(anchor.point).addScaledVector(anchor.normal, 0.003);
    droplet.userData.preserveMaterial = true;
    droplet.renderOrder = 12;
    layer.add(droplet);
    animatedDroplets.push({
      mesh: droplet,
      origin: droplet.position.clone(),
      normal: anchor.normal.clone(),
    });
  };

  const applyWeights = (updateColors = true) => {
    symptomMorphMeshes.forEach((mesh) => {
      if (!mesh.morphTargetInfluences || !mesh.morphTargetDictionary) return;
      symptomMorphNames.forEach((name) => {
        const index = mesh.morphTargetDictionary?.[name];
        if (index !== undefined) mesh.morphTargetInfluences![index] = weights[name];
      });
    });
    symptomLayers.forEach((layer, type) => {
      const weight = type === "none" ? 0 : weights[type];
      layer.visible = weight > 0;
      layerMaterials.get(type)?.forEach((opacity, material) => {
        material.opacity = opacity * weight * globalOpacity;
      });
    });
    crustPatches.forEach(({ mesh, anchor }) => {
      mesh.position.lerpVectors(anchor.neutralPoint, anchor.point, weights.dimpling);
      const normal = anchor.neutralNormal.clone().lerp(anchor.normal, weights.dimpling).normalize();
      mesh.position.addScaledVector(normal, 0.0005);
      mesh.quaternion.setFromUnitVectors(markerForward, normal);
    });
    if (updateColors) applyTint(targetSymptom);
  };

  const advanceTransition = (now: number) => {
    if (!transitioning) return;
    const progress = prefersReducedMotion() ? 1
      : THREE.MathUtils.clamp((now - transitionStart) / transitionDuration, 0, 1);
    const eased = progress * progress * (3 - 2 * progress);
    const previousSkin = weights.skin;
    const previousDimpling = weights.dimpling;
    for (const name of Object.keys(weights) as Array<keyof typeof weights>) {
      weights[name] = THREE.MathUtils.lerp(fromWeights[name], targetSymptom === name ? 1 : 0, eased);
    }
    applyWeights(previousSkin !== weights.skin || previousDimpling !== weights.dimpling);
    transitioning = progress < 1;
  };

  const update = (symptom: SymptomType) => {
    if (symptom === targetSymptom) return;
    const now = performance.now() / 1000;
    // Start from the current blend when scrolling quickly or reversing direction.
    advanceTransition(now);
    fromWeights = { ...weights };
    targetSymptom = symptom;
    transitionStart = now;
    transitioning = true;
    if (prefersReducedMotion()) advanceTransition(now);
  };

  const setGlobalOpacity = (opacity: number) => {
    globalOpacity = THREE.MathUtils.clamp(opacity, 0, 1);
    applyWeights(false);
  };

  const build = (_loadedModel: THREE.Object3D, symptom: SymptomType) => {
    const modelGroup = getModelGroup();
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
    const body = symptomMorphMeshes.find((mesh) => mesh.userData.symptomProfile?.nipple)
      ?? [...symptomMorphMeshes].sort((a, b) =>
        b.geometry.getAttribute("position").count - a.geometry.getAttribute("position").count
      )[0];
    if (body) addNippleDischarge(nippleLayer, body);
    symptomLayers.forEach((layer, type) => {
      const materials = new Map<THREE.Material, number>();
      layer.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        (Array.isArray(child.material) ? child.material : [child.material]).forEach((material) => {
          if (materials.has(material)) return;
          materials.set(material, material.opacity);
          material.transparent = true;
          material.depthWrite = false;
          material.needsUpdate = true;
        });
      });
      layerMaterials.set(type, materials);
    });
    applyWeights();
    update(symptom);
  };

  const tick = (elapsedTime: number) => {
    advanceTransition(elapsedTime);
    if (!symptomLayers.get("nipple")?.visible) return;
    if (nippleSourceBead) {
      const swelling = prefersReducedMotion() ? 1 : 0.94 + Math.sin(elapsedTime * 1.8) * 0.06;
      nippleSourceBead.scale.set(0.009 * swelling, 0.008 * swelling, 0.004);
    }
    animatedDroplets.forEach(({ mesh, origin, normal }) => {
      const cycle = prefersReducedMotion() ? 0.58 : (elapsedTime * 0.28) % 1;
      const formationEnd = 0.74;
      mesh.visible = true;
      mesh.position.copy(origin);
      if (cycle < formationEnd) {
        const formation = smoothstep(0, formationEnd, cycle);
        mesh.scale.set(0.28 + formation * 0.72, 0.18 + formation * 0.82, 0.28 + formation * 0.72);
        return;
      }

      const fall = (cycle - formationEnd) / (1 - formationEnd);
      const gravity = fall * fall;
      const disappear = 1 - smoothstep(0.84, 1, fall);
      mesh.position
        .addScaledVector(normal, fall * 0.008);
      mesh.position.y -= 0.28 * gravity;
      mesh.scale.set(
        (1 + fall * 0.1) * disappear,
        (1.05 - fall * 0.25) * disappear,
        (1 + fall * 0.1) * disappear
      );
      if (disappear < 0.03) mesh.visible = false;
    });
  };

  const dispose = () => {
    const geometries = new Set<THREE.BufferGeometry>();
    const materials = new Set<THREE.Material>();
    symptomRoot?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      geometries.add(child.geometry);
      (Array.isArray(child.material) ? child.material : [child.material])
        .forEach((material) => materials.add(material));
    });
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    symptomRoot?.removeFromParent();
    symptomRoot = null;
    nippleSourceBead = null;
    symptomLayers.clear();
    layerMaterials.clear();
    transitioning = false;
    targetSymptom = "none";
    weights.asymmetry = weights.skin = weights.dimpling = weights.nipple = 0;
    fromWeights = { ...weights };
    symptomMorphMeshes.length = 0;
    animatedDroplets.length = 0;
    crustPatches.length = 0;
  };

  const registerMesh = (mesh: THREE.Mesh, ensureSkinRelief = false) => {
    if (symptomMorphMeshes.includes(mesh)) return;
    if (ensureSkinRelief) ensureSkinReliefMorph(mesh);
    symptomMorphMeshes.push(mesh);
    createColorState(mesh);
  };

  return { applyTint, build, dispose, registerMesh, tick, update, setGlobalOpacity, isTransitioning: () => transitioning };
};
