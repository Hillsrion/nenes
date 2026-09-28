import * as THREE from 'three';

export interface PalpationSegment { start: number; end: number; kind: string; side: number }

const ease = (x: number) => THREE.MathUtils.smoothstep(x, 0, 1);

/** A local shoulder study for the Zou scan, not a general-purpose human rig. */
export function createPalpationArm(root: THREE.Object3D, segments: PalpationSegment[]) {
  const meshes: { mesh: THREE.Mesh; position: Float32Array; vertices: { index: number; side: number; weight: number }[]; indices: (THREE.BufferAttribute | null)[] }[] = [];
  if (segments.length) root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.SkinnedMesh || object.userData.preserveMaterial
      || object.morphTargetDictionary?.palpation_contact_1 === undefined) return;
    // Each viewer owns its deformation; never mutate a cached/shared geometry.
    object.geometry = object.geometry.clone();
    const attribute = object.geometry.getAttribute('position');
    const position = new Float32Array(attribute.array);
    const vertices = [];
    const armSide = new Int8Array(attribute.count);
    for (let i = 0; i < attribute.count; i++) {
      const x = position[i * 3]!, y = position[i * 3 + 1]!, z = position[i * 3 + 2]!;
      // The scan joins the hands to the hips. Separate that contact seam
      // instead of stretching the body into the moving arm.
      const lower = ease((-y - 0.34) / 0.16);
      const wrist = THREE.MathUtils.lerp(0.232, 0.255, ease((-y - 0.12) / 0.2));
      const boundary = THREE.MathUtils.lerp(wrist, 0.434 - 1.43 * z, lower);
      const isArm = Math.abs(x) > boundary && y < 0.29;
      armSide[i] = isArm ? Math.sign(x) : 0;
      const shoulder = ease((Math.abs(x) - 0.17) / 0.12)
        * (1 - ease((y - 0.29) / 0.14));
      const weight = y < 0.23 ? (isArm ? 1 : 0)
        : THREE.MathUtils.lerp(isArm ? 1 : 0, shoulder, ease((y - 0.23) / 0.06));
      if (weight > 0) vertices.push({ index: i, side: Math.sign(x), weight });
    }
    const originalIndex = object.geometry.getIndex();
    const indices: (THREE.BufferAttribute | null)[] = [originalIndex];
    if (originalIndex) {
      for (let mask = 1; mask <= 3; mask++) {
        const triangles = [];
        for (let i = 0; i < originalIndex.count; i += 3) {
          const a = originalIndex.getX(i), b = originalIndex.getX(i + 1), c = originalIndex.getX(i + 2);
          const belowShoulder = Math.max(position[a * 3 + 1]!, position[b * 3 + 1]!, position[c * 3 + 1]!) < 0.24;
          const moving = [a, b, c].some(index => armSide[index] === 1 ? (mask & 1) : armSide[index] === -1 ? (mask & 2) : false);
          if (belowShoulder && moving && (armSide[a] !== armSide[b] || armSide[b] !== armSide[c])) continue;
          triangles.push(a, b, c);
        }
        indices.push(new THREE.Uint32BufferAttribute(triangles, 1));
      }
    }
    meshes.push({ mesh: object, position, vertices, indices });
  });
  let left = 0, right = 0;
  let previousLeft = -1, previousRight = -1;
  function apply() {
    if (left === previousLeft && right === previousRight) return;
    previousLeft = left; previousRight = right;
    for (const { mesh, position, vertices, indices } of meshes) {
      mesh.geometry.setIndex(indices[(left > 0 ? 1 : 0) | (right > 0 ? 2 : 0)] ?? indices[0] ?? null);
      const attribute = mesh.geometry.getAttribute('position');
      for (const { index, side, weight } of vertices) {
        const angle = side * ease(side > 0 ? left : right) * weight * Math.PI * 0.72;
        const x = position[index * 3]!, y = position[index * 3 + 1]!;
        const dx = x - side * 0.275, dy = y - 0.355;
        attribute.setXYZ(index, side * 0.275 + dx * Math.cos(angle) - dy * Math.sin(angle),
          0.355 + dx * Math.sin(angle) + dy * Math.cos(angle), position[index * 3 + 2]!);
      }
      attribute.needsUpdate = true;
      mesh.geometry.computeVertexNormals();
      mesh.geometry.computeBoundingSphere();
      mesh.geometry.computeBoundingBox();
    }
  }
  function target(time: number, side: number) {
    return segments.some(s => s.kind === 'axilla' && s.side === side && time >= s.start && time < s.end) ? 1 : 0;
  }
  return {
    update(time: number, delta: number, active: boolean, snap = false) {
      const a = active ? target(time, 1) : 0, b = active ? target(time, -1) : 0;
      // A bounded linear phase gives a predictable 1.2-second transition,
      // independent of frame rate, and a stable raised pose across chapter loops.
      const move = (value: number, goal: number) => snap ? goal : THREE.MathUtils.clamp(goal, value - delta / 1.2, value + delta / 1.2);
      left = move(left, a); right = move(right, b);
      apply();
    },
    reset() { left = right = 0; apply(); },
  };
}
