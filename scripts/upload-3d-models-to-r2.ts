#!/usr/bin/env node

/**
 * Upload a reviewed, derived GLB model to the dedicated Cloudflare R2 bucket.
 *
 * Usage:
 *   pnpm models:upload -- <reviewed-model>.glb
 *   pnpm models:upload -- --all-local
 *
 * The script accepts only final GLB names in public/models. Source photos and
 * intermediate `-base.glb` files cannot be uploaded by accident.
 * Authentication is delegated to Wrangler OAuth.
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

try {
  process.loadEnvFile?.(path.join(process.cwd(), ".env"));
} catch {
  // Wrangler or CI may provide the environment without a local .env file.
}

const hiddenBustModelFiles = new Set(
  String(process.env.NUXT_3D_HIDDEN_MODEL_FILES || "")
    .split(",")
    .map((fileName) => fileName.trim())
    .filter(Boolean)
);

const bucketName =
  process.env.CLOUDFLARE_R2_3D_BUCKET_NAME || "nenes-3d-models";
const publicUrl = (
  process.env.NUXT_PUBLIC_3D_MODELS_URL ||
  "https://pub-43370cee5bda403fb0a2206c460fe804.r2.dev"
).replace(/\/+$/, "");

const localModelsDirectory = path.join(process.cwd(), "public", "models");
const finalModelName = /^bust-[a-z0-9][a-z0-9-]*\.glb$/i;

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function getRequestedFiles(): string[] {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs[0] === "--" ? rawArgs.slice(1) : rawArgs;

  if (args.length === 1 && args[0] === "--all-local") {
    return fs
      .readdirSync(localModelsDirectory)
      .filter(
        (fileName) =>
          finalModelName.test(fileName) &&
          !fileName.endsWith("-base.glb") &&
          !hiddenBustModelFiles.has(fileName)
      );
  }

  if (args.length !== 1) {
    fail(
      "Choose exactly one reviewed model, for example: pnpm models:upload -- <reviewed-model>.glb"
    );
  }

  const [fileName] = args;
  if (
    !finalModelName.test(fileName) ||
    fileName.endsWith("-base.glb") ||
    hiddenBustModelFiles.has(fileName)
  ) {
    fail(
      `\"${fileName}\" is not a final bust GLB. Source photos and intermediate files are refused.`
    );
  }

  return [fileName];
}

function uploadModel(fileName: string) {
  const localPath = path.join(localModelsDirectory, fileName);
  const remotePath = `models/${fileName}`;

  if (!fs.existsSync(localPath)) {
    console.warn(`⚠️  ${fileName} absent localement — ignoré.`);
    return false;
  }

  const size = fs.statSync(localPath).size;
  console.log(`\n📤 ${fileName} → ${remotePath}`);
  console.log(`   ${(size / 1024 / 1024).toFixed(2)} MB`);

  const pnpmCommand = process.platform === "win32" ? "pnpm.cmd" : "pnpm";
  const upload = spawnSync(
    pnpmCommand,
    [
      "dlx",
      "wrangler",
      "r2",
      "object",
      "put",
      `${bucketName}/${remotePath}`,
      "--file",
      localPath,
      "--content-type",
      "model/gltf-binary",
      "--cache-control",
      "public, max-age=3600, must-revalidate",
      "--remote",
    ],
    { stdio: "inherit" }
  );

  if (upload.error) fail(`Wrangler could not start: ${upload.error.message}`);
  if (upload.status !== 0) {
    fail("Wrangler upload failed. Run `pnpm dlx wrangler login` and retry.");
  }

  console.log(`✅ ${publicUrl}/${remotePath}`);
  return true;
}

function main() {
  const files = getRequestedFiles();

  console.log(`🧊 R2 bucket: ${bucketName}`);
  console.log(`📁 Local models: ${localModelsDirectory}`);

  let uploaded = 0;
  for (const fileName of files) {
    if (uploadModel(fileName)) uploaded += 1;
  }

  if (uploaded === 0) fail("No model was uploaded.");
  console.log(`\n✨ ${uploaded} modèle(s) publié(s).`);
}

main();
