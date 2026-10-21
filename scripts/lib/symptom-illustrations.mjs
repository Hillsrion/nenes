// Shared calibration renderer for the photo exports and their static fallback.
const color = '#ffd1e2';
const brushWidthScale = 0.85;
const format = (n) => Number(n.toFixed(1));
const coordinate = ([x, y]) => `${format(x)} ${format(y)}`;

function sampleCurve(path) {
  const tokens = path.match(/[MCQZ]|-?\d+(?:\.\d+)?/g);
  const points = [];
  let cursor = [0, 0];
  for (let i = 0; i < tokens.length;) {
    const command = tokens[i++];
    if (command === 'Z') break;
    const count = command === 'M' ? 2 : command === 'C' ? 6 : 4;
    const values = tokens.slice(i, i + count).map(Number);
    i += count;
    if (command === 'M') {
      cursor = values;
      points.push(cursor);
      continue;
    }
    const start = cursor;
    for (let step = 1; step <= 60; step++) {
      const t = step / 60;
      const s = 1 - t;
      points.push([0, 1].map((axis) => command === 'C'
        ? s ** 3 * start[axis] + 3 * s ** 2 * t * values[axis]
          + 3 * s * t ** 2 * values[axis + 2] + t ** 3 * values[axis + 4]
        : s ** 2 * start[axis] + 2 * s * t * values[axis] + t ** 2 * values[axis + 2]));
    }
    cursor = values.slice(-2);
  }
  return points;
}

function brush(path, width, phase = 0, closed = false) {
  const points = sampleCurve(path);
  const distances = [0];
  for (let i = 1; i < points.length; i++) {
    distances.push(distances[i - 1] + Math.hypot(
      points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1],
    ));
  }
  const edges = [[], []];
  points.forEach(([x, y], i) => {
    const t = distances[i] / distances.at(-1);
    const previous = points[closed && i === 0 ? points.length - 2 : Math.max(0, i - 1)];
    const next = points[closed && i === points.length - 1 ? 1 : Math.min(points.length - 1, i + 1)];
    const dx = next[0] - previous[0];
    const dy = next[1] - previous[1];
    const length = Math.hypot(dx, dy) || 1;
    const pressure = closed
      ? 0.85 + 0.2 * Math.sin(t * Math.PI * 4 + phase)
      : 0.65 + 0.35 * Math.sin(t * Math.PI)
        + 0.22 * Math.sin(t * Math.PI * 5 + phase)
        + 0.1 * Math.sin(t * Math.PI * 9 + phase * 0.7);
    const taper = closed ? 1 : 0.18 + 0.82 * Math.min(1, t / 0.09, (1 - t) / 0.09);
    const radius = width * brushWidthScale / 2 * pressure * taper;
    edges[0].push([x - dy / length * radius, y + dx / length * radius]);
    edges[1].push([x + dy / length * radius, y - dx / length * radius]);
  });
  const outline = [...edges[0], ...edges[1].reverse()];
  return `<path d="M${outline.map(coordinate).join('L')}Z"/>`;
}

function dot(cx, cy, rx, ry, rotation = 0, phase = 0) {
  const angle = rotation * Math.PI / 180;
  const points = Array.from({ length: 72 }, (_, i) => {
    const t = i / 72 * Math.PI * 2;
    const edge = 1 + 0.035 * Math.sin(3 * t + phase) + 0.018 * Math.cos(5 * t - phase);
    const x = rx * Math.cos(t) * edge;
    const y = ry * Math.sin(t) * edge;
    return [cx + x * Math.cos(angle) - y * Math.sin(angle), cy + x * Math.sin(angle) + y * Math.cos(angle)];
  });
  return `<path d="M${points.map(coordinate).join('L')}Z"/>`;
}


export function renderSymptomIllustration(definition) {
  const wrap = paths => `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="960" viewBox="0 0 720 960" fill="${color}">\n  ${paths.join('\n  ')}\n</svg>\n`;
  return {
    contours: wrap([
      ...definition.contours.map(({ path, width, phase, closed }) => brush(path, width, phase, closed)),
      ...(definition.marks ?? []).map(point => dot(...point)),
    ]),
    points: wrap(definition.points.map(point => dot(...point))),
  };
}
