import assert from "node:assert/strict";
import test from "node:test";
import * as THREE from "three";
import { warmThreeScene } from "../utils/warm-three-scene";

function fixture() {
  const scene = new THREE.Scene();
  const group = new THREE.Group();
  group.visible = false;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial());
  mesh.visible = false;
  group.add(mesh);
  scene.add(group);
  return { scene, group, mesh, camera: new THREE.PerspectiveCamera() };
}

test("warmup waits for shaders, uploads hidden meshes, then restores the actual frame", async () => {
  const { scene, group, mesh, camera } = fixture();
  let finishCompile!: () => void;
  const compilation = new Promise<void>(resolve => { finishCompile = resolve; });
  const frames: boolean[][] = [];
  const renderer = {
    compileAsync: () => compilation,
    render: () => frames.push([group.visible, mesh.visible, mesh.frustumCulled]),
  } as unknown as THREE.WebGLRenderer;
  const warmup = warmThreeScene(renderer, scene, camera, () => false);
  assert.equal(frames.length, 0);
  assert.equal(group.visible, false);
  finishCompile();
  await warmup;
  assert.deepEqual(frames, [[true, true, false], [false, false, true]]);
});

test("unmounting during shader compilation prevents a draw on a disposed renderer", async () => {
  const { scene, camera } = fixture();
  let disposed = false;
  const renderer = {
    compileAsync: async () => { disposed = true; },
    render: () => assert.fail("must not render after disposal"),
  } as unknown as THREE.WebGLRenderer;
  await warmThreeScene(renderer, scene, camera, () => disposed);
});

test("a failed upload restores hidden objects and culling", async () => {
  const { scene, group, mesh, camera } = fixture();
  const renderer = {
    compileAsync: async () => {},
    render: () => { throw new Error("context lost"); },
  } as unknown as THREE.WebGLRenderer;
  await assert.rejects(warmThreeScene(renderer, scene, camera, () => false), /context lost/);
  assert.equal(group.visible, false);
  assert.equal(mesh.visible, false);
  assert.equal(mesh.frustumCulled, true);
});
