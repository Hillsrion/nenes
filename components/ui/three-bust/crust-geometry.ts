import * as THREE from "three";

interface Point2 {
  x: number;
  y: number;
}

// A patch of separate, thin scales. The local XY footprint fits inside a unit
// circle, with its dry surface facing +Z and its relief below 0.12 units.
export function createCrustPatchGeometry(seed: number): THREE.BufferGeometry {
  let state = (Number.isFinite(seed) ? seed : 0) >>> 0;
  const random = () => {
    state += 0x6d2b79f5;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  const smoothstep = (from: number, to: number, value: number) => {
    const t = THREE.MathUtils.clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const ochre = new THREE.Color(0xb28a52);
  const pale = new THREE.Color(0xd1b17b);
  const rust = new THREE.Color(0x80513d);
  const mixed = new THREE.Color();

  const addVertex = (x: number, y: number, z: number, tone: number, edge = false) => {
    positions.push(x, y, THREE.MathUtils.clamp(z, 0.002, 0.12));
    if (tone < 0.5) mixed.copy(rust).lerp(ochre, tone * 2);
    else mixed.copy(ochre).lerp(pale, (tone - 0.5) * 2);
    if (edge) mixed.multiplyScalar(0.79);
    colors.push(mixed.r, mixed.g, mixed.b);
    return positions.length / 3 - 1;
  };

  const clip = (polygon: Point2[], nx: number, ny: number, limit: number): Point2[] => {
    const output: Point2[] = [];
    for (let index = 0; index < polygon.length; index += 1) {
      const previous = polygon[(index + polygon.length - 1) % polygon.length];
      const current = polygon[index];
      const previousDistance = previous.x * nx + previous.y * ny - limit;
      const currentDistance = current.x * nx + current.y * ny - limit;
      if ((previousDistance <= 0) !== (currentDistance <= 0)) {
        const t = previousDistance / (previousDistance - currentDistance);
        output.push({
          x: previous.x + (current.x - previous.x) * t,
          y: previous.y + (current.y - previous.y) * t,
        });
      }
      if (currentDistance <= 0) output.push(current);
    }
    return output;
  };

  const boundary: Point2[] = [];
  const rotation = random() * Math.PI * 2;
  for (let index = 0; index < 36; index += 1) {
    const angle = (index / 36) * Math.PI * 2;
    const radius = 0.84 + random() * 0.1
      + Math.sin(angle * 3 + rotation) * 0.035;
    boundary.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  // Clipped cells produce angular fractures that meet naturally. Shrinking
  // each cell leaves real gaps, rather than painted dark lines over a solid lump.
  const sites: Point2[] = [];
  for (let index = 0; index < 11; index += 1) {
    const inner = index < 3;
    const angle = rotation + ((inner ? index : index - 3) / (inner ? 3 : 8)) * Math.PI * 2
      + (random() - 0.5) * 0.28;
    const radius = inner ? 0.19 + random() * 0.12 : 0.58 + random() * 0.14;
    sites.push({ x: Math.cos(angle) * radius, y: Math.sin(angle) * radius });
  }

  const addScale = (polygon: Point2[], plateIndex: number, detached = false, overlapping = false) => {
    if (polygon.length < 3) return;
    const center = polygon.reduce((sum, point) => ({ x: sum.x + point.x, y: sum.y + point.y }), { x: 0, y: 0 });
    center.x /= polygon.length;
    center.y /= polygon.length;
    const shrink = detached ? 1 : 0.88 + random() * 0.055;
    const turn = (random() - 0.5) * 0.035;
    const cos = Math.cos(turn);
    const sin = Math.sin(turn);
    const outline: Point2[] = [];
    polygon.forEach((point, index) => {
      const next = polygon[(index + 1) % polygon.length];
      const segments = Math.max(2, Math.ceil(Math.hypot(next.x - point.x, next.y - point.y) / 0.055));
      for (let segment = 0; segment < segments; segment += 1) {
        const fraction = segment / segments;
        const dx = (point.x + (next.x - point.x) * fraction - center.x) * shrink;
        const dy = (point.y + (next.y - point.y) * fraction - center.y) * shrink;
        outline.push({ x: center.x + dx * cos - dy * sin, y: center.y + dx * sin + dy * cos });
      }
    });

    const base = (overlapping ? 0.04 : 0.007) + random() * 0.012 + (plateIndex % 3) * 0.006;
    const body = overlapping ? 0.006 + random() * 0.009 : 0.012 + random() * 0.015;
    const lift = overlapping ? 0.009 + random() * 0.019 : (detached ? 0.025 : 0.019) + random() * 0.039;
    const phase = random() * Math.PI * 2;
    const tone = 0.35 + random() * 0.4;
    const topHeight = (point: Point2, ring: number) => {
      const dx = point.x - center.x;
      const dy = point.y - center.y;
      const angle = Math.atan2(dy, dx);
      const raisedEdge = smoothstep(0.67, 1, ring) * lift
        * Math.pow(0.5 + 0.5 * Math.cos(angle - phase), 2);
      const fineRelief = Math.sin(point.x * 63 + phase) * Math.sin(point.y * 51 - phase) * 0.003;
      const ridge = Math.pow(Math.max(0, Math.sin(dx * 28 + dy * 19 + phase)), 7) * 0.005;
      return base + body + (1 - ring * ring) * 0.007 + raisedEdge + fineRelief + ridge;
    };
    const topTone = (point: Point2, ring: number) => THREE.MathUtils.clamp(
      tone + Math.sin(point.x * 19 + point.y * 13 + phase) * 0.12
      + Math.sin(point.x * 53 - point.y * 41) * 0.06 + ring * 0.13,
      0.08,
      0.95
    );

    const centerIndex = addVertex(center.x, center.y, topHeight(center, 0), topTone(center, 0));
    let previousRing: number[] = [];
    for (const radius of [0.18, 0.38, 0.59, 0.77, 0.91, 1]) {
      const currentRing = outline.map((edge) => {
        const point = { x: center.x + (edge.x - center.x) * radius, y: center.y + (edge.y - center.y) * radius };
        return addVertex(point.x, point.y, topHeight(point, radius), topTone(point, radius));
      });
      currentRing.forEach((vertex, index) => {
        const next = (index + 1) % currentRing.length;
        if (!previousRing.length) indices.push(centerIndex, vertex, currentRing[next]);
        else indices.push(previousRing[index], vertex, currentRing[next], previousRing[index], currentRing[next], previousRing[next]);
      });
      previousRing = currentRing;
    }

    // The broken rim remains thin even where a scale curls away from the skin.
    // Separate rim vertices keep its edge crisp without faceting the dry face.
    outline.forEach((edge, index) => {
      const next = outline[(index + 1) % outline.length];
      const topA = addVertex(edge.x, edge.y, topHeight(edge, 1), topTone(edge, 1), true);
      const topB = addVertex(next.x, next.y, topHeight(next, 1), topTone(next, 1), true);
      const bottomA = addVertex(edge.x, edge.y, topHeight(edge, 1) - body * 0.55, tone * 0.7, true);
      const bottomB = addVertex(next.x, next.y, topHeight(next, 1) - body * 0.55, tone * 0.7, true);
      indices.push(topA, bottomA, topB, topB, bottomA, bottomB);
    });
  };

  sites.forEach((site, index) => {
    let polygon = boundary.slice();
    sites.forEach((other, otherIndex) => {
      if (index === otherIndex || polygon.length < 3) return;
      polygon = clip(
        polygon,
        other.x - site.x,
        other.y - site.y,
        (other.x * other.x + other.y * other.y - site.x * site.x - site.y * site.y) / 2
      );
    });
    addScale(polygon, index);
  });

  // A pair of small separated squames breaks up the otherwise continuous edge.
  for (let index = 0; index < 2; index += 1) {
    const angle = rotation + 1.1 + index * 2.7;
    const center = { x: Math.cos(angle) * 0.93, y: Math.sin(angle) * 0.93 };
    const polygon: Point2[] = [];
    for (let vertex = 0; vertex < 6; vertex += 1) {
      const theta = (vertex / 6) * Math.PI * 2;
      const radius = 0.033 + random() * 0.025;
      polygon.push({ x: center.x + Math.cos(theta) * radius, y: center.y + Math.sin(theta) * radius });
    }
    addScale(polygon, 11 + index, true);
  }

  // Two lighter chips partly cover larger plates, like small layers peeling
  // from a dried crust. Their narrow footprint leaves most fractures open.
  for (let index = 0; index < 2; index += 1) {
    const center = sites[index * 2];
    const angle = rotation + index * 1.8;
    const polygon: Point2[] = [];
    for (let vertex = 0; vertex < 7; vertex += 1) {
      const theta = (vertex / 7) * Math.PI * 2;
      const dx = Math.cos(theta) * (0.1 + random() * 0.035);
      const dy = Math.sin(theta) * (0.045 + random() * 0.02);
      polygon.push({
        x: center.x + dx * Math.cos(angle) - dy * Math.sin(angle),
        y: center.y + dx * Math.sin(angle) + dy * Math.cos(angle),
      });
    }
    addScale(polygon, 13 + index, false, true);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}
