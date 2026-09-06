export const defaultBustModel = {
  label: "Modèle de référence multivue",
  fileName: "bust-multiview-v2-symptoms.glb",
} as const;

export interface BustModelCatalogEntry {
  id: string;
  label: string;
  shortLabel: string;
  description: string;
  fileName: string;
  badge: string;
}

export const bustFruitModels = [
  {
    id: "citron",
    fruit: "Citron",
    emoji: "🍋",
    sizeLabel: "Très petit",
    modelLabel: "Poitrine · Citron",
    fileName: "bust-citron.glb",
  },
  {
    id: "orange",
    fruit: "Orange",
    emoji: "🍊",
    sizeLabel: "Petit",
    modelLabel: "Poitrine · Orange",
    fileName: "bust-orange.glb",
  },
  {
    id: "pamplemousse",
    fruit: "Pamplemousse",
    emoji: "🟠",
    sizeLabel: "Moyen",
    modelLabel: "Poitrine · Pamplemousse",
    fileName: "bust-pamplemousse.glb",
  },
  {
    id: "melon",
    fruit: "Melon",
    emoji: "🍈",
    sizeLabel: "Grand",
    modelLabel: "Poitrine · Melon",
    fileName: "bust-melon.glb",
  },
  {
    id: "pasteque",
    fruit: "Pastèque",
    emoji: "🍉",
    sizeLabel: "Très grand",
    modelLabel: "Poitrine · Pastèque",
    fileName: "bust-pasteque.glb",
  },
] as const;

export type BustFruitId = (typeof bustFruitModels)[number]["id"];

export const referenceBustModels = [
  {
    id: "reference-multiview-v2",
    label: defaultBustModel.label,
    shortLabel: "Référence multivue",
    description: "Reconstruction de référence produite à partir de plusieurs angles cohérents.",
    fileName: defaultBustModel.fileName,
    badge: "Bucket · Multi",
  },
  {
    id: "reference-front-single-v1",
    label: "Référence · mono-image",
    shortLabel: "Référence · mono-image",
    description:
      "Même vue de face que la référence multivue, générée avec Hunyuan3D mono-image.",
    fileName: "bust-reference-front-single-symptoms.glb",
    badge: "Bucket · Mono",
  },
] satisfies readonly BustModelCatalogEntry[];

// Published photo-derived models that must remain visible even when the
// server-side R2 listing is unavailable in a local or public deployment.
export const publishedBustModels = [
  {
    id: "mathilde-monoview",
    label: "Mathilde · monovue Hunyuan3D",
    shortLabel: "Mathilde · monovue",
    description: "Reconstruction générée à partir d’une vue avec Hunyuan3D.",
    fileName: "bust-mathilde-monoview.glb",
    badge: "Bucket · Mono",
  },
  {
    id: "mathilde-multiview",
    label: "Mathilde · multivue Hunyuan3D",
    shortLabel: "Mathilde · multivue",
    description: "Reconstruction générée à partir de quatre vues avec Hunyuan3D.",
    fileName: "bust-mathilde-multiview.glb",
    badge: "Bucket · Multi",
  },
] satisfies readonly BustModelCatalogEntry[];

export const fixedBustModelFiles = new Set(
  [...referenceBustModels, ...publishedBustModels].map((model) => model.fileName)
);

// This legacy GLB remains in R2 for backwards compatibility, but should no
// longer be offered in the catalogue.
export const hiddenBustModelFiles = new Set(["bust-photo-symptoms.glb"]);
