import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const assetIds = [
  "food_apple_01",
  "food_kiwi_01",
  "food_lime_01",
  "food_lychee_01",
  "food_pomegranate_01",
  "lemon",
];

const outputRoot = path.resolve("public/3d/fruits/polyhaven");
const requestHeaders = { "User-Agent": "NenesAssetPipeline/1.0" };

const download = async (url) => {
  const response = await fetch(url, { headers: requestHeaders });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  return Buffer.from(await response.arrayBuffer());
};

const optimizeTexture = async (filePath, contents) => {
  if (!/\.jpe?g$/i.test(filePath)) return contents;
  return sharp(contents)
    .resize({ width: 512, height: 512, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 82, mozjpeg: true })
    .toBuffer();
};

for (const assetId of assetIds) {
  const filesResponse = await fetch(`https://api.polyhaven.com/files/${assetId}`, {
    headers: requestHeaders,
  });
  if (!filesResponse.ok) {
    throw new Error(`${filesResponse.status} ${filesResponse.statusText}: ${assetId}`);
  }

  const files = await filesResponse.json();
  const gltf = files.gltf?.["1k"]?.gltf;
  if (!gltf?.url) throw new Error(`No 1K glTF found for ${assetId}`);

  const assetRoot = path.join(outputRoot, assetId);
  const downloads = [
    [path.basename(new URL(gltf.url).pathname), gltf.url],
    ...Object.entries(gltf.include ?? {}).map(([relativePath, file]) => [
      relativePath,
      file.url,
    ]),
  ];

  for (const [relativePath, url] of downloads) {
    const destination = path.join(assetRoot, relativePath);
    const contents = await optimizeTexture(relativePath, await download(url));
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, contents);
  }

  console.log(`Downloaded ${assetId}`);
}
