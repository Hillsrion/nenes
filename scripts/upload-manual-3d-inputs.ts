#!/usr/bin/env node

/**
 * Archive locally received 3D reference photos in the private R2 inputs bucket.
 *
 * Folder names may identify a person, so they are never used in R2 object keys
 * or metadata. A local, ignored manifest maps each source folder to its random
 * collection id. Manual archives deliberately do not use `submissions/`: those
 * keys represent form submissions and are limited to one to four images.
 */

import { createHash, randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const supportedExtensions = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const defaultSourceDirectory = path.join(projectDirectory, "breast-images");
const manifestFileName = ".r2-manual-uploads.json";

type Archive = { collectionId: string; uploadedFiles: Record<string, string> };
type LocalManifest = { version: 1; archives: Record<string, Archive> };
type Options = { sourceDirectory: string; dryRun: boolean; force: boolean; auth: "oauth" | "s3" };

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  process.exit(1);
}

function readOptions(): Options {
  const args = process.argv.slice(2);
  if (args[0] === "--") args.shift();
  const options: Options = { sourceDirectory: defaultSourceDirectory, dryRun: false, force: false, auth: "oauth" };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === "--dry-run") options.dryRun = true;
    else if (argument === "--force") options.force = true;
    else if (argument === "--source" && args[index + 1]) options.sourceDirectory = path.resolve(args[++index]);
    else if (argument === "--auth" && (args[index + 1] === "oauth" || args[index + 1] === "s3")) options.auth = args[++index] as Options["auth"];
    else if (argument === "--help" || argument === "-h") {
      console.log("Usage: pnpm inputs:upload-manual [-- --source <directory>] [--auth oauth|s3] [--dry-run] [--force]");
      process.exit(0);
    } else fail(`Option inconnue ou valeur manquante : ${argument}`);
  }
  return options;
}

function requiredEnvironment(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!value) fail(`La variable ${name}${fallbackName ? ` (ou ${fallbackName})` : ""} est requise.`);
  return value;
}

function createClient(): { client: S3Client; bucket: string } {
  const accountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID", "NUXT_R2_INPUTS_ACCOUNT_ID");
  const bucket = requiredEnvironment("NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME");
  const accessKeyId = requiredEnvironment("CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID", "NUXT_R2_INPUTS_ACCESS_KEY_ID");
  const secretAccessKey = requiredEnvironment("CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY", "NUXT_R2_INPUTS_SECRET_ACCESS_KEY");
  return {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
}

async function readLocalManifest(sourceDirectory: string): Promise<LocalManifest> {
  const manifestPath = path.join(sourceDirectory, manifestFileName);
  if (!existsSync(manifestPath)) return { version: 1, archives: {} };
  const parsed = JSON.parse(await readFile(manifestPath, "utf8")) as LocalManifest;
  if (parsed.version !== 1 || !parsed.archives) fail(`Manifest local invalide : ${manifestPath}`);
  return parsed;
}

async function writeLocalManifest(sourceDirectory: string, manifest: LocalManifest): Promise<void> {
  await writeFile(path.join(sourceDirectory, manifestFileName), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");
}

async function supportedFiles(directory: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await supportedFiles(entryPath)));
    else if (entry.isFile() && supportedExtensions.has(path.extname(entry.name).toLowerCase())) files.push(entryPath);
  }
  return files.sort((left, right) => left.localeCompare(right));
}

async function sha256(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

async function objectExists(client: S3Client, bucket: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    if ((error as { $metadata?: { httpStatusCode?: number } }).$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
}

function runWrangler(arguments_: string[], input?: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(path.join(projectDirectory, "node_modules", ".bin", "wrangler"), arguments_, {
      cwd: projectDirectory,
      stdio: [input === undefined ? "ignore" : "pipe", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(output.trim() || `Wrangler a quitté avec le code ${code}.`));
    });
    if (input !== undefined) child.stdin.end(input);
  });
}

async function uploadWithOAuth(
  bucket: string,
  key: string,
  contentType: string,
  filePath?: string,
  body?: string
): Promise<void> {
  const command = ["r2", "object", "put", `${bucket}/${key}`, "--content-type", contentType, "--remote"];
  if (filePath) command.push("--file", filePath);
  else command.push("--pipe");
  await runWrangler(command, body);
}

async function main() {
  const options = readOptions();
  const sourceStats = await stat(options.sourceDirectory).catch(() => undefined);
  if (!sourceStats?.isDirectory()) fail(`Dossier source introuvable : ${options.sourceDirectory}`);
  const manifest = await readLocalManifest(options.sourceDirectory);
  const directories = (await readdir(options.sourceDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(options.sourceDirectory, entry.name))
    .sort((left, right) => left.localeCompare(right));
  if (directories.length === 0) fail("Aucun sous-dossier de photos à importer.");

  const connection = options.dryRun || options.auth === "oauth" ? undefined : createClient();
  const oauthBucket = requiredEnvironment(
    "NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME",
    "CLOUDFLARE_R2_INPUTS_BUCKET_NAME"
  );
  let uploaded = 0;
  let skipped = 0;

  for (const directory of directories) {
    const folderKey = path.relative(options.sourceDirectory, directory);
    const files = await supportedFiles(directory);
    if (files.length === 0) continue;
    const archive = manifest.archives[folderKey] ?? { collectionId: randomUUID(), uploadedFiles: {} };
    manifest.archives[folderKey] = archive;
    if (!options.dryRun) await writeLocalManifest(options.sourceDirectory, manifest);
    const collectionPrefix = `manual/${archive.collectionId}`;
    console.log(`Collection ${archive.collectionId}: ${files.length} image(s)`);

    const objects: Array<{ key: string; sha256: string; bytes: number; contentType: string }> = [];
    for (const [index, filePath] of files.entries()) {
      const extension = path.extname(filePath).toLowerCase();
      const checksum = await sha256(filePath);
      const objectKey = `${collectionPrefix}/images/input-${String(index + 1).padStart(3, "0")}${extension}`;
      const fileStats = await stat(filePath);
      objects.push({ key: objectKey, sha256: checksum, bytes: fileStats.size, contentType: supportedExtensions.get(extension)! });

      const previousChecksum = archive.uploadedFiles[objectKey];
      const alreadyUploaded = previousChecksum === checksum && !options.force;
      if (alreadyUploaded && (options.auth === "oauth" || await objectExists(connection!.client, connection!.bucket, objectKey))) {
        skipped += 1;
        continue;
      }
      if (options.dryRun) {
        uploaded += 1;
        continue;
      }
      if (options.auth === "oauth") {
        await uploadWithOAuth(oauthBucket, objectKey, supportedExtensions.get(extension)!, filePath);
      } else {
        await connection!.client.send(new PutObjectCommand({
          Bucket: connection!.bucket,
          Key: objectKey,
          Body: createReadStream(filePath),
          ContentType: supportedExtensions.get(extension),
          Metadata: { sha256: checksum, source: "manual-archive" },
        }));
      }
      archive.uploadedFiles[objectKey] = checksum;
      await writeLocalManifest(options.sourceDirectory, manifest);
      uploaded += 1;
    }

    if (!options.dryRun) {
      const remoteManifest = JSON.stringify({ version: 1, collectionId: archive.collectionId, files: objects }, null, 2);
      if (options.auth === "oauth") {
        await uploadWithOAuth(oauthBucket, `${collectionPrefix}/manifest.json`, "application/json", undefined, remoteManifest);
      } else {
        await connection!.client.send(new PutObjectCommand({
          Bucket: connection!.bucket,
          Key: `${collectionPrefix}/manifest.json`,
          Body: remoteManifest,
          ContentType: "application/json",
          Metadata: { source: "manual-archive" },
        }));
      }
    }
  }

  if (!options.dryRun) await writeLocalManifest(options.sourceDirectory, manifest);
  console.log(`${options.dryRun ? "À importer" : "Import terminé"} : ${uploaded} image(s), ${skipped} déjà présente(s).`);
}

void main().catch((error) => fail(error instanceof Error ? error.message : String(error)));
