import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { MeshoptEncoder } from 'meshoptimizer/encoder';
import { MeshoptDecoder } from 'meshoptimizer/decoder';

const extension = 'EXT_meshopt_compression';
const componentBytes = { 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 };
const components = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4, MAT4: 16 };

export async function compressBustGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67 || bytes.readUInt32LE(4) !== 2) throw new Error('Expected a GLB 2.0 file.');
  const jsonLength = bytes.readUInt32LE(12);
  const gltf = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
  if (gltf.buffers?.length !== 1 || gltf.buffers[0].uri || gltf.images?.length || gltf.extensionsUsed?.includes(extension)) {
    throw new Error('Expected a single-buffer, untextured, uncompressed bust. The source is preserved.');
  }
  const binary = bytes.subarray(28 + jsonLength);
  const layouts = new Map();
  for (const accessor of gltf.accessors) {
    const size = componentBytes[accessor.componentType] * components[accessor.type];
    if (accessor.bufferView !== undefined) layouts.set(accessor.bufferView, { stride: size, mode: accessor.type === 'SCALAR' && accessor.componentType !== 5126 ? 'INDICES' : 'ATTRIBUTES' });
    if (accessor.sparse) {
      layouts.set(accessor.sparse.indices.bufferView, { stride: componentBytes[accessor.sparse.indices.componentType], mode: 'INDICES' });
      layouts.set(accessor.sparse.values.bufferView, { stride: size, mode: 'ATTRIBUTES' });
    }
  }
  await Promise.all([MeshoptEncoder.ready, MeshoptDecoder.ready]);
  const chunks = [];
  let offset = 0;
  for (const [index, view] of gltf.bufferViews.entries()) {
    if (view.buffer !== 0) throw new Error('External buffers are unsupported.');
    const source = binary.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    let { stride = 4, mode = 'ATTRIBUTES' } = layouts.get(index) ?? {};
    if (view.byteStride) { stride = view.byteStride; mode = 'ATTRIBUTES'; }
    if (mode === 'INDICES' && stride !== 2 && stride !== 4) { mode = 'ATTRIBUTES'; stride = 4; }
    if (!stride || source.length !== view.byteLength || source.length % stride || (mode === 'ATTRIBUTES' && (stride % 4 || stride > 256))) {
      throw new Error(`Unsupported buffer layout ${index}. The source is preserved.`);
    }
    const count = source.length / stride;
    // No quantization, remapping or filters: preserve every float and index,
    // including sparse symptom deltas and authored hand animation keyframes.
    const encoded = MeshoptEncoder.encodeGltfBuffer(source, count, stride, mode);
    const decoded = new Uint8Array(source.length);
    MeshoptDecoder.decodeGltfBuffer(decoded, count, stride, encoded, mode);
    if (!Buffer.from(decoded).equals(source)) throw new Error(`Lossless validation failed for buffer ${index}.`);
    view.extensions = { ...view.extensions, [extension]: { buffer: 0, byteOffset: offset, byteLength: encoded.length, byteStride: stride, count, mode } };
    view.buffer = 1;
    chunks.push(Buffer.from(encoded));
    const padding = (4 - encoded.length % 4) % 4;
    chunks.push(Buffer.alloc(padding));
    offset += encoded.length + padding;
  }
  const fallbackSize = gltf.buffers[0].byteLength;
  gltf.buffers = [{ byteLength: offset }, { byteLength: fallbackSize, extensions: { [extension]: { fallback: true } } }];
  gltf.extensionsUsed = [...new Set([...(gltf.extensionsUsed ?? []), extension])];
  gltf.extensionsRequired = [...new Set([...(gltf.extensionsRequired ?? []), extension])];
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + offset, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(offset, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binaryHeader, ...chunks]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const args = process.argv.slice(2).filter(argument => argument !== '--');
  const [input, output = input && path.join('public/models/optimized', path.basename(input))] = args;
  if (!input) throw new Error('Usage: pnpm model:optimize -- source.glb [output.glb]');
  const source = await readFile(input);
  const optimized = await compressBustGlb(source);
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, optimized, { flag: 'wx' });
  console.log(JSON.stringify({ output, sourceBytes: source.length, optimizedBytes: optimized.length, reductionPercent: Math.round((1 - optimized.length / source.length) * 100) }));
}
