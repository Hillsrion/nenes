import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import type { H3Event } from "h3";

type R2InputsConnection = {
  mode: "s3";
  bucketName: string;
  client: S3Client;
} | {
  mode: "wrangler";
  bucketName: string;
};

const runWrangler = (arguments_: string[]) =>
  new Promise<void>((resolvePromise, reject) => {
    const binary = resolve(process.cwd(), "node_modules", ".bin", "wrangler");
    const child = spawn(binary, arguments_, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let output = "";
    child.stdout.on("data", (chunk) => { output += chunk.toString(); });
    child.stderr.on("data", (chunk) => { output += chunk.toString(); });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code === 0) resolvePromise();
      else reject(new Error(output.trim() || `Wrangler a quitté avec le code ${code}.`));
    });
  });

const bodyToBuffer = async (body: unknown): Promise<Buffer> => {
  if (!body) {
    throw createError({ statusCode: 404, statusMessage: "Objet R2 introuvable." });
  }

  if (body instanceof Uint8Array) return Buffer.from(body);
  const transformToByteArray = (body as {
    transformToByteArray?: () => Promise<Uint8Array>;
  }).transformToByteArray;
  if (transformToByteArray) return Buffer.from(await transformToByteArray.call(body));

  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

export const getR2InputsConnection = (event: H3Event): R2InputsConnection => {
  const config = useRuntimeConfig(event);
  const configuredR2Inputs = config.r2Inputs || {};
  const accountId = String(
    process.env.NUXT_R2_INPUTS_ACCOUNT_ID ||
      process.env.CLOUDFLARE_ACCOUNT_ID ||
      configuredR2Inputs.accountId ||
      ""
  );
  const bucketName = String(
    process.env.NUXT_PUBLIC_R2_INPUTS_BUCKET_NAME ||
      process.env.CLOUDFLARE_R2_INPUTS_BUCKET_NAME ||
      process.env.NUXT_R2_INPUTS_BUCKET_NAME ||
      configuredR2Inputs.bucketName ||
      "nenes-3d-inputs"
  );
  const accessKeyId = String(
    process.env.NUXT_R2_INPUTS_ACCESS_KEY_ID ||
      process.env.CLOUDFLARE_R2_INPUTS_ACCESS_KEY_ID ||
      configuredR2Inputs.accessKeyId ||
      ""
  );
  const secretAccessKey = String(
    process.env.NUXT_R2_INPUTS_SECRET_ACCESS_KEY ||
      process.env.CLOUDFLARE_R2_INPUTS_SECRET_ACCESS_KEY ||
      configuredR2Inputs.secretAccessKey ||
      ""
  );

  if (accountId && bucketName && accessKeyId && secretAccessKey) {
    return {
      mode: "s3",
      bucketName,
      client: new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: { accessKeyId, secretAccessKey },
      }),
    };
  }

  if (process.env.NODE_ENV === "development") {
    return { mode: "wrangler", bucketName };
  }

  {
    throw createError({
      statusCode: 503,
      statusMessage: "Le bucket privé des entrées 3D n’est pas configuré.",
    });
  }
};

export const readR2InputsObject = async (event: H3Event, key: string) => {
  const connection = getR2InputsConnection(event);
  if (connection.mode === "wrangler") {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "nenes-r2-read-"));
    const outputPath = join(temporaryDirectory, "object");
    try {
      await runWrangler([
        "r2",
        "object",
        "get",
        `${connection.bucketName}/${key}`,
        "--file",
        outputPath,
        "--remote",
      ]);
      return { body: await readFile(outputPath), contentType: undefined, etag: undefined };
    } catch {
      throw createError({ statusCode: 502, statusMessage: "Wrangler n’a pas pu lire R2." });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  try {
    const response = await connection.client.send(
      new GetObjectCommand({ Bucket: connection.bucketName, Key: key })
    );
    return {
      body: await bodyToBuffer(response.Body),
      contentType: response.ContentType,
      etag: response.ETag,
    };
  } catch (error) {
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } }).$metadata
      ?.httpStatusCode;
    if (statusCode === 404) {
      throw createError({ statusCode: 404, statusMessage: "Objet R2 introuvable." });
    }
    throw error;
  }
};

export const readR2InputsJson = async <T>(event: H3Event, key: string): Promise<T> => {
  const object = await readR2InputsObject(event, key);
  try {
    return JSON.parse(object.body.toString("utf8")) as T;
  } catch {
    throw createError({ statusCode: 500, statusMessage: "Le manifeste R2 est invalide." });
  }
};

export const writeR2InputsJson = async (
  event: H3Event,
  key: string,
  value: unknown
) => {
  const connection = getR2InputsConnection(event);
  const serialized = `${JSON.stringify(value, null, 2)}\n`;
  if (connection.mode === "wrangler") {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "nenes-r2-write-"));
    const inputPath = join(temporaryDirectory, "object.json");
    try {
      await writeFile(inputPath, serialized, "utf8");
      await runWrangler([
        "r2",
        "object",
        "put",
        `${connection.bucketName}/${key}`,
        "--file",
        inputPath,
        "--content-type",
        "application/json",
        "--remote",
      ]);
      return;
    } catch {
      throw createError({ statusCode: 502, statusMessage: "Wrangler n’a pas pu écrire dans R2." });
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  }

  await connection.client.send(
    new PutObjectCommand({
      Bucket: connection.bucketName,
      Key: key,
      Body: serialized,
      ContentType: "application/json",
      CacheControl: "private, no-store",
    })
  );
};
