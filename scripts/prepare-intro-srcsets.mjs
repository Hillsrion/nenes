import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const directory = path.resolve('public/images/intro');
const output = path.join(directory, 'desktop');
const files = [
  ...[1, 2, 3, 4].map(index => `background-0${index}.webp`),
  ...[1, 2, 3].map(index => `cutout-0${index}.webp`),
];

await mkdir(output, { recursive: true });
let count = 0;
for (const file of files) {
  const source = path.join(directory, file);
  const { width: nativeWidth } = await sharp(source).metadata();
  for (const width of [960, 1366]) {
    // The original remains the largest candidate; never upscale it.
    if (width >= nativeWidth) continue;
    await sharp(source)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 88, alphaQuality: 100, effort: 6 })
      .toFile(path.join(output, file.replace('.webp', `-${width}.webp`)));
    count++;
  }
}
console.log(`${count} desktop intro variants prepared.`);
