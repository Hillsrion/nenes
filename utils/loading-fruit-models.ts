import * as THREE from "three";
import type { LoadingFruitDefinition } from "~/config/loading-fruits";

const sourceCache = new Map<string, Promise<THREE.Group>>();
let loaderPromise: Promise<
  import("three/examples/jsm/loaders/GLTFLoader.js").GLTFLoader
> | null = null;

const getLoader = () => {
  loaderPromise ??= import("three/examples/jsm/loaders/GLTFLoader.js").then(
    ({ GLTFLoader }) => new GLTFLoader()
  );
  return loaderPromise;
};

const loadSourceModel = (url: string) => {
  const cached = sourceCache.get(url);
  if (cached) return cached;

  const request = getLoader()
    .then((loader) => loader.loadAsync(url))
    .then(({ scene }) => scene);
  request.catch(() => sourceCache.delete(url));
  sourceCache.set(url, request);
  return request;
};

export const preloadFruitModels = async (urls: string[]) => {
  await Promise.allSettled(urls.map((url) => loadSourceModel(url)));
};

const createStylizedMaterial = (
  sourceMaterial: THREE.Material,
  definition: LoadingFruitDefinition
) => {
  const source = sourceMaterial as THREE.MeshStandardMaterial;
  const normalStrength = definition.normalStrength ?? 0.26;

  return new THREE.MeshPhysicalMaterial({
    color: definition.color,
    normalMap: source.normalMap,
    normalScale: new THREE.Vector2(normalStrength, normalStrength),
    roughnessMap: source.roughnessMap,
    roughness: definition.roughness ?? 0.52,
    aoMap: source.aoMap,
    aoMapIntensity: 0.65,
    metalness: 0,
    clearcoat: 0.08,
    clearcoatRoughness: 0.72,
    sheen: 0.08,
    sheenColor: new THREE.Color(definition.highlight),
    sheenRoughness: 0.8,
  });
};

export const createFruitModel = async (definition: LoadingFruitDefinition) => {
  const source = await loadSourceModel(definition.modelUrl);
  const sourceObject = definition.nodeName
    ? source.getObjectByName(definition.nodeName)
    : source;
  if (!sourceObject) {
    throw new Error(`Missing node ${definition.nodeName} in ${definition.modelUrl}`);
  }

  const model = new THREE.Group();
  model.add(sourceObject.clone(true));

  model.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = true;
    child.receiveShadow = true;
    if (!child.geometry.getAttribute("normal")) child.geometry.computeVertexNormals();
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => createStylizedMaterial(material, definition))
      : createStylizedMaterial(child.material, definition);
  });

  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const maxDimension = Math.max(size.x, size.y, size.z) || 1;
  const scale = 2.15 / maxDimension;

  model.scale.setScalar(scale);
  model.position.set(-center.x * scale, -center.y * scale, -center.z * scale);

  const group = new THREE.Group();
  group.add(model);
  return group;
};
