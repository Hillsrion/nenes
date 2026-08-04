export const defaultBustModel = {
  label: "Modèle de référence",
  fileName: "bust-photo-symptoms.glb",
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
