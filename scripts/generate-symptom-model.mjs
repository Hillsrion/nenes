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
const cliArguments = process.argv.slice(2);
if (cliArguments[0] === "--") cliArguments.shift();
const inputPath = path.resolve(
  projectDirectory,
  cliArguments[0] ?? "public/models/bust-photo-test.glb"
);
const outputPath = path.resolve(
  projectDirectory,
  cliArguments[1] ?? "public/models/bust-photo-symptoms.glb"
);
const profilePath = cliArguments[3];
const profile = profilePath ? JSON.parse(await readFile(path.resolve(projectDirectory, profilePath), "utf8")) : null;

const modelLabel = cliArguments[2] ?? path.basename(outputPath, path.extname(outputPath));

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
  let primaryVertexCount = 0;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const vertexCount = child.geometry.getAttribute("position")?.count ?? 0;
    if (vertexCount > primaryVertexCount) {
      primaryMesh = child;
      primaryVertexCount = vertexCount;
    }
  });
  return primaryMesh;
};

const createMorphNormalAttribute = (geometry, positionDelta, name) => {
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
  attribute.name = name;
  return attribute;
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
  const skin = new Float32Array(positions.count * 3);
  const dimpling = new Float32Array(positions.count * 3);

  const rightCenter = new THREE.Vector3(
    center.x + half.x * (profile?.breast?.[0] ?? 0.35),
    center.y + half.y * (profile?.breast?.[1] ?? 0.14),
    center.z + half.z * 0.58
  );
  const leftCenter = new THREE.Vector3(
    center.x - half.x * (profile?.breast?.[0] ?? 0.35),
    center.y + half.y * (profile?.breast?.[1] ?? 0.14),
    center.z + half.z * 0.58
  );
  const dimpleCenters = profile ? profile.dimples.map(([x, y]) => [center.x + half.x * x, center.y + half.y * y]) : [
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

    // One breast gains volume while the other changes only slightly. The visual
    // comparison remains readable without adding an annotation around the body.
    const asymmetryOffset =
      rightWeight * half.z * 0.27 - leftWeight * half.z * 0.035;
    // A smooth spatial field avoids amplifying noisy reconstruction normals
    // into folds when changing a whole breast's volume.
    asymmetry[index * 3] = (vertex.x - rightCenter.x) * rightWeight * 0.16
      - (vertex.x - leftCenter.x) * leftWeight * 0.02;
    asymmetry[index * 3 + 1] = (vertex.y - rightCenter.y) * rightWeight * 0.12
      - (vertex.y - leftCenter.y) * leftWeight * 0.015;
    asymmetry[index * 3 + 2] = asymmetryOffset;

    const skinWeight =
      gaussian2D(
        vertex.x,
        vertex.y,
        center.x + half.x * (profile?.skin?.[0] ?? 0.35),
        center.y + half.y * (profile?.skin?.[1] ?? 0.17),
        half.x * 0.31,
        half.y * 0.23
      ) * frontWeight;
    const skinX = (vertex.x - (center.x + half.x * (profile?.skin?.[0] ?? 0.35))) / (half.x * 0.31);
    const skinY = (vertex.y - (center.y + half.y * (profile?.skin?.[1] ?? 0.17))) / (half.y * 0.23);
    // Jittered cells avoid the previous rows of identical pinholes.
    let pore = 0;
    const cellX = Math.floor(skinX * 6);
    const cellY = Math.floor(skinY * 6);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cx = cellX + dx;
        const cy = cellY + dy;
        const hash = (seed) => {
          const value = Math.sin(cx * 127.1 + cy * 311.7 + seed) * 43758.5453;
          return value - Math.floor(value);
        };
        const px = skinX * 6 - cx - 0.15 - hash(0) * 0.7;
        const py = skinY * 6 - cy - 0.15 - hash(19) * 0.7;
        pore = Math.max(pore, Math.exp(-(px * px + py * py) / (0.035 + hash(43) * 0.025)));
      }
    }
    const fineRelief =
      Math.sin(skinX * 31.3 + skinY * 7.1) *
      Math.sin(skinY * 28.7 - skinX * 5.3);
    const skinOffset =
      skinWeight * half.z * (0.007 + fineRelief * 0.002 - pore * 0.018);
    skin[index * 3] = normal.x * skinOffset;
    skin[index * 3 + 1] = normal.y * skinOffset;
    skin[index * 3 + 2] = normal.z * skinOffset;

    let dimpleOffset = 0;
    for (const [dimpleX, dimpleY] of dimpleCenters) {
      const inner = gaussian2D(
        vertex.x,
        vertex.y,
        dimpleX,
        dimpleY,
        half.x * 0.058,
        half.y * 0.046
      );
      const outer = gaussian2D(
        vertex.x,
        vertex.y,
        dimpleX,
        dimpleY,
        half.x * 0.105,
        half.y * 0.082
      );
      const raisedRim = Math.max(0, outer - inner);
      dimpleOffset +=
        (-inner * half.z * 0.075 + raisedRim * half.z * 0.012) * frontWeight;
    }
    dimpling[index * 3] = normal.x * dimpleOffset;
    dimpling[index * 3 + 1] = normal.y * dimpleOffset;
    dimpling[index * 3 + 2] = normal.z * dimpleOffset;
  }

  const asymmetryAttribute = new THREE.Float32BufferAttribute(asymmetry, 3);
  asymmetryAttribute.name = "asymmetry";
  const skinAttribute = new THREE.Float32BufferAttribute(skin, 3);
  skinAttribute.name = "skin";
  const dimplingAttribute = new THREE.Float32BufferAttribute(dimpling, 3);
  dimplingAttribute.name = "dimpling";

  geometry.morphTargetsRelative = true;
  geometry.morphAttributes.position = [
    asymmetryAttribute,
    skinAttribute,
    dimplingAttribute,
  ];
  geometry.morphAttributes.normal = [
    createMorphNormalAttribute(geometry, asymmetry, "asymmetry"),
    createMorphNormalAttribute(geometry, skin, "skin"),
    createMorphNormalAttribute(geometry, dimpling, "dimpling"),
  ];
  mesh.updateMorphTargets();
  mesh.morphTargetDictionary = { asymmetry: 0, skin: 1, dimpling: 2 };
  mesh.morphTargetInfluences = [0, 0, 0];
  mesh.userData.symptomMorphTargets = ["asymmetry", "skin", "dimpling"];

  if (profile) mesh.userData.symptomProfile = profile;
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return { bounds, center, half };
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

gltf.scene.name = modelLabel;
gltf.scene.userData.modelLabel = modelLabel;

primaryMesh.getObjectByName("SYMPTOM_skin")?.removeFromParent();
addMorphTargets(primaryMesh);

const output = await exportGLB(gltf.scene);
if (!(output instanceof ArrayBuffer)) throw new Error("GLB exporter returned a non-binary result");
await writeFile(outputPath, Buffer.from(output));

console.log(`Generated ${path.relative(projectDirectory, outputPath)}`);
console.log(`Model label: ${modelLabel}`);
console.log("Embedded symptoms: asymmetry, skin relief and dimpling morphs");
