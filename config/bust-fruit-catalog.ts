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

/** The three journey choices share the stable volume catalog filenames. */
export const journeyFruitChoices = [
  { ...bustFruitModels[0], modelBinding: "", visualScale: 0.43 },
  { ...bustFruitModels[1], modelBinding: "bust-anais-full-hi3d-palpation.glb", visualScale: 0.60 },
  { ...bustFruitModels[2], modelBinding: "bust-zou-full-multiview-hi3d-palpation.glb", visualScale: 0.79 },
] as const;
export type JourneyFruitId = (typeof journeyFruitChoices)[number]["id"];

export function resolveJourneyFruitModel(
  id: JourneyFruitId,
  availableFiles: readonly string[],
  fallbackFile: string,
) {
  const choice = journeyFruitChoices.find(choice => choice.id === id)!;
  if (availableFiles.includes(choice.fileName)) return choice.fileName;
  if (choice.modelBinding && availableFiles.includes(choice.modelBinding)) return choice.modelBinding;
  return fallbackFile;
}
