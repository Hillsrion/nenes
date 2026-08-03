import { constants, copyFile, mkdir, mkdtemp, rm, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const usage = [
  "Usage:",
  "  HUNYUAN3D_DIR=/absolute/path/to/Hunyuan3D-Swift \\",
  "    pnpm model:photo -- <photo.jpg|png|webp> <public/models/name.glb>",
  "",
  "Optional:",
  "  HUNYUAN3D_CLI=/absolute/path/to/hy3d",
  "  HUNYUAN3D_SHAPE_WEIGHTS=/absolute/path/to/shape-weights",
  "  HUNYUAN3D_PAINT_WEIGHTS=/absolute/path/to/paint-weights",
  "",
  "Without HUNYUAN3D_PAINT_WEIGHTS, the fast shape-only pipeline is used.",
].join("\n");

const fail = (message) => {
  console.error(message);
  console.error("");
  console.error(usage);
  process.exit(1);
};

const [sourceArgument, outputArgument] = process.argv.slice(2);
if (!sourceArgument || !outputArgument) fail("A source photo and an output GLB are required.");

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const modelsDirectory = path.resolve(projectDirectory, "public/models");
const sourcePath = path.resolve(projectDirectory, sourceArgument);
const outputPath = path.resolve(projectDirectory, outputArgument);
const outputRelativeToModels = path.relative(modelsDirectory, outputPath);

if (
  outputRelativeToModels.startsWith("..") ||
  path.isAbsolute(outputRelativeToModels) ||
  path.extname(outputPath).toLowerCase() !== ".glb"
) {
  fail("The output must be a .glb file inside public/models/.");
}

if (!/\.(jpe?g|png|webp)$/i.test(sourcePath)) {
  fail("The source must be a JPEG, PNG, or WebP image.");
}

const sourceInfo = await stat(sourcePath).catch(() => null);
if (!sourceInfo?.isFile()) fail("Source photo not found: " + sourcePath);

const hunyuanDirectoryValue = process.env.HUNYUAN3D_DIR;
if (!hunyuanDirectoryValue) fail("HUNYUAN3D_DIR is not set.");

const hunyuanDirectory = path.resolve(hunyuanDirectoryValue);
const hunyuanCli = process.env.HUNYUAN3D_CLI
  ? path.resolve(process.env.HUNYUAN3D_CLI)
  : path.join(hunyuanDirectory, ".build", "release", "hy3d");
const shapeWeights = process.env.HUNYUAN3D_SHAPE_WEIGHTS
  ? path.resolve(process.env.HUNYUAN3D_SHAPE_WEIGHTS)
  : path.join(hunyuanDirectory, "weights", "shape-small");
const paintWeights = process.env.HUNYUAN3D_PAINT_WEIGHTS
  ? path.resolve(process.env.HUNYUAN3D_PAINT_WEIGHTS)
  : null;

const cliInfo = await stat(hunyuanCli).catch(() => null);
if (!cliInfo?.isFile()) {
  fail("Hunyuan3D CLI not found. Run swift build -c release first: " + hunyuanCli);
}

const shapeWeightsInfo = await stat(shapeWeights).catch(() => null);
if (!shapeWeightsInfo?.isDirectory()) {
  fail("Hunyuan3D shape weights not found: " + shapeWeights);
}

if (paintWeights) {
  const paintWeightsInfo = await stat(paintWeights).catch(() => null);
  if (!paintWeightsInfo?.isDirectory()) {
    fail("Hunyuan3D paint weights not found: " + paintWeights);
  }
}

const existingOutput = await stat(outputPath).catch(() => null);
if (existingOutput) fail("Refusing to overwrite the existing output: " + outputPath);

await mkdir(modelsDirectory, { recursive: true });

const temporaryPrefix = path.join(os.tmpdir(), "nenes-hunyuan3d-");
const temporaryDirectory = await mkdtemp(temporaryPrefix);
const generatedMesh = path.join(temporaryDirectory, "mesh.glb");

const run = (command, args) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: hunyuanDirectory,
      env: process.env,
      stdio: "inherit",
    });

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error("Hunyuan3D exited with " + (signal ?? "code " + code)));
    });
  });

try {
  const args = paintWeights
    ? [
        "generate",
        sourcePath,
        "-o",
        generatedMesh,
        "--shape-weights",
        shapeWeights,
        "--paint-weights",
        paintWeights,
      ]
    : ["shape", sourcePath, "-o", generatedMesh, "--weights", shapeWeights];

  await run(hunyuanCli, args);

  const generatedInfo = await stat(generatedMesh).catch(() => null);
  if (!generatedInfo?.isFile()) {
    throw new Error("Hunyuan3D did not create " + generatedMesh);
  }

  await copyFile(generatedMesh, outputPath, constants.COPYFILE_EXCL);
  console.log("Generated " + path.relative(projectDirectory, outputPath));
} finally {
  if (temporaryDirectory.startsWith(temporaryPrefix)) {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
