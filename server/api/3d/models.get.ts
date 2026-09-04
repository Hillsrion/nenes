import {
  bustFruitModels,
  hiddenBustModelFiles,
  referenceBustModels,
  type BustModelCatalogEntry,
} from "~/config/bust-models";
import { listPublishedR2ModelFiles } from "~/server/utils/r2-models";

const fruitModelsByFile = new Map(
  bustFruitModels.map((model) => [model.fileName, model])
);
const referenceFiles = new Set(referenceBustModels.map((model) => model.fileName));

const humanizeModelName = (fileName: string) =>
  fileName
    .replace(/^bust-/, "")
    .replace(/\.glb$/i, "")
    .replace(/-(?:symptoms?|final|v\d+)$/i, "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const toCatalogEntry = (fileName: string): BustModelCatalogEntry => {
  const fruitModel = fruitModelsByFile.get(fileName);
  if (fruitModel) {
    return {
      id: `volume-${fruitModel.id}`,
      label: fruitModel.modelLabel,
      shortLabel: `${fruitModel.emoji} ${fruitModel.fruit}`,
      description: `Repère visuel de volume ${fruitModel.sizeLabel.toLowerCase()}.`,
      fileName,
      badge: fruitModel.sizeLabel,
    };
  }

  const name = humanizeModelName(fileName) || "Modèle publié";
  return {
    id: `published-${fileName.replace(/\.glb$/i, "").replaceAll("/", "-")}`,
    label: name,
    shortLabel: name,
    description: "Modèle généré et publié dans la bibliothèque 3D.",
    fileName,
    badge: "Publié",
  };
};

export default defineEventHandler(async (event) => {
  try {
    const files = await listPublishedR2ModelFiles(event);
    setResponseHeader(event, "Cache-Control", "private, max-age=60");

    return files
      .filter((fileName) => !referenceFiles.has(fileName))
      .filter((fileName) => !hiddenBustModelFiles.has(fileName))
      .map(toCatalogEntry);
  } catch (error) {
    console.error("[3d-model-catalog] Unable to list published R2 models", error);
    throw createError({
      statusCode: 503,
      statusMessage: "Le catalogue des modèles publiés est temporairement indisponible.",
    });
  }
});
