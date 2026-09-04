import { getHeader, readMultipartFormData, setResponseHeader } from "h3";
import { createHash, randomUUID } from "node:crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 12 * 1024 * 1024;
const maxPhotoCount = 4;

type UploadEvent = {
  requestId: string;
  submissionId?: string;
  stage: string;
  photoCount?: number;
  totalBytes?: number;
  reason?: string;
  statusCode?: number;
};

/**
 * Resolve the bucket name at runtime so it never gets embedded in the public
 * client configuration. The credentials below still limit access to this bucket.
 */
function resolveInputsConfig(config: ReturnType<typeof useRuntimeConfig>) {
  const configuredR2Inputs = config.r2Inputs || {};
  return {
    accountId: String(
      process.env.NUXT_R2_INPUTS_ACCOUNT_ID ||
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        configuredR2Inputs.accountId ||
        ""
    ).trim(),
    bucketName: String(
      process.env.NUXT_R2_INPUTS_BUCKET_NAME ||
        process.env.NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME ||
        process.env.CLOUDFLARE_R2_INPUTS_BUCKET_NAME ||
        configuredR2Inputs.bucketName ||
        "nenes-3d-inputs"
    ).trim(),
    accessKeyId: String(
      process.env.NUXT_R2_INPUTS_ACCESS_KEY_ID ||
        process.env.CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID ||
        configuredR2Inputs.accessKeyId ||
        ""
    ).trim(),
    secretAccessKey: String(
      process.env.NUXT_R2_INPUTS_SECRET_ACCESS_KEY ||
        process.env.CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY ||
        configuredR2Inputs.secretAccessKey ||
        ""
    ).trim(),
  };
}

function logUploadEvent(event: UploadEvent) {
  // Netlify retains function logs and exposes x-nf-request-id in its UI. Do not
  // include filenames, URLs, hashes or image content here: these uploads are
  // sensitive health-related photos.
  console.info("[3d-upload]", JSON.stringify(event));
}

async function archiveUploadEvent(
  client: S3Client,
  bucketName: string,
  event: UploadEvent
) {
  const date = new Date().toISOString().slice(0, 10);
  try {
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: `observability/3d-uploads/${date}/${event.requestId}.json`,
        Body: JSON.stringify({ version: 1, recordedAt: new Date().toISOString(), ...event }),
        ContentType: "application/json",
        CacheControl: "private, no-store",
      })
    );
  } catch (error) {
    // Observability must never reject a photo submission. The Netlify function
    // log remains available if the R2 token or bucket itself is unavailable.
    console.warn("[3d-upload]", JSON.stringify({
      requestId: event.requestId,
      stage: "r2_audit_write_failed",
      reason: error instanceof Error ? error.name : "unknown",
    }));
  }
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const r2Inputs = resolveInputsConfig(config);
  const requestId = getHeader(event, "x-nf-request-id") || getHeader(event, "x-request-id") || randomUUID();
  setResponseHeader(event, "x-3d-upload-request-id", requestId);

  if (
    !r2Inputs.accountId ||
    !r2Inputs.bucketName ||
    !r2Inputs.accessKeyId ||
    !r2Inputs.secretAccessKey
  ) {
    logUploadEvent({ requestId, stage: "configuration_unavailable", statusCode: 503 });
    throw createError({
      statusCode: 503,
      statusMessage:
        "Le service d’envoi n’est pas encore configuré sur ce déploiement.",
    });
  }

  let formData;
  try {
    formData = await readMultipartFormData(event);
  } catch (error) {
    logUploadEvent({ requestId, stage: "multipart_unreadable", reason: error instanceof Error ? error.name : "unknown", statusCode: 400 });
    throw createError({
      statusCode: 400,
      statusMessage: "Les photos n’ont pas pu être lues. Réessaie avec des fichiers JPEG, PNG ou WebP.",
    });
  }
  if (!formData) {
    logUploadEvent({ requestId, stage: "multipart_missing", statusCode: 400 });
    throw createError({
      statusCode: 400,
      statusMessage: "Le formulaire multipart est requis.",
    });
  }

  const photos = formData.filter(
    (part) => part.name === "photos" && Boolean(part.filename) && Boolean(part.type)
  );

  if (photos.length === 0 || photos.length > maxPhotoCount) {
    logUploadEvent({ requestId, stage: "invalid_photo_count", photoCount: photos.length, statusCode: 400 });
    throw createError({
      statusCode: 400,
      statusMessage: "Ajoute entre 1 et 4 photos.",
    });
  }

  for (const photo of photos) {
    if (!acceptedTypes.has(photo.type || "")) {
      logUploadEvent({ requestId, stage: "unsupported_type", photoCount: photos.length, statusCode: 415 });
      throw createError({
        statusCode: 415,
        statusMessage: "Les formats acceptés sont JPEG, PNG et WebP.",
      });
    }

    if (photo.data.byteLength === 0 || photo.data.byteLength > maxFileSize) {
      logUploadEvent({ requestId, stage: "invalid_photo_size", photoCount: photos.length, totalBytes: photo.data.byteLength, statusCode: 413 });
      throw createError({
        statusCode: 413,
        statusMessage: "Chaque photo doit faire au maximum 12 Mo.",
      });
    }
  }

  const submissionId = randomUUID();
  const totalBytes = photos.reduce((total, photo) => total + photo.data.byteLength, 0);
  logUploadEvent({ requestId, submissionId, stage: "received", photoCount: photos.length, totalBytes });
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Inputs.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Inputs.accessKeyId,
      secretAccessKey: r2Inputs.secretAccessKey,
    },
  });
  await archiveUploadEvent(client, r2Inputs.bucketName, {
    requestId,
    submissionId,
    stage: "received",
    photoCount: photos.length,
    totalBytes,
  });

  const uploadedFiles = await Promise.all(
    photos.map(async (photo, index) => {
      const contentType = photo.type || "application/octet-stream";
      const extension = acceptedTypes.get(contentType) || "bin";
      const key = `submissions/${submissionId}/images/input-${String(index + 1).padStart(3, "0")}.${extension}`;
      try {
        await client.send(
          new PutObjectCommand({
            Bucket: r2Inputs.bucketName,
            Key: key,
            Body: photo.data,
            ContentType: contentType,
            CacheControl: "private, no-store",
          })
        );
        return {
          key,
          sha256: createHash("sha256").update(photo.data).digest("hex"),
          bytes: photo.data.byteLength,
          contentType,
        };
      } catch (error) {
        const uploadEvent = {
          requestId,
          submissionId,
          stage: "r2_photo_write_failed",
          photoCount: photos.length,
          totalBytes,
          reason: error instanceof Error ? error.name : "unknown",
          statusCode: 502,
        };
        logUploadEvent(uploadEvent);
        await archiveUploadEvent(client, r2Inputs.bucketName, uploadEvent);
        throw createError({
          statusCode: 502,
          statusMessage: "Le stockage sécurisé est momentanément indisponible. Réessaie dans quelques minutes en indiquant la référence affichée.",
        });
      }
    })
  );

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: r2Inputs.bucketName,
        Key: `submissions/${submissionId}/manifest.json`,
        Body: JSON.stringify({ version: 1, collectionId: submissionId, files: uploadedFiles }, null, 2),
        ContentType: "application/json",
        CacheControl: "private, no-store",
      })
    );
  } catch (error) {
    const uploadEvent = {
      requestId,
      submissionId,
      stage: "r2_manifest_write_failed",
      photoCount: photos.length,
      totalBytes,
      reason: error instanceof Error ? error.name : "unknown",
      statusCode: 502,
    };
    logUploadEvent(uploadEvent);
    await archiveUploadEvent(client, r2Inputs.bucketName, uploadEvent);
    throw createError({
      statusCode: 502,
      statusMessage: "Le service d’envoi n’a pas pu finaliser la soumission.",
    });
  }

  const completedEvent = { requestId, submissionId, stage: "completed", photoCount: photos.length, totalBytes };
  logUploadEvent(completedEvent);
  await archiveUploadEvent(client, r2Inputs.bucketName, completedEvent);

  return {
    submissionId,
    photoCount: photos.length,
    status: "received",
    requestId,
  };
});
