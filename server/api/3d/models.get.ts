import { readdir } from "node:fs/promises";
import path from "node:path";
import {
  bustFruitModels,
  fixedBustModelFiles,
  hiddenBustModelFiles,
  type BustModelCatalogEntry,
} from "~/config/bust-models";
import { listPublishedR2ModelFiles } from "~/server/utils/r2-models";

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
  source: "local" | "published" = "published"
): BustModelCatalogEntry => {
  const fruitModel = fruitModelsByFile.get(fileName);
  if (fruitModel) {
    return {
      id: `volume-${fruitModel.id}`,
      label: fruitModel.modelLabel,
      shortLabel: `${fruitModel.emoji} ${fruitModel.fruit}`,
      description: `Repère visuel de volume ${fruitModel.sizeLabel.toLowerCase()}.`,
      fileName,
      badge: `Bucket · ${fruitModel.sizeLabel}`,
    };
  }

  const name = humanizeModelName(fileName) || "Modèle publié";
  return {
    id: `published-${fileName.replace(/\.glb$/i, "").replaceAll("/", "-")}`,
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
    const localFileNames = new Set(localFiles);
    const files = [...new Set([...localFiles, ...publishedFiles])];
    setResponseHeader(event, "Cache-Control", "private, max-age=60");

    return files
      .filter((fileName) => !fixedBustModelFiles.has(fileName))
      .filter((fileName) => !hiddenBustModelFiles.has(fileName))
      .map((fileName) =>
        toCatalogEntry(fileName, localFileNames.has(fileName) ? "local" : "published")
      );
  } catch (error) {
    console.error("[3d-model-catalog] Unable to list published R2 models", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Le catalogue des modèles publiés est temporairement indisponible.",
    });
  }
});
