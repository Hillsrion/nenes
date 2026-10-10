import assert from 'node:assert/strict';
import test from 'node:test';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { compressBustGlb } from '../scripts/optimize-bust-model.mjs';

function fixture(textured = false) {
  const arrays = [new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), new Uint32Array([0, 1, 2]), new Uint16Array([1, 2]), new Float32Array([0, 0, 0.2, 0, 0, 0.3]), new Float32Array([0, 1]), new Float32Array([0, 1])];
  let offset = 0;
  const views = arrays.map(array => {
    const view = { buffer: 0, byteOffset: offset, byteLength: array.byteLength };
    offset += array.byteLength;
    return view;
  });
  const gltf = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }], nodes: [{ name: 'Bust', mesh: 0 }],
    extras: { modelLabel: 'Poitrine · Orange', palpationStudy: { steps: [{ id: 'breast', clipName: 'Palpation' }] } },
    buffers: [{ byteLength: offset }], bufferViews: views,
    accessors: [
      { bufferView: 0, componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [1, 1, 0] },
      { bufferView: 1, componentType: 5125, count: 3, type: 'SCALAR' },
      { componentType: 5126, count: 3, type: 'VEC3', min: [0, 0, 0], max: [0, 0, 0.3], sparse: { count: 2, indices: { bufferView: 2, componentType: 5123 }, values: { bufferView: 3 } } },
      { bufferView: 4, componentType: 5126, count: 2, type: 'SCALAR', min: [0], max: [1] },
      { bufferView: 5, componentType: 5126, count: 2, type: 'SCALAR' },
    ],
    meshes: [{ weights: [0], extras: { targetNames: ['dimpling'] }, primitives: [{ attributes: { POSITION: 0 }, indices: 1, targets: [{ POSITION: 2 }] }] }],
    animations: [{ name: 'Palpation', samplers: [{ input: 3, output: 4 }], channels: [{ sampler: 0, target: { node: 0, path: 'weights' } }] }],
    ...(textured ? { images: [{ bufferView: 0, mimeType: 'image/png' }] } : {}),
  };
  let json = Buffer.from(JSON.stringify(gltf));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20), binaryHeader = Buffer.alloc(8);
  header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + offset, 8); header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  binaryHeader.writeUInt32LE(offset, 0); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binaryHeader, ...arrays.map(array => Buffer.from(array.buffer))]);
}

test('compressed geometry, sparse symptoms, labels and animation tracks match the source exactly', async () => {
  const source = fixture();
  const optimized = await compressBustGlb(source);
  const parse = (bytes: Buffer) => new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), '');
  const [before, after] = await Promise.all([parse(source), parse(optimized)]);
  const geometryBefore = (before.scene.children[0] as any).geometry;
  const geometryAfter = (after.scene.children[0] as any).geometry;
  assert.deepEqual(geometryAfter.attributes.position.array, geometryBefore.attributes.position.array);
  assert.deepEqual(geometryAfter.index.array, geometryBefore.index.array);
  assert.deepEqual(geometryAfter.morphAttributes.position[0].array, geometryBefore.morphAttributes.position[0].array);
  assert.deepEqual(after.animations[0]!.tracks[0]!.times, before.animations[0]!.tracks[0]!.times);
  assert.deepEqual(after.animations[0]!.tracks[0]!.values, before.animations[0]!.tracks[0]!.values);
  assert.deepEqual(after.parser.json.extras, before.parser.json.extras);
});

test('the compressor refuses textured input instead of discarding images', async () => {
  await assert.rejects(compressBustGlb(fixture(true)), /untextured/);
});
