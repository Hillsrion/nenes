export const bustFruitModels = [
  {
    id: "citron",
    fruit: "Citron",
    emoji: "🍋",
    sizeLabel: "Petit",
    modelLabel: "Poitrine · Citron",
    fileName: "bust-citron.glb",
  },
  {
    id: "orange",
    fruit: "Orange",
    emoji: "🍊",
    sizeLabel: "Moyen",
    modelLabel: "Poitrine · Orange",
    fileName: "bust-orange.glb",
  },
  {
    id: "pamplemousse",
    fruit: "Pamplemousse",
    emoji: "🟠",
    sizeLabel: "Gros",
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

/** The journey offers the medium and large volumes from the stable catalog. */
export const journeyFruitChoices = [
  { ...bustFruitModels[1], modelBinding: "bust-anais-full-hi3d-palpation.glb", visualScale: 0.60 },
  { ...bustFruitModels[2], modelBinding: "bust-zou-full-multiview-hi3d-palpation.glb", visualScale: 0.79 },
] as const;
export type JourneyFruitId = (typeof journeyFruitChoices)[number]["id"];

export function resolveJourneyFruitModel(
  id: BustFruitId,
  availableFiles: readonly string[],
  fallbackFile: string,
) {
  const choice = bustFruitModels.find(choice => choice.id === id)!;
  if (availableFiles.includes(choice.fileName)) return choice.fileName;
  const binding = journeyFruitChoices.find(choice => choice.id === id)?.modelBinding;
  if (binding && availableFiles.includes(binding)) return binding;
  return fallbackFile;
}
