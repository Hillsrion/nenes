#!/usr/bin/env node

/**
 * Process photo submissions stored in the private R2 inputs bucket.
 *
 * The content hash is the identity of a generation. This makes the command
 * safe to re-run: an identical set of input bytes is not generated twice,
 * even when it was uploaded under another submission UUID.
 *
 * Single-photo submissions use the fast Swift/MLX wrapper. Submissions with
 * 2 to 4 ordered views use the canonical Hunyuan3D-2mv bust pipeline. Both
 * paths finish with the procedural symptom pass.
 */

import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  GetObjectCommand,
  HeadObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const acceptedExtensions = new Set(["jpg", "jpeg", "png", "webp"]);
const inputKeyPattern = /^submissions\/([^/]+)\/images\/input-(\d{3})\.([a-z0-9]+)$/i;
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.resolve(scriptDirectory, "..");
const localModelsDirectory = path.join(projectDirectory, "public", "models");

type InputObject = { key: string; index: number; extension: string; size: number };
type Submission = { id: string; inputs: InputObject[] };
type ModelCatalog = {
  version: 1;
  models: Record<
    string,
    {
      modelKey: string;
      source: {
        manifestKey: string;
        imageIndex: number;
        rotationY: number;
        label: string;
      };
      classification?: {
        fruitId: string;
        confidence?: number;
        classifier?: string;
        updatedAt: string;
      };
      generatedAt?: string;
      pipeline?: string;
    }
  >;
};
type Options = {
  hash?: string;
  submissionId?: string;
  dryRun: boolean;
  force: boolean;
  outputPrefix: string;
  limit?: number;
};

const usage = `Usage:
  pnpm models:process-r2
  pnpm models:process-r2 -- --hash <sha256>
  pnpm models:process-r2 -- --submission <submission-id>

Options:
  --hash <sha256>          Traiter uniquement ce hash (ou son préfixe).
  --submission <id>        Traiter uniquement cette soumission R2.
  --limit <n>              Limiter le nombre de soumissions inspectées.
  --output-prefix <prefix> Préfixe R2 de sortie (défaut: models/generated).
  --dry-run                Calculer les hashes et ne rien générer ni publier.
  --force                  Régénérer et remplacer un modèle existant.
  --help                   Afficher cette aide.

Variables R2 inputs:
  CLOUDFLARE_ACCOUNT_ID ou NUXT_R2_INPUTS_ACCOUNT_ID
  NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME
  CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID ou NUXT_R2_INPUTS_ACCESS_KEY_ID
  CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY ou NUXT_R2_INPUTS_SECRET_ACCESS_KEY

Variables R2 modèles (les identifiants inputs sont utilisés par défaut):
  CLOUDFLARE_R2_3D_BUCKET_NAME (défaut: nenes-3d-models)
  CLOUDFLARE_R2_3D_ACCOUNT_ID
  CLOUDFLARE_R2_3D_ACCESS_KEY_ID
  CLOUDFLARE_R2_3D_SECRET_ACCESS_KEY

Hunyuan3D:
  HUNYUAN3D_DIR=/chemin/vers/Hunyuan3D-Swift
  HUNYUAN3D_MV_DIR=/chemin/vers/Hunyuan3D-2
`;

function fail(message: string): never {
  console.error(`\n❌ ${message}`);
  console.error(`\n${usage}`);
  process.exit(1);
}

function readOptions(): Options {
  const args = process.argv.slice(2);
  if (args[0] === "--") args.shift();
  const options: Options = { dryRun: false, force: false, outputPrefix: "models/generated" };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const next = args[index + 1];
    if (argument === "--help" || argument === "-h") {
      console.log(usage);
      process.exit(0);
    }
    if (argument === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (argument === "--force") {
      options.force = true;
      continue;
    }
    if (argument === "--hash" && next) {
      options.hash = next.toLowerCase();
      index += 1;
      continue;
    }
    if (argument === "--submission" && next) {
      options.submissionId = next;
      index += 1;
      continue;
    }
    if (argument === "--output-prefix" && next) {
      options.outputPrefix = next.replace(/^\/+|\/+$/g, "");
      index += 1;
      continue;
    }
    if (argument === "--limit" && next) {
      const limit = Number.parseInt(next, 10);
      if (!Number.isInteger(limit) || limit < 1) fail("--limit doit être un entier positif.");
      options.limit = limit;
      index += 1;
      continue;
    }
    fail(`Option inconnue ou valeur manquante: ${argument}`);
  }

  if (options.hash && !/^[a-f0-9]{8,64}$/.test(options.hash)) {
    fail("--hash doit être un SHA-256 complet ou un préfixe hexadécimal d'au moins 8 caractères.");
  }
  if (options.submissionId && !/^[a-zA-Z0-9-]+$/.test(options.submissionId)) {
    fail("--submission contient des caractères invalides.");
  }
  if (options.hash && options.submissionId) fail("Utiliser --hash ou --submission, pas les deux.");
  return options;
}

function requiredEnvironment(name: string, fallbackName?: string): string {
  const value = process.env[name] || (fallbackName ? process.env[fallbackName] : "");
  if (!value) fail(`La variable ${name}${fallbackName ? ` (ou ${fallbackName})` : ""} est requise.`);
  return value;
}

function createClient(accountId: string, accessKeyId: string, secretAccessKey: string): S3Client {
  return new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function bodyToBuffer(body: unknown): Promise<Buffer> {
  if (!body) throw new Error("R2 a renvoyé un objet sans contenu.");
  if (body instanceof Uint8Array) return Buffer.from(body);
  const transformToByteArray = (body as { transformToByteArray?: () => Promise<Uint8Array> })
    .transformToByteArray;
  if (transformToByteArray) return Buffer.from(await transformToByteArray.call(body));
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks);
}

async function listSubmissions(client: S3Client, bucketName: string): Promise<Submission[]> {
  const submissions = new Map<string, InputObject[]>();
  let continuationToken: string | undefined;
  do {
    const result = await client.send(
      new ListObjectsV2Command({ Bucket: bucketName, Prefix: "submissions/", ContinuationToken: continuationToken })
    );
    for (const object of result.Contents || []) {
      const key = object.Key || "";
      const match = inputKeyPattern.exec(key);
      if (!match || !acceptedExtensions.has(match[3].toLowerCase())) continue;
      const inputs = submissions.get(match[1]) || [];
      inputs.push({
        key,
        index: Number.parseInt(match[2], 10),
        extension: match[3].toLowerCase(),
        size: object.Size || 0,
      });
      submissions.set(match[1], inputs);
    }
    continuationToken = result.IsTruncated ? result.NextContinuationToken : undefined;
  } while (continuationToken);

  return [...submissions.entries()]
    .map(([id, inputs]) => ({ id, inputs: inputs.sort((left, right) => left.index - right.index) }))
    .sort((left, right) => left.id.localeCompare(right.id));
}

async function downloadInputs(
  client: S3Client,
  bucketName: string,
  submission: Submission,
  temporaryDirectory: string
): Promise<Array<{ object: InputObject; path: string; bytes: Buffer }>> {
  const downloaded: Array<{ object: InputObject; path: string; bytes: Buffer }> = [];
  for (const object of submission.inputs) {
    const result = await client.send(new GetObjectCommand({ Bucket: bucketName, Key: object.key }));
    const bytes = await bodyToBuffer(result.Body);
    const localPath = path.join(temporaryDirectory, `input-${String(object.index).padStart(3, "0")}.${object.extension}`);
    await writeFile(localPath, bytes, { flag: "wx" });
    downloaded.push({ object, path: localPath, bytes });
  }
  return downloaded;
}

function hashInputs(inputs: Array<{ object: InputObject; bytes: Buffer }>): string {
  const hash = createHash("sha256");
  for (const input of inputs.sort((left, right) => left.object.index - right.object.index)) {
    hash.update(`${input.object.index}\0${input.object.extension}\0`);
    hash.update(input.bytes);
    hash.update("\0");
  }
  return hash.digest("hex");
}

async function objectExists(client: S3Client, bucketName: string, key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucketName, Key: key }));
    return true;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NotFound") return false;
    throw error;
  }
}

async function readModelCatalog(
  client: S3Client,
  bucketName: string,
  manifestKey: string
): Promise<ModelCatalog> {
  try {
    const response = await client.send(
      new GetObjectCommand({ Bucket: bucketName, Key: manifestKey })
    );
    const parsed = JSON.parse((await bodyToBuffer(response.Body)).toString("utf8")) as ModelCatalog;
    if (parsed.version !== 1 || !parsed.models) throw new Error("Catalogue de modèles invalide.");
    return parsed;
  } catch (error: any) {
    if (error?.$metadata?.httpStatusCode === 404 || error?.name === "NoSuchKey") {
      return { version: 1, models: {} };
    }
    throw error;
  }
}

async function registerModelInCatalog(
  client: S3Client,
  bucketName: string,
  manifestKey: string,
  modelId: string,
  modelKey: string,
  sourceManifestKey: string,
  pipeline: string
) {
  const catalog = await readModelCatalog(client, bucketName, manifestKey);
  const existing = catalog.models[modelId];
  catalog.models[modelId] = {
    ...existing,
    modelKey,
    source: {
      manifestKey: sourceManifestKey,
      imageIndex: 1,
      rotationY: 0,
      label: "Vue de face",
    },
    generatedAt: existing?.generatedAt || new Date().toISOString(),
    pipeline,
  };
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: manifestKey,
      Body: `${JSON.stringify(catalog, null, 2)}\n`,
      ContentType: "application/json",
      CacheControl: "private, no-store",
    })
  );
}

function run(command: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd: projectDirectory, env: process.env, stdio: "inherit" });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} a échoué (${signal ?? `code ${code}`}).`));
    });
  });
}

async function generateModel(inputPaths: string[], hash: string, modelLabel: string): Promise<string> {
  await mkdir(localModelsDirectory, { recursive: true });
  const basePath = path.join(localModelsDirectory, `r2-${hash}-base.glb`);
  const outputPath = path.join(localModelsDirectory, `r2-${hash}.glb`);
  let generated = false;
  try {
    if (inputPaths.length === 1) {
      await run(process.execPath, ["scripts/photo-to-3d.mjs", inputPaths[0], basePath]);
    } else {
      const viewNames = ["front", "left", "back", "right"] as const;
      const multiviewArguments: string[] = ["scripts/multiview-to-3d.sh"];
      for (const [index, inputPath] of inputPaths.entries()) {
        const preparedPath = path.join(path.dirname(inputPath), `${viewNames[index]}.png`);
        await run("bash", ["scripts/remove-photo-background.sh", inputPath, preparedPath]);
        multiviewArguments.push(`--${viewNames[index]}`, preparedPath);
      }
      multiviewArguments.push("--output", basePath);
      await run("bash", multiviewArguments);
    }
    await run(process.execPath, ["scripts/generate-symptom-model.mjs", basePath, outputPath, modelLabel]);
    generated = true;
    return outputPath;
  } finally {
    await rm(basePath, { force: true });
    if (!generated) await rm(outputPath, { force: true });
  }
}

async function uploadModel(client: S3Client, bucketName: string, localPath: string, remoteKey: string) {
  await client.send(
    new PutObjectCommand({
      Bucket: bucketName,
      Key: remoteKey,
      Body: createReadStream(localPath),
      ContentType: "model/gltf-binary",
      CacheControl: "public, max-age=3600, must-revalidate",
    })
  );
}

async function main() {
  const options = readOptions();
  const inputAccountId = requiredEnvironment("CLOUDFLARE_ACCOUNT_ID", "NUXT_R2_INPUTS_ACCOUNT_ID");
  const inputBucketName = requiredEnvironment("NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME");
  const inputAccessKeyId = requiredEnvironment("CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID", "NUXT_R2_INPUTS_ACCESS_KEY_ID");
  const inputSecretAccessKey = requiredEnvironment("CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY", "NUXT_R2_INPUTS_SECRET_ACCESS_KEY");
  const outputAccountId = process.env.CLOUDFLARE_R2_3D_ACCOUNT_ID || inputAccountId;
  const outputBucketName = process.env.CLOUDFLARE_R2_3D_BUCKET_NAME || "nenes-3d-models";
  const outputAccessKeyId = process.env.CLOUDFLARE_R2_3D_ACCESS_KEY_ID || inputAccessKeyId;
  const outputSecretAccessKey = process.env.CLOUDFLARE_R2_3D_SECRET_ACCESS_KEY || inputSecretAccessKey;
  const inputClient = createClient(inputAccountId, inputAccessKeyId, inputSecretAccessKey);
  const outputClient = createClient(outputAccountId, outputAccessKeyId, outputSecretAccessKey);
  const modelManifestKey = process.env.NUXT_3D_MODEL_MANIFEST_KEY || "catalog/models.json";
  const submissions = await listSubmissions(inputClient, inputBucketName);
  const selectedSubmissions = submissions
    .filter((submission) => !options.submissionId || submission.id === options.submissionId)
    .slice(0, options.limit);
  if (selectedSubmissions.length === 0) {
    console.log("Aucune soumission trouvée.");
    return;
  }

  console.log(`🧊 ${selectedSubmissions.length} soumission(s) trouvée(s) dans ${inputBucketName}`);
  console.log(`📦 Sortie: ${outputBucketName}/${options.outputPrefix}/<sha256>.glb`);
  if (options.dryRun) console.log("🔎 Mode dry-run: aucune génération ni écriture R2.");

  const temporaryRoot = await mkdtemp(path.join(os.tmpdir(), "nenes-r2-models-"));
  let generated = 0;
  let skipped = 0;
  let multiView = 0;
  let failed = 0;
  try {
    for (const submission of selectedSubmissions) {
      const temporaryDirectory = await mkdtemp(path.join(temporaryRoot, `${submission.id}-`));
      try {
        if (submission.inputs.length < 1 || submission.inputs.length > 4) {
          failed += 1;
          console.error(`⚠️ ${submission.id}: nombre d'inputs invalide (${submission.inputs.length}).`);
          continue;
        }
        const downloaded = await downloadInputs(inputClient, inputBucketName, submission, temporaryDirectory);
        const hash = hashInputs(downloaded);
        const remoteKey = `${options.outputPrefix}/${hash}.glb`;
        const modelId = path.basename(remoteKey);
        const sourceManifestKey = `submissions/${submission.id}/manifest.json`;
        const pipeline = downloaded.length === 1 ? "hunyuan3d-2mini" : "hunyuan3d-2mv";
        const hashMatches = !options.hash || hash.startsWith(options.hash);
        console.log(`\n📷 ${submission.id} → ${hash}`);
        if (!hashMatches) {
          console.log("   ignorée: le hash ne correspond pas au filtre.");
          continue;
        }
        if (options.dryRun) {
          console.log(`   dry-run: ${remoteKey}`);
          continue;
        }
        if (!options.force && (await objectExists(outputClient, outputBucketName, remoteKey))) {
          await registerModelInCatalog(
            inputClient,
            inputBucketName,
            modelManifestKey,
            modelId,
            remoteKey,
            sourceManifestKey,
            pipeline
          );
          skipped += 1;
          console.log(`   déjà présente: ${remoteKey}`);
          continue;
        }
        const inputPaths = downloaded.map((input) => input.path);
        if (inputPaths.length > 1) multiView += 1;
        const localModelPath = await generateModel(
          inputPaths,
          hash,
          `Modèle généré · ${hash.slice(0, 12)}`
        );
        try {
          await uploadModel(outputClient, outputBucketName, localModelPath, remoteKey);
          await registerModelInCatalog(
            inputClient,
            inputBucketName,
            modelManifestKey,
            modelId,
            remoteKey,
            sourceManifestKey,
            pipeline
          );
        } finally {
          await rm(localModelPath, { force: true });
        }
        generated += 1;
        console.log(`   ✅ publié: ${remoteKey}`);
      } catch (error) {
        failed += 1;
        console.error(`   ❌ échec ${submission.id}: ${(error as Error).message}`);
      } finally {
        await rm(temporaryDirectory, { recursive: true, force: true });
      }
    }
  } finally {
    await rm(temporaryRoot, { recursive: true, force: true });
  }

  console.log(`\n✨ Générés: ${generated} · déjà présents: ${skipped} · multivues traitées: ${multiView} · erreurs: ${failed}`);
  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => fail((error as Error).message));
