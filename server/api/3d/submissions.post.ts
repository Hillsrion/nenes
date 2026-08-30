import { timingSafeEqual } from "node:crypto";
import { readMultipartFormData } from "h3";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 12 * 1024 * 1024;
const maxPhotoCount = 4;

function hasMatchingAccessCode(received: string, expected: string) {
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);

  return (
    receivedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig(event);
  const r2Inputs = config.r2Inputs;

  if (
    !r2Inputs.accountId ||
    !r2Inputs.accessKeyId ||
    !r2Inputs.secretAccessKey ||
    !r2Inputs.uploadAccessCode
  ) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Le dépôt photo privé n’est pas encore configuré sur ce déploiement.",
    });
  }

  const formData = await readMultipartFormData(event);
  if (!formData) {
    throw createError({
      statusCode: 400,
      statusMessage: "Le formulaire multipart est requis.",
    });
  }

  const accessCode = String(
    formData.find((part) => part.name === "accessCode")?.data.toString() || ""
  );
  const consent = formData.find((part) => part.name === "consent")?.data.toString();
  const photos = formData.filter(
    (part) => part.name === "photos" && Boolean(part.filename) && Boolean(part.type)
  );

  if (!hasMatchingAccessCode(accessCode, r2Inputs.uploadAccessCode)) {
    throw createError({ statusCode: 401, statusMessage: "Code d’accès invalide." });
  }

  if (consent !== "true") {
    throw createError({
      statusCode: 400,
      statusMessage: "Le consentement explicite est requis.",
    });
  }

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
          statusMessage: "Le dépôt privé a refusé l’une des photos.",
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
