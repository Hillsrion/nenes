import { ListObjectsV2Command, S3Client } from "@aws-sdk/client-s3";
import type { H3Event } from "h3";

type R2ModelsConnection = {
  bucketName: string;
  client: S3Client;
};

const getR2ModelsConnection = (event: H3Event): R2ModelsConnection | null => {
  const config = useRuntimeConfig(event);
  const configuredModels = config.r2Models || {};
  const accountId = String(
    process.env.NUXT_R2_MODELS_ACCOUNT_ID ||
      process.env.CLOUDFLARE_R2_3D_ACCOUNT_ID ||
      configuredModels.accountId ||
      ""
  );
  const bucketName = String(
    process.env.NUXT_R2_MODELS_BUCKET_NAME ||
      process.env.CLOUDFLARE_R2_3D_BUCKET_NAME ||
      configuredModels.bucketName ||
      "nenes-3d-models"
  );
  const accessKeyId = String(
    process.env.NUXT_R2_MODELS_ACCESS_KEY_ID ||
      process.env.CLOUDFLARE_R2_3D_ACCESS_KEY_ID ||
      configuredModels.accessKeyId ||
      ""
  );
  const secretAccessKey = String(
    process.env.NUXT_R2_MODELS_SECRET_ACCESS_KEY ||
      process.env.CLOUDFLARE_R2_3D_SECRET_ACCESS_KEY ||
      configuredModels.secretAccessKey ||
      ""
  );

  if (!accountId || !bucketName || !accessKeyId || !secretAccessKey) return null;

  return {
    bucketName,
    client: new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };
};

export const listPublishedR2ModelFiles = async (event: H3Event): Promise<string[]> => {
  const connection = getR2ModelsConnection(event);
  if (!connection) return [];

  const files: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await connection.client.send(
      new ListObjectsV2Command({
        Bucket: connection.bucketName,
        Prefix: "models/",
        ContinuationToken: continuationToken,
      })
    );

    for (const object of response.Contents || []) {
      const key = object.Key || "";
      const fileName = key.slice("models/".length);
      if (
        /^[a-z0-9][a-z0-9-]*(?:\/[a-z0-9][a-z0-9-]*)*\.glb$/i.test(fileName)
      ) {
        files.push(fileName);
      }
    }

    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return files.sort((left, right) => left.localeCompare(right, "fr"));
};
