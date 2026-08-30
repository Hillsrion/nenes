import { timingSafeEqual } from "node:crypto";

const acceptedTypes = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);
const maxFileSize = 12 * 1024 * 1024;
const maxPhotoCount = 4;

function objectUrl(accountId: string, bucketName: string, key: string) {
  const encodedKey = key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  return `https://api.cloudflare.com/client/v4/accounts/${encodeURIComponent(accountId)}/r2/buckets/${encodeURIComponent(bucketName)}/objects/${encodedKey}`;
}

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
    !r2Inputs.apiToken ||
    !r2Inputs.uploadAccessCode
  ) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Le dépôt photo privé n’est pas encore configuré sur ce déploiement.",
    });
  }

  const formData = await event.request.formData();
  const accessCode = String(formData.get("accessCode") || "");
  const consent = formData.get("consent");
  const photos = formData
    .getAll("photos")
    .filter((value): value is File => value instanceof File);

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
    if (!acceptedTypes.has(photo.type)) {
      throw createError({
        statusCode: 415,
        statusMessage: "Les formats acceptés sont JPEG, PNG et WebP.",
      });
    }

    if (photo.size === 0 || photo.size > maxFileSize) {
      throw createError({
        statusCode: 413,
        statusMessage: "Chaque photo doit faire au maximum 12 Mo.",
      });
    }
  }

  const submissionId = crypto.randomUUID();

  await Promise.all(
    photos.map(async (photo, index) => {
      const extension = acceptedTypes.get(photo.type) || "bin";
      const key = `submissions/${submissionId}/input-${String(index + 1).padStart(2, "0")}.${extension}`;
      const response = await fetch(objectUrl(r2Inputs.accountId, r2Inputs.bucketName, key), {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${r2Inputs.apiToken}`,
          "Content-Type": photo.type,
          "Cache-Control": "private, no-store",
        },
        body: Buffer.from(await photo.arrayBuffer()),
      });

      if (!response.ok) {
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
