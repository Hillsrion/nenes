import type * as THREE from "three";

/** Prepare shaders and upload hidden geometry before a scroll reveals it. */
export async function warmThreeScene(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  isDisposed: () => boolean,
) {
  await renderer.compileAsync(scene, camera);
  if (isDisposed()) return;

  const states: Array<{ object: THREE.Object3D; visible: boolean; frustumCulled: boolean }> = [];
  scene.traverse(object => {
    states.push({ object, visible: object.visible, frustumCulled: object.frustumCulled });
    object.visible = true;
    object.frustumCulled = false;
  });
  try {
    // Compilation alone does not upload vertex buffers, morphs and textures.
    // The canvas stays hidden until the caller has completed this first draw.
    renderer.render(scene, camera);
  } finally {
    states.forEach(({ object, visible, frustumCulled }) => {
      object.visible = visible;
      object.frustumCulled = frustumCulled;
    });
  }
  // Restore the intended image before the browser can paint the canvas.
  renderer.render(scene, camera);
}
