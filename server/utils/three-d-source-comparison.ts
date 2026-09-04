import { extname } from "node:path";
import type { H3Event } from "h3";
import { readR2InputsJson, readR2InputsObject } from "./r2-inputs";

export const threeDModelManifestKey =
  process.env.NUXT_3D_MODEL_MANIFEST_KEY || "catalog/models.json";

export interface ThreeDModelClassification {
  fruitId: string;
  confidence?: number;
  classifier?: string;
  updatedAt: string;
}

export interface ThreeDModelManifestEntry {
  modelKey: string;
  source: {
    manifestKey: string;
    imageIndex: number;
    rotationY: number;
    label: string;
  };
  classification?: ThreeDModelClassification;
  generatedAt?: string;
  pipeline?: string;
}

export interface ThreeDModelManifest {
  version: 1;
  models: Record<string, ThreeDModelManifestEntry>;
}

interface SourceCollectionManifest {
  version: number;
  files: Array<{ key: string; contentType?: string }>;
}

const modelFilePattern = /^[a-zA-Z0-9][a-zA-Z0-9._-]*\.glb$/;
const supportedContentTypes = new Map([
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".png", "image/png"],
  [".webp", "image/webp"],
]);

export const isThreeDSourceComparisonEnabled = () =>
  process.env.NUXT_PUBLIC_ENABLE_3D_SOURCE_COMPARISON === "true";

export const assertThreeDModelFileName = (modelFileName: string) => {
  if (!modelFilePattern.test(modelFileName)) {
    throw createError({ statusCode: 400, statusMessage: "Nom de modèle invalide." });
  }
};

export const readThreeDModelManifest = async (event: H3Event) => {
  const manifest = await readR2InputsJson<ThreeDModelManifest>(
    event,
    threeDModelManifestKey
  );
  if (manifest.version !== 1 || !manifest.models || typeof manifest.models !== "object") {
    throw createError({ statusCode: 500, statusMessage: "Catalogue 3D R2 invalide." });
  }
  return manifest;
};

export const getThreeDModelManifestEntry = async (
  event: H3Event,
  modelFileName: string
) => {
  assertThreeDModelFileName(modelFileName);
  const manifest = await readThreeDModelManifest(event);
  return manifest.models[modelFileName] || null;
};

export const resolveThreeDSourceImage = async (
  event: H3Event,
  modelFileName: string
) => {
  const entry = await getThreeDModelManifestEntry(event, modelFileName);
  if (!entry) {
    throw createError({ statusCode: 404, statusMessage: "Modèle absent du catalogue R2." });
  }

  const collection = await readR2InputsJson<SourceCollectionManifest>(
    event,
    entry.source.manifestKey
  );
  const imageIndex = entry.source.imageIndex;
  if (!Number.isInteger(imageIndex) || imageIndex < 1) {
    throw createError({ statusCode: 500, statusMessage: "Index d’image source invalide." });
  }

  const image = collection.files?.[imageIndex - 1];
  if (!image?.key) {
    throw createError({ statusCode: 404, statusMessage: "Image absente du manifeste source." });
  }

  const object = await readR2InputsObject(event, image.key);
  const contentType =
    object.contentType ||
    image.contentType ||
    supportedContentTypes.get(extname(image.key).toLowerCase());
  if (!contentType?.startsWith("image/")) {
    throw createError({ statusCode: 415, statusMessage: "Format d’image non pris en charge." });
  }

  return {
    body: object.body,
    contentType,
    label: entry.source.label || "Photo source",
    rotationY: Number.isFinite(entry.source.rotationY) ? entry.source.rotationY : 0,
  };
};
