import * as THREE from "three";

export type SymptomType = "none" | "asymmetry" | "skin" | "dimpling" | "nipple";
type MorphSymptomType = Exclude<SymptomType, "none" | "nipple">;

const symptomMorphNames: MorphSymptomType[] = ["asymmetry", "skin", "dimpling"];
const markerForward = new THREE.Vector3(0, 0, 1);
const dropletFallOffset = new THREE.Vector3();

interface SurfaceAnchor {
  point: THREE.Vector3;
  normal: THREE.Vector3;
}

interface AnimatedDroplet {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  normal: THREE.Vector3;
  phase: number;
  lateral: number;
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
  const symptomColorStates = new WeakMap<THREE.BufferGeometry, SymptomColorState>();
  const weights = { asymmetry: 0, skin: 0, dimpling: 0, nipple: 0 };
  let fromWeights = { ...weights };
  let targetSymptom: SymptomType = "none";
  let transitionStart = 0;
  let transitioning = false;
  const transitionDuration = 0.75;
  const layerMaterials = new Map<SymptomType, Map<THREE.Material, number>>();
  const prefersReducedMotion = () =>
    typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;


  const findFrontSurface = (
    loadedModel: THREE.Object3D,
    x: number,
    y: number
  ): SurfaceAnchor | null => {
    const modelGroup = getModelGroup();
    if (!modelGroup) return null;

    modelGroup.updateMatrixWorld(true);
    const raycaster = new THREE.Raycaster(
      modelGroup.localToWorld(new THREE.Vector3(x, y, 3)),
      new THREE.Vector3(0, 0, -1).transformDirection(modelGroup.matrixWorld)
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
    const crustTone = new THREE.Color(0x7d303d);
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
      const dimpleBlend = THREE.MathUtils.clamp(dimpleWeight * irregularity * 0.68, 0, 0.68);
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
  ): SurfaceAnchor[] => {
    const modelGroup = getModelGroup();
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
          new THREE.Vector3(positions.getX(index), positions.getY(index), positions.getZ(index))
        );
        normal.add(new THREE.Vector3(normals.getX(index), normals.getY(index), normals.getZ(index)));
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

    const material = new THREE.MeshStandardMaterial({ color: 0x5d2928, roughness: 0.93 });
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
      clearcoat: 1,
      clearcoatRoughness: 0.035,
      transparent: true,
      opacity: 0.94,
      depthWrite: true,
    });
    nippleSourceBead = new THREE.Mesh(new THREE.SphereGeometry(0.017, 24, 16), liquidMaterial);
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
        material.opacity = opacity * weight;
      });
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

  const build = (loadedModel: THREE.Object3D, symptom: SymptomType) => {
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
    const calibratedMesh = symptomMorphMeshes.find((mesh) => mesh.userData.symptomProfile?.nipple);
    if (calibratedMesh) {
      const bounds = new THREE.Box3().setFromBufferAttribute(calibratedMesh.geometry.getAttribute("position"));
      const center = bounds.getCenter(new THREE.Vector3());
      const half = bounds.getSize(new THREE.Vector3()).multiplyScalar(0.5);
      const [x, y] = calibratedMesh.userData.symptomProfile.nipple;
      const point = modelGroup.worldToLocal(calibratedMesh.localToWorld(
        new THREE.Vector3(center.x + half.x * x, center.y + half.y * y, center.z)
      ));
      addNippleDischarge(nippleLayer, loadedModel, point.x, point.y);
    } else {
      addNippleDischarge(nippleLayer, loadedModel, 0.34, 0.26);
    }
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
      const beadScale = 0.82 + (Math.sin(elapsedTime * 4.8) + 1) * 0.09;
      nippleSourceBead.scale.setScalar(beadScale);
    }
    animatedDroplets.forEach(({ mesh, origin, normal, phase, lateral }) => {
      const cycle = (elapsedTime * 0.48 + phase) % 1;
      const formationEnd = 0.2;
      mesh.visible = true;
      mesh.position.copy(origin);
      if (cycle < formationEnd) {
        const formation = smoothstep(0, formationEnd, cycle);
        mesh.position.addScaledVector(normal, formation * 0.012);
        mesh.scale.set(0.58 + formation * 0.42, 0.08 + formation * 0.92, 0.58 + formation * 0.42);
        return;
      }

      const fall = (cycle - formationEnd) / (1 - formationEnd);
      const gravity = fall * fall;
      const disappear = 1 - smoothstep(0.84, 1, fall);
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
  };

  const dispose = () => {
    symptomRoot?.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => material.dispose());
    });
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
  };

  const registerMesh = (mesh: THREE.Mesh, ensureSkinRelief = false) => {
    if (symptomMorphMeshes.includes(mesh)) return;
    if (ensureSkinRelief) ensureSkinReliefMorph(mesh);
    symptomMorphMeshes.push(mesh);
    createColorState(mesh);
  };

  return { applyTint, build, dispose, registerMesh, tick, update, isTransitioning: () => transitioning };
};
