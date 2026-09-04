import { getHeader, readBody, setResponseHeader } from "h3";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

type UploadSession = {
  version: 1;
  submissionId: string;
  expiresAt: string;
  files: Array<{ key: string; bytes: number; contentType: string }>;
};

function resolveInputsConfig(config: ReturnType<typeof useRuntimeConfig>) {
  const configured = config.r2Inputs || {};
  return {
    accountId: String(process.env.NUXT_R2_INPUTS_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || configured.accountId || "").trim(),
    bucketName: String(process.env.NUXT_R2_INPUTS_BUCKET_NAME || process.env.NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME || process.env.CLOUDFLARE_R2_INPUTS_BUCKET_NAME || configured.bucketName || "nenes-3d-inputs").trim(),
    accessKeyId: String(process.env.NUXT_R2_INPUTS_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID || configured.accessKeyId || "").trim(),
    secretAccessKey: String(process.env.NUXT_R2_INPUTS_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY || configured.secretAccessKey || "").trim(),
  };
}

async function bodyToString(body: unknown): Promise<string> {
  if (!body) throw new Error("R2 a renvoyé une session vide.");
  const transformToString = (body as { transformToString?: () => Promise<string> }).transformToString;
  if (transformToString) return transformToString.call(body);
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) chunks.push(Buffer.from(chunk));
  return Buffer.concat(chunks).toString("utf8");
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
  const submissionId = String(event.context.params?.id || "");
  const requestId = getHeader(event, "x-nf-request-id") || getHeader(event, "x-request-id") || crypto.randomUUID();
  setResponseHeader(event, "x-3d-upload-request-id", requestId);
  if (!/^[0-9a-f-]{36}$/i.test(submissionId)) throw createError({ statusCode: 400, statusMessage: "Référence d’envoi invalide." });
  const r2Inputs = resolveInputsConfig(useRuntimeConfig(event));
  if (!r2Inputs.accountId || !r2Inputs.bucketName || !r2Inputs.accessKeyId || !r2Inputs.secretAccessKey) {
    throw createError({ statusCode: 503, statusMessage: "Le service d’envoi n’est pas encore configuré sur ce déploiement." });
  }
  await readBody(event).catch(() => undefined);

  const client = new S3Client({
    region: "auto",
    endpoint: `https://${r2Inputs.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: r2Inputs.accessKeyId, secretAccessKey: r2Inputs.secretAccessKey },
  });
  let session: UploadSession;
  try {
    const response = await client.send(new GetObjectCommand({ Bucket: r2Inputs.bucketName, Key: `submissions/${submissionId}/upload-session.json` }));
    session = JSON.parse(await bodyToString(response.Body)) as UploadSession;
  } catch {
    throw createError({ statusCode: 404, statusMessage: "Cette session d’envoi est introuvable ou a expiré." });
  }
  if (session.version !== 1 || session.submissionId !== submissionId || !Array.isArray(session.files) || Date.parse(session.expiresAt) < Date.now()) {
    throw createError({ statusCode: 400, statusMessage: "Cette session d’envoi a expiré. Réessaie depuis le formulaire." });
  }

  for (const file of session.files) {
    try {
      const response = await client.send(new HeadObjectCommand({ Bucket: r2Inputs.bucketName, Key: file.key }));
      if (response.ContentLength !== file.bytes || response.ContentType !== file.contentType) throw new Error("Métadonnées inattendues");
    } catch {
      throw createError({ statusCode: 400, statusMessage: "Une ou plusieurs photos n’ont pas été reçues. Réessaie l’envoi." });
    }
  }
  const totalBytes = session.files.reduce((total, file) => total + file.bytes, 0);
  await client.send(new PutObjectCommand({
    Bucket: r2Inputs.bucketName,
    Key: `submissions/${submissionId}/manifest.json`,
    Body: JSON.stringify({ version: 1, collectionId: submissionId, files: session.files }, null, 2),
    ContentType: "application/json",
    CacheControl: "private, no-store",
  }));
  await client.send(new DeleteObjectCommand({ Bucket: r2Inputs.bucketName, Key: `submissions/${submissionId}/upload-session.json` }));
  await archiveEvent(client, r2Inputs.bucketName, requestId, {
    submissionId,
    stage: "direct_upload_completed",
    photoCount: session.files.length,
    totalBytes,
  });
  console.info("[3d-upload]", JSON.stringify({ requestId, submissionId, stage: "direct_upload_completed", photoCount: session.files.length, totalBytes }));
  return { submissionId, photoCount: session.files.length, status: "received", requestId };
});
