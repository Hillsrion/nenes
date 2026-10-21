import { writeFile } from 'node:fs/promises';

// Bake brush pressure into filled SVG outlines: the line stays organic at every
// card size, without a uniform SVG stroke or any browser-side drawing code.
const color = '#ffd1e2';
const output = new URL('../public/images/symptoms/updated/', import.meta.url);
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
    const radius = width / 2 * pressure * taper;
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

const illustrations = [
  [
    brush('M137 410C125 474 76 513 4 526', 18, 0.6),
    brush('M229 402C245 489 323 542 406 530C497 520 542 455 550 359', 20, 1.5),
    dot(34, 424, 32, 37, -16, 0.4),
    dot(479, 386, 34, 40, 18, 1),
  ],
  [
    brush('M180 456C213 528 296 568 376 550C462 530 501 450 503 364', 20, 0.9),
    brush('M268 245C286 239 287 220 306 209', 12, 0.2),
    brush('M280 263C300 251 300 236 317 224', 11, 1.5),
    brush('M292 281C310 271 315 254 327 245', 12, 2.2),
    dot(393, 418, 33, 39, 15, 2),
    dot(258, 258, 5, 5.5),
    dot(265, 275, 4.5, 5, 10),
  ],
  [
    brush('M250 280C346 291 413 374 412 455C407 486 388 512 354 524Q342 500 327 528C285 552 228 522 204 484', 20, 1.2),
    brush('M463 459C488 513 539 518 570 481C589 459 594 419 589 387', 17, 2),
    dot(300, 450, 33, 40, -14, 0.8),
    dot(566, 442, 23, 31, 13, 1.7),
  ],
  [
    brush('M280 552C350 627 485 634 588 552C650 495 672 407 663 330', 22, 0.8),
    brush('M391 538C387 551 378 563 379 574C380 590 403 591 405 575C406 564 397 550 391 538Z', 9, 1, true),
    dot(390, 473, 43, 51, -12, 2.2),
  ],
];

for (const [index, paths] of illustrations.entries()) {
  await writeFile(new URL(`symptoms-0${index + 1}.svg`, output),
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 720 960" fill="${color}">\n  ${paths.join('\n  ')}\n</svg>\n`);
}
