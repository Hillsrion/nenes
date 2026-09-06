import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  bustFruitModels,
} from "~/config/bust-fruit-catalog";
import type { BustModelCatalogEntry } from "~/types/3d-models";
import { listPublishedR2ModelFiles } from "~/server/utils/r2-models";

const hiddenBustModelFiles = new Set(
  String(process.env.NUXT_3D_HIDDEN_MODEL_FILES || "")
    .split(",")
    .map((fileName) => fileName.trim())
    .filter(Boolean)
);

const fruitModelsByFile = new Map(
  bustFruitModels.map((model) => [model.fileName, model])
);

const listLocalModelFiles = async (): Promise<string[]> => {
  if (!import.meta.dev) return [];

  const modelsDirectory = path.join(process.cwd(), "public", "models");
  const entries = await readdir(modelsDirectory, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((fileName) => /^[a-z0-9][a-z0-9-]*\.glb$/i.test(fileName))
    .filter((fileName) => !/-base\.glb$/i.test(fileName))
    .filter((fileName) => !/-test\.glb$/i.test(fileName));
};

const getViewModeLabel = (fileName: string) => {
  if (/(?:multi|multiview)/i.test(fileName)) return "Multi";
  if (/(?:mono|single|front)/i.test(fileName)) return "Mono";
  return "3D";
};

const humanizeModelName = (fileName: string) =>
  fileName
    .replace(/^bust-/, "")
    .replace(/\.glb$/i, "")
    .replace(/-(?:symptoms?|final|v\d+)$/i, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toCatalogEntry = (
  fileName: string,
  source: "local" | "bucket" = "bucket"
): BustModelCatalogEntry => {
  const fruitModel = fruitModelsByFile.get(fileName);
  if (fruitModel) {
    return {
      id: `${source}-volume-${fruitModel.id}`,
      label: fruitModel.modelLabel,
      shortLabel: `${fruitModel.emoji} ${fruitModel.fruit}`,
      description: `Repère visuel de volume ${fruitModel.sizeLabel.toLowerCase()}.`,
      fileName,
      badge: `${source === "local" ? "Local" : "Bucket"} · ${fruitModel.sizeLabel}`,
    };
  }

  const name = humanizeModelName(fileName) || "Modèle 3D";
  return {
    id: `model-${fileName.replace(/\.glb$/i, "").replaceAll("/", "-")}`,
    label: name,
    shortLabel: name,
    description:
      source === "local"
        ? "Modèle généré disponible localement dans la bibliothèque 3D."
        : "Modèle généré et publié dans la bibliothèque 3D.",
    fileName,
    badge: `${source === "local" ? "Local" : "Bucket"} · ${getViewModeLabel(fileName)}`,
  };
};

export default defineEventHandler(async (event) => {
  try {
    const [localFiles, publishedFiles] = await Promise.all([
      listLocalModelFiles(),
      listPublishedR2ModelFiles(event),
    ]);
    const visibleFileName = (fileName: string) => !hiddenBustModelFiles.has(fileName);
    const localEntries = [...new Set(localFiles)]
      .filter(visibleFileName)
      .map((fileName) => toCatalogEntry(fileName, "local"));
    const bucketEntries = [...new Set(publishedFiles)]
      .filter(visibleFileName)
      .map((fileName) => toCatalogEntry(fileName, "bucket"));
    setResponseHeader(event, "Cache-Control", "private, max-age=60");

    return [...localEntries, ...bucketEntries];
  } catch (error) {
    console.error("[3d-model-catalog] Unable to list published R2 models", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Le catalogue des modèles est temporairement indisponible.",
    });
  }
});
