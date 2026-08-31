import { readMultipartFormData } from "h3";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 12 * 1024 * 1024;
const maxPhotoCount = 4;

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const configuredR2Inputs = config.r2Inputs || {};
  const r2Inputs = {
    accountId: String(
      configuredR2Inputs.accountId ||
        process.env.NUXT_R2_INPUTS_ACCOUNT_ID ||
        process.env.CLOUDFLARE_ACCOUNT_ID ||
        ""
    ),
    bucketName: String(
      configuredR2Inputs.bucketName ||
        process.env.NUXT_R2_INPUTS_BUCKET_NAME ||
        process.env.CLOUDFLARE_R2_INPUTS_BUCKET_NAME ||
        "nenes-3d-inputs"
    ),
    accessKeyId: String(
      configuredR2Inputs.accessKeyId ||
        process.env.NUXT_R2_INPUTS_ACCESS_KEY_ID ||
        process.env.CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID ||
        ""
    ),
    secretAccessKey: String(
      configuredR2Inputs.secretAccessKey ||
        process.env.NUXT_R2_INPUTS_SECRET_ACCESS_KEY ||
        process.env.CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY ||
        ""
    ),
  };

  if (
    !r2Inputs.accountId ||
    !r2Inputs.accessKeyId ||
    !r2Inputs.secretAccessKey
  ) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Le service d’envoi n’est pas encore configuré sur ce déploiement.",
    });
  }

  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le formulaire multipart est requis.",
    });
  }

  const photos = formData.filter(
    (part) => part.name === "photos" && Boolean(part.filename) && Boolean(part.type)
  );

  if (photos.length === 0 || photos.length > maxPhotoCount) {
    throw createError({
      statusCode: 400,
      statusMessage: "Ajoute entre 1 et 4 photos.",
    });
  }

  for (const photo of photos) {
    if (!acceptedTypes.has(photo.type || "")) {
      throw createError({
        statusCode: 415,
        statusMessage: "Les formats acceptés sont JPEG, PNG et WebP.",
      });
    }

    if (photo.data.byteLength === 0 || photo.data.byteLength > maxFileSize) {
      throw createError({
        statusCode: 413,
        statusMessage: "Chaque photo doit faire au maximum 12 Mo.",
      });
    }
  }

  const submissionId = crypto.randomUUID();
  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Inputs.accountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2Inputs.accessKeyId,
      secretAccessKey: r2Inputs.secretAccessKey,
    },
  });

  await Promise.all(
    photos.map(async (photo, index) => {
      const contentType = photo.type || "application/octet-stream";
      const extension = acceptedTypes.get(contentType) || "bin";
      const key = `submissions/${submissionId}/input-${String(index + 1).padStart(2, "0")}.${extension}`;
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
      } catch {
        throw createError({
          statusCode: 502,
          statusMessage: "Le service d’envoi a refusé l’une des photos.",
        });
      }
    })
  );

  return {
    submissionId,
    photoCount: photos.length,
    status: "received",
  };
});
