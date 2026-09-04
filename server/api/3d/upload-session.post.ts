import { getHeader, readBody, setResponseHeader } from "h3";
import { randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 12 * 1024 * 1024;
const maxPhotoCount = 4;
const sessionLifetimeMs = 15 * 60 * 1000;

type UploadRequest = { photos?: Array<{ contentType?: string; bytes?: number }> };

function resolveInputsConfig(config: ReturnType<typeof useRuntimeConfig>) {
  const configured = config.r2Inputs || {};
  return {
    accountId: String(process.env.NUXT_R2_INPUTS_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || configured.accountId || "").trim(),
    bucketName: String(process.env.NUXT_R2_INPUTS_BUCKET_NAME || process.env.NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME || process.env.CLOUDFLARE_R2_INPUTS_BUCKET_NAME || configured.bucketName || "nenes-3d-inputs").trim(),
    accessKeyId: String(process.env.NUXT_R2_INPUTS_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID || configured.accessKeyId || "").trim(),
    secretAccessKey: String(process.env.NUXT_R2_INPUTS_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY || configured.secretAccessKey || "").trim(),
  };
}

function log(requestId: string, stage: string, details: Record<string, unknown> = {}) {
  console.info("[3d-upload]", JSON.stringify({ requestId, stage, ...details }));
}

async function archiveEvent(client: S3Client, bucketName: string, requestId: string, event: Record<string, unknown>) {
  try {
    await client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: `observability/3d-uploads/${new Date().toISOString().slice(0, 10)}/${requestId}.json`,
      Body: JSON.stringify({ version: 1, recordedAt: new Date().toISOString(), requestId, ...event }),
      ContentType: "application/json",
      CacheControl: "private, no-store",
    }));
  } catch (error) {
    console.warn("[3d-upload]", JSON.stringify({ requestId, stage: "r2_audit_write_failed", reason: error instanceof Error ? error.name : "unknown" }));
  }
}

export default defineEventHandler(async (event) => {
  const requestId = getHeader(event, "x-nf-request-id") || getHeader(event, "x-request-id") || randomUUID();
  setResponseHeader(event, "x-3d-upload-request-id", requestId);
  const r2Inputs = resolveInputsConfig(useRuntimeConfig(event));
  if (!r2Inputs.accountId || !r2Inputs.bucketName || !r2Inputs.accessKeyId || !r2Inputs.secretAccessKey) {
    log(requestId, "session_configuration_unavailable", { statusCode: 503 });
    throw createError({ statusCode: 503, statusMessage: "Le service d’envoi n’est pas encore configuré sur ce déploiement." });
  }

  let payload: UploadRequest;
  try {
    payload = await readBody<UploadRequest>(event);
  } catch {
    throw createError({ statusCode: 400, statusMessage: "La préparation de l’envoi est invalide." });
  }
  const photos = payload?.photos || [];
  if (photos.length === 0 || photos.length > maxPhotoCount) {
    throw createError({ statusCode: 400, statusMessage: "Ajoute entre 1 et 4 photos." });
  }
  for (const photo of photos) {
    if (!acceptedTypes.has(String(photo.contentType || ""))) {
      throw createError({ statusCode: 415, statusMessage: "Les formats acceptés sont JPEG, PNG et WebP." });
    }
    if (!Number.isInteger(photo.bytes) || Number(photo.bytes) <= 0 || Number(photo.bytes) > maxFileSize) {
      throw createError({ statusCode: 413, statusMessage: "Chaque photo doit faire au maximum 12 Mo." });
    }
  }

  const submissionId = randomUUID();
  const expiresAt = new Date(Date.now() + sessionLifetimeMs).toISOString();
  const files = photos.map((photo, index) => {
    const contentType = String(photo.contentType);
    return {
      key: `submissions/${submissionId}/images/input-${String(index + 1).padStart(3, "0")}.${acceptedTypes.get(contentType)}`,
      bytes: Number(photo.bytes),
      contentType,
    };
  });
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Inputs.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Inputs.accessKeyId, secretAccessKey: r2Inputs.secretAccessKey },
  });
  const totalBytes = files.reduce((total, file) => total + file.bytes, 0);

  await client.send(new PutObjectCommand({
    Bucket: r2Inputs.bucketName,
    Key: `submissions/${submissionId}/upload-session.json`,
    Body: JSON.stringify({ version: 1, submissionId, expiresAt, files }),
    ContentType: "application/json",
    CacheControl: "private, no-store",
  }));
  await archiveEvent(client, r2Inputs.bucketName, requestId, {
    submissionId,
    stage: "direct_upload_session_created",
    photoCount: files.length,
    totalBytes,
  });

  const uploads = await Promise.all(files.map(async (file) => ({
    key: file.key,
    url: await getSignedUrl(client, new PutObjectCommand({
      Bucket: r2Inputs.bucketName,
      Key: file.key,
      ContentType: file.contentType,
      CacheControl: "private, no-store",
    }), { expiresIn: Math.floor(sessionLifetimeMs / 1000) }),
  })));

  log(requestId, "direct_upload_session_created", { submissionId, photoCount: files.length, totalBytes });
  return { submissionId, expiresAt, uploads, requestId };
});
