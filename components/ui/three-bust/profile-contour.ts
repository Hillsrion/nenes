import * as THREE from "three";

// Intersect the projected triangles with horizontal scanlines. This follows the
// visible right-hand silhouette, including the hollow below the breast.
export function projectProfileContour(root: THREE.Object3D, camera: THREE.Camera, width: number, height: number) {
  const step = Math.max(3, height / 240);
  const rows = new Float64Array(Math.ceil(height * 1.5 / step)).fill(-Infinity);
  const point = new THREE.Vector3();
  let top = Infinity;
  let bottom = -Infinity;
  root.updateWorldMatrix(true, true);
  camera.updateMatrixWorld();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || object.userData.preserveMaterial) return;
    const positions = object.geometry.getAttribute("position");
    if (!positions) return;
    const projected = new Float64Array(positions.count * 2);
    for (let i = 0; i < positions.count; i++) {
      object.getVertexPosition(i, point).applyMatrix4(object.matrixWorld).project(camera);
      const y = (1 - point.y) * height / 2;
      projected[i * 2] = (point.x + 1) * width / 2;
      projected[i * 2 + 1] = y;
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    const indices = object.geometry.index;
    const count = indices?.count ?? positions.count;
    for (let i = 0; i < count; i += 3) {
      for (let edge = 0; edge < 3; edge++) {
        const a = indices ? indices.getX(i + edge) : i + edge;
        const b = indices ? indices.getX(i + (edge + 1) % 3) : i + (edge + 1) % 3;
        const ax = projected[a * 2], ay = projected[a * 2 + 1];
        const bx = projected[b * 2], by = projected[b * 2 + 1];
        if (Math.abs(by - ay) < 0.001) continue;
        const first = Math.max(0, Math.ceil(Math.min(ay, by) / step));
        const last = Math.min(rows.length - 1, Math.floor(Math.max(ay, by) / step));
        for (let row = first; row <= last; row++) {
          const x = ax + (bx - ax) * (row * step - ay) / (by - ay);
          rows[row] = Math.max(rows[row], x);
        }
      }
    }
  });
  if (!Number.isFinite(top)) return null;
  const points: Array<{ x: number; y: number }> = [];
  const gap = Math.max(9, Math.min(16, height * 0.012));
  // Stop on the upper chest, below the neck/shoulder cut of the asset.
  const abdomenEnd = Math.min(height, bottom - (bottom - top) * 0.12);
  for (let row = Math.ceil((top + (bottom - top) * 0.29) / step); row * step <= abdomenEnd && row < rows.length; row++) {
    if (!Number.isFinite(rows[row])) continue;
    let sum = 0, count = 0;
    for (let neighbor = Math.max(0, row - 2); neighbor <= Math.min(rows.length - 1, row + 2); neighbor++) {
      if (Number.isFinite(rows[neighbor])) { sum += rows[neighbor]; count++; }
    }
    points.push({ x: sum / count + gap, y: row * step });
  }
  if (points.length < 2) return null;
  const last = points[points.length - 1];
  points.push({ x: last.x, y: Math.max(height, last.y) + height * 0.45 });
  // Quadratic midpoints smooth tiny mesh facets without flattening its outline.
  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i], next = points[i + 1];
    path += ` Q ${current.x} ${current.y} ${(current.x + next.x) / 2} ${(current.y + next.y) / 2}`;
  }
  path += ` L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
  return { path, width, height };
}
