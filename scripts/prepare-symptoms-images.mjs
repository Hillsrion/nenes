import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../public/images/symptoms/', import.meta.url);
const output = new URL('updated/', root);

// Crops use a 720 × 1080 reference so the SVG illustrations can be calibrated
// against a fixed 720 × 960 canvas. Extract from the full-resolution originals.
const photos = [
  { source: '0D2A4427', crop: [0, 60, 720, 960] },
  { source: '0D2A4428', crop: [0, 60, 720, 960] },
  { source: '0D2A4444', crop: [80, 150, 600, 800] }, // Three-quarter view for dimpling.
  { source: '0D2A4440', crop: [0, 60, 720, 960] },
];

await mkdir(output, { recursive: true });
for (const [index, { source, crop }] of photos.entries()) {
  const input = fileURLToPath(new URL(`new/${source}.jpg`, root));
  const { width, height } = await sharp(input).metadata();
  const [x, y, w, h] = crop;
  await sharp(input)
    .rotate()
    .extract({
      left: Math.round(x / 720 * width),
      top: Math.round(y / 1080 * height),
      width: Math.round(w / 720 * width),
      height: Math.round(h / 1080 * height),
    })
    .resize(960, 1280)
    .webp({ quality: 88 })
    .toFile(fileURLToPath(new URL(`symptoms-0${index + 1}.webp`, output)));
}
