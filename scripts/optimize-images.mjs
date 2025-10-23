import sharp from 'sharp';
import { promises as fs } from 'fs';
import path from 'path';
import fg from 'fast-glob';

const __dirname = path.resolve();

const imageSizes = JSON.parse(
  await fs.readFile(path.join(__dirname, 'imageSizes.json'), 'utf-8')
);

const PUBLIC_DIR = path.join(__dirname, 'public');
const IMAGES_DIR = path.join(PUBLIC_DIR, 'images');

const optimizeImage = async (
  inputPath,
  outputPath,
  width,
  height,
  fit = 'cover',
  formats = ['avif', 'webp']
) => {
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const inputStat = await fs.stat(inputPath);
  let outputStat;
  try {
    outputStat = await fs.stat(outputPath);
  } catch (error) {
    // File does not exist
  }

  if (outputStat && outputStat.mtimeMs > inputStat.mtimeMs) {
    console.log(`Skipping ${outputPath}, already up to date.`);
    return;
  }

  const image = sharp(inputPath);
  if (width && height) {
    image.resize(width, height, { fit });
  } else if (width) {
    image.resize(width);
  }

  if (formats.includes('avif')) {
    await image.avif({ quality: 90, effort: 5 }).toFile(outputPath.replace(/\.(jpg|png)$/, '.avif'));
  }
  if (formats.includes('webp')) {
    await image.webp({ quality: 90 }).toFile(outputPath.replace(/\.(jpg|png)$/, '.webp'));
  }
  console.log(`Optimized ${inputPath} to ${outputPath.replace(/\.(jpg|png)$/, '.avif')} and ${outputPath.replace(/\.(jpg|png)$/, '.webp')}`);
};

const processCursorImages = async () => {
  const cursorImages = await fg('public/images/cursor/*.jpg', { cwd: __dirname });
  const { width, height } = imageSizes.cursor.size;

  for (const imagePath of cursorImages) {
    const basename = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(
      IMAGES_DIR,
      'cursor',
      `${basename}-${width}x${height}.jpg`
    );
    await optimizeImage(imagePath, outputPath, width, height, 'cover');
  }
};

const processCoverImages = async () => {
  const coverPath = path.join(PUBLIC_DIR, 'images', 'entry-cover.jpg');
  const coverPortraitPath = path.join(PUBLIC_DIR, 'images', 'entry-cover-portrait.jpg');

  const coverWidths = [3840, 2560, 1920, 1280, 1024];
  const coverPortraitWidths = [1440, 1080, 828, 640];

  for (const width of coverWidths) {
    const outputPath = path.join(IMAGES_DIR, 'entry-cover', `entry-cover@${width}.jpg`);
    await optimizeImage(coverPath, outputPath, width, null, 'cover');
  }

  for (const width of coverPortraitWidths) {
    const outputPath = path.join(IMAGES_DIR, 'entry-cover-portrait', `entry-cover-portrait@${width}.jpg`);
    await optimizeImage(coverPortraitPath, outputPath, width, null, 'cover');
  }
};

const processScreeningImages = async () => {
  const screeningImages = await fg('public/images/screening/*.jpg', { cwd: __dirname });

  for (const imagePath of screeningImages) {
    const basename = path.basename(imagePath, path.extname(imagePath));
    const sizes = imageSizes.screening.screens;
    const regularSize = imageSizes.screening.size;

    // Treat 'size' as 'regular'
    await optimizeImage(
      imagePath,
      path.join(IMAGES_DIR, 'screening', `${basename}_regular.jpg`),
      regularSize.width,
      regularSize.height,
      'cover'
    );

    for (const [key, { width, height }] of Object.entries(sizes)) {
      await optimizeImage(
        imagePath,
        path.join(IMAGES_DIR, 'screening', `${basename}_${key}.jpg`),
        width,
        height,
        'cover'
      );
    }
  }
};

const processSymptomsImages = async () => {
  const symptomImages = await fg('public/images/symptoms/*.jpg', { cwd: __dirname });

  for (const imagePath of symptomImages) {
    const basename = path.basename(imagePath, path.extname(imagePath));
    const outputPath = path.join(
      IMAGES_DIR,
      'symptoms',
      `${basename}.jpg`
    );
    await optimizeImage(imagePath, outputPath, null, null, 'cover', ['avif']);
  }
};

const runOptimization = async () => {
  console.log('Starting image optimization...');
  await processCursorImages();
  await processCoverImages();
  await processScreeningImages();
  await processSymptomsImages();
  console.log('Image optimization complete.');
};

runOptimization().catch(console.error);
