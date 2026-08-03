import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

class NodeFileReader {
  result = null;
  onloadend = null;
  onerror = null;

  readAsArrayBuffer(blob) {
    blob
      .arrayBuffer()
      .then((value) => {
        this.result = value;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }

  readAsDataURL(blob) {
    blob
      .arrayBuffer()
      .then((value) => {
        const base64 = Buffer.from(value).toString("base64");
        this.result = `data:${blob.type};base64,${base64}`;
        this.onloadend?.({ target: this });
      })
      .catch((error) => this.onerror?.(error));
  }
}

globalThis.FileReader ??= NodeFileReader;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const inputPath = path.resolve(
  projectDirectory,
  process.argv[2] ?? "public/models/bust-photo-test.glb"
);
const outputPath = path.resolve(
  projectDirectory,
  process.argv[3] ?? "public/models/bust-photo-symptoms.glb"
);

const smoothstep = (edge0, edge1, value) => {
  const normalized = THREE.MathUtils.clamp((value - edge0) / (edge1 - edge0), 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
};

const gaussian2D = (x, y, centerX, centerY, radiusX, radiusY) => {
  const dx = (x - centerX) / radiusX;
  const dy = (y - centerY) / radiusY;
  return Math.exp(-(dx * dx + dy * dy) * 2.4);
};

const loadGLB = async (filePath) => {
  const file = await readFile(filePath);
  const arrayBuffer = file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.parse(arrayBuffer, path.dirname(filePath), resolve, reject);
  });
};

const findPrimaryMesh = (root) => {
  let primaryMesh = null;
  root.traverse((child) => {
    if (child instanceof THREE.Mesh && !primaryMesh) primaryMesh = child;
  });
  return primaryMesh;
};

const addMorphTargets = (mesh) => {
  const geometry = mesh.geometry;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();

  const positions = geometry.getAttribute("position");
  const normals = geometry.getAttribute("normal");
  const bounds = geometry.boundingBox;
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  const half = size.clone().multiplyScalar(0.5);

  const asymmetry = new Float32Array(positions.count * 3);
  const dimpling = new Float32Array(positions.count * 3);

  const rightCenter = new THREE.Vector3(
    center.x + half.x * 0.35,
    center.y + half.y * 0.14,
    center.z + half.z * 0.58
  );
  const leftCenter = new THREE.Vector3(
    center.x - half.x * 0.35,
    center.y + half.y * 0.14,
    center.z + half.z * 0.58
  );
  const dimpleCenters = [
    [center.x - half.x * 0.43, center.y + half.y * 0.22],
    [center.x - half.x * 0.3, center.y + half.y * 0.08],
    [center.x - half.x * 0.42, center.y - half.y * 0.04],
  ];

  const vertex = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let index = 0; index < positions.count; index += 1) {
    vertex.fromBufferAttribute(positions, index);
    normal.fromBufferAttribute(normals, index).normalize();

    const frontWeight = smoothstep(center.z, center.z + half.z * 0.9, vertex.z);
    const rightWeight =
      gaussian2D(
        vertex.x,
        vertex.y,
        rightCenter.x,
        rightCenter.y,
        half.x * 0.38,
        half.y * 0.28
      ) * frontWeight;
    const leftWeight =
      gaussian2D(
        vertex.x,
        vertex.y,
        leftCenter.x,
        leftCenter.y,
        half.x * 0.38,
        half.y * 0.28
      ) * frontWeight;

    const asymmetryOffset = rightWeight * 0.09 - leftWeight * 0.035;
    asymmetry[index * 3] = normal.x * asymmetryOffset;
    asymmetry[index * 3 + 1] = normal.y * asymmetryOffset;
    asymmetry[index * 3 + 2] = normal.z * asymmetryOffset;

    let dimpleWeight = 0;
    for (const [dimpleX, dimpleY] of dimpleCenters) {
      dimpleWeight = Math.max(
        dimpleWeight,
        gaussian2D(
          vertex.x,
          vertex.y,
          dimpleX,
          dimpleY,
          half.x * 0.075,
          half.y * 0.06
        )
      );
    }
    dimpleWeight *= frontWeight;
    const dimpleOffset = -dimpleWeight * 0.075;
    dimpling[index * 3] = normal.x * dimpleOffset;
    dimpling[index * 3 + 1] = normal.y * dimpleOffset;
    dimpling[index * 3 + 2] = normal.z * dimpleOffset;
  }

  const asymmetryAttribute = new THREE.Float32BufferAttribute(asymmetry, 3);
  asymmetryAttribute.name = "asymmetry";
  const dimplingAttribute = new THREE.Float32BufferAttribute(dimpling, 3);
  dimplingAttribute.name = "dimpling";

  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = [asymmetryAttribute, dimplingAttribute];
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { asymmetry: 0, dimpling: 1 };
  mesh.morphTargetInfluences = [0, 0];
  mesh.userData.symptomMorphTargets = ["asymmetry", "dimpling"];

  return { bounds, center, half };
};

const addEmbeddedRedness = (scene, mesh, center, half) => {
  scene.updateMatrixWorld(true);

  const targetX = center.x + half.x * 0.35;
  const targetY = center.y + half.y * 0.13;
  const raycaster = new THREE.Raycaster(
    new THREE.Vector3(targetX, targetY, center.z + half.z + 1),
    new THREE.Vector3(0, 0, -1)
  );
  const hit = raycaster.intersectObject(mesh, false)[0];
  if (!hit?.face) throw new Error("Unable to anchor the redness patch on the mesh");

  const anchor = mesh.worldToLocal(hit.point.clone());
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(mesh.matrixWorld);
  const worldNormal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
  const localNormal = worldNormal
    .transformDirection(new THREE.Matrix4().copy(mesh.matrixWorld).invert())
    .normalize();

  const patch = new THREE.Group();
  patch.name = "SYMPTOM_skin";
  patch.userData.symptom = "skin";
  patch.position.copy(anchor).addScaledVector(localNormal, 0.012);
  patch.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), localNormal);

  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(0.18, 64),
    new THREE.MeshBasicMaterial({
      color: 0xd94c64,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  disc.name = "SYMPTOM_skin_redness";
  disc.userData.preserveMaterial = true;
  patch.add(disc);

  const poreMaterial = new THREE.MeshBasicMaterial({
    color: 0x8f253c,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const poreOffsets = [
    [-0.08, 0.04],
    [-0.035, 0.1],
    [0.035, 0.085],
    [0.09, 0.03],
    [-0.095, -0.04],
    [-0.025, -0.015],
    [0.06, -0.035],
    [0.005, -0.095],
  ];

  poreOffsets.forEach(([x, y], index) => {
    const pore = new THREE.Mesh(new THREE.CircleGeometry(0.011, 20), poreMaterial);
    pore.name = `SYMPTOM_skin_pore_${index + 1}`;
    pore.userData.preserveMaterial = true;
    pore.position.set(x, y, 0.003);
    patch.add(pore);
  });

  mesh.add(patch);
};

const exportGLB = async (scene) => {
  const exporter = new GLTFExporter();
  return new Promise((resolve, reject) => {
    exporter.parse(scene, resolve, reject, {
      binary: true,
      onlyVisible: false,
      truncateDrawRange: false,
    });
  });
};

const gltf = await loadGLB(inputPath);
const primaryMesh = findPrimaryMesh(gltf.scene);
if (!primaryMesh) throw new Error(`No mesh found in ${inputPath}`);

const { center, half } = addMorphTargets(primaryMesh);
addEmbeddedRedness(gltf.scene, primaryMesh, center, half);

const output = await exportGLB(gltf.scene);
if (!(output instanceof ArrayBuffer)) throw new Error("GLB exporter returned a non-binary result");
await writeFile(outputPath, Buffer.from(output));

console.log(`Generated ${path.relative(projectDirectory, outputPath)}`);
console.log("Embedded symptoms: asymmetry morph, dimpling morph, redness layer");
