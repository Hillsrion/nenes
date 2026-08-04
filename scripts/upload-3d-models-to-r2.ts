#!/usr/bin/env node

/**
 * Upload a reviewed, derived GLB model to the existing Cloudflare R2 bucket.
 *
 * Usage:
 *   pnpm models:upload -- bust-photo-symptoms.glb
 *   pnpm models:upload -- --all-configured
 *
 * The script deliberately accepts only file names declared in
 * config/bust-models.ts. Source photos and intermediate GLBs cannot be
 * uploaded by accident.
 */

import fs from "node:fs";
import path from "node:path";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { bustFruitModels, defaultBustModel } from "../config/bust-models";

const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || "";
const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || "";
const bucketName = process.env.CLOUDFLARE_R2_BUCKET_NAME || "";
const publicUrl = (
  process.env.NUXT_PUBLIC_3D_MODELS_URL ||
  process.env.NUXT_PUBLIC_R2_PUBLIC_URL ||
  ""
).replace(/\/+$/, "");

const localModelsDirectory = path.join(process.cwd(), "public", "models");
const configuredFiles = new Set([
  defaultBustModel.fileName,
  ...bustFruitModels.map((model) => model.fileName),
]);

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function validateEnvironment() {
  const required = {
    CLOUDFLARE_ACCOUNT_ID: accountId,
    CLOUDFLARE_R2_ACCESS_KEY_ID: accessKeyId,
    CLOUDFLARE_R2_SECRET_ACCESS_KEY: secretAccessKey,
    CLOUDFLARE_R2_BUCKET_NAME: bucketName,
    "NUXT_PUBLIC_3D_MODELS_URL or NUXT_PUBLIC_R2_PUBLIC_URL": publicUrl,
  };

  for (const [name, value] of Object.entries(required)) {
    if (!value) fail(`${name} is required.`);
  }
}

function getRequestedFiles(): string[] {
  const args = process.argv.slice(2);

  if (args.length === 1 && args[0] === "--all-configured") {
    return [...configuredFiles];
  }

  if (args.length !== 1) {
    fail(
      "Choose exactly one reviewed model, for example: pnpm models:upload -- bust-photo-symptoms.glb"
    );
  }

  const [fileName] = args;
  if (!configuredFiles.has(fileName)) {
    fail(
      `\"${fileName}\" is not declared in config/bust-models.ts. Refusing to upload an unreviewed file.`
    );
  }

  return [fileName];
}

function createClient() {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadModel(client: S3Client, fileName: string) {
  const localPath = path.join(localModelsDirectory, fileName);
  const remotePath = `models/${fileName}`;

  if (!fs.existsSync(localPath)) {
    console.warn(`⚠️  ${fileName} absent localement — ignoré.`);
    return false;
  }

  const content = fs.readFileSync(localPath);
  console.log(`\n📤 ${fileName} → ${remotePath}`);
  console.log(`   ${(content.length / 1024 / 1024).toFixed(2)} MB`);

  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: remotePath,
      Body: content,
      ContentType: "model/gltf-binary",
      // Current catalogue names are stable. Keep updates visible within an hour.
      CacheControl: "public, max-age=3600, must-revalidate",
    })
  );

  console.log(`✅ ${publicUrl}/${remotePath}`);
  return true;
}

async function main() {
  validateEnvironment();
  const files = getRequestedFiles();
  const client = createClient();

  console.log(`🧊 R2 bucket: ${bucketName}`);
  console.log(`📁 Local models: ${localModelsDirectory}`);

  let uploaded = 0;
  for (const fileName of files) {
    if (await uploadModel(client, fileName)) uploaded += 1;
  }

  if (uploaded === 0) fail("No model was uploaded.");
  console.log(`\n✨ ${uploaded} modèle(s) publié(s).`);
}

main().catch((error) => {
  console.error("\n❌ Upload failed:", error);
  process.exit(1);
});
