export const defaultBustModel = {
  label: "Modèle de référence multivue",
  fileName: "bust-multiview-v2-symptoms.glb",
} as const;

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

export const bustModelCatalog = [
  {
    id: "reference-multiview-v2",
    label: defaultBustModel.label,
    shortLabel: "Référence multivue",
    description: "Reconstruction de référence produite à partir de plusieurs angles cohérents.",
    fileName: defaultBustModel.fileName,
    badge: "Référence",
  },
  {
    id: "single-photo-v1",
    label: "Buste mono-image · version historique",
    shortLabel: "Photo unique · historique",
    description: "Version historique générée depuis une seule image avec le préréglage validé.",
    fileName: "bust-photo-symptoms.glb",
    badge: "Mono-image",
  },
  ...bustFruitModels.map((model) => ({
    id: `volume-${model.id}`,
    label: model.modelLabel,
    shortLabel: `${model.emoji} ${model.fruit}`,
    description: `Repère visuel de volume ${model.sizeLabel.toLowerCase()}.`,
    fileName: model.fileName,
    badge: model.sizeLabel,
  })),
] as const;

export type BustModelCatalogEntry = (typeof bustModelCatalog)[number];
