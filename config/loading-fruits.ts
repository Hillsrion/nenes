export interface LoadingFruitDefinition {
  name: string;
  emoji: string;
  modelUrl: string;
  nodeName?: string;
  color: string;
  highlight: string;
  roughness?: number;
  normalStrength?: number;
  rotation?: [number, number, number];
  scale?: number;
}

const modelRoot = "/3d/fruits/polyhaven";

export const loadingFruitSequence: LoadingFruitDefinition[] = [
  {
    name: "citron",
    emoji: "🍋",
    modelUrl: `${modelRoot}/lemon/lemon_1k.gltf`,
    color: "#f5cf38",
    highlight: "#fff3a7",
    roughness: 0.62,
    normalStrength: 0.34,
  },
  {
    name: "pomme",
    emoji: "🍎",
    modelUrl: `${modelRoot}/food_apple_01/food_apple_01_1k.gltf`,
    color: "#dc5965",
    highlight: "#ffb09e",
    roughness: 0.48,
    normalStrength: 0.22,
  },
  {
    name: "kiwi",
    emoji: "🥝",
    modelUrl: `${modelRoot}/food_kiwi_01/food_kiwi_01_1k.gltf`,
    color: "#9a744c",
    highlight: "#dfbd86",
    roughness: 0.72,
    normalStrength: 0.38,
  },
  {
    name: "régime de bananes",
    emoji: "🍌",
    modelUrl: `${modelRoot}/bananas/bananas_1k.gltf`,
    nodeName: "bananas_bunch",
    color: "#efc94c",
    highlight: "#fff0a4",
    roughness: 0.54,
    normalStrength: 0.2,
    rotation: [0.08, -0.2, -0.18],
    scale: 1.08,
  },
  {
    name: "avocat",
    emoji: "🥑",
    modelUrl: `${modelRoot}/food_avocado_01/food_avocado_01_1k.gltf`,
    color: "#557b4d",
    highlight: "#b9ce82",
    roughness: 0.66,
    normalStrength: 0.32,
  },
  {
    name: "litchi",
    emoji: "🔴",
    modelUrl: `${modelRoot}/food_lychee_01/food_lychee_01_1k.gltf`,
    color: "#df7586",
    highlight: "#ffc6bd",
    roughness: 0.68,
    normalStrength: 0.42,
  },
  {
    name: "grenade",
    emoji: "🔴",
    modelUrl: `${modelRoot}/food_pomegranate_01/food_pomegranate_01_1k.gltf`,
    color: "#c84260",
    highlight: "#ff9a8c",
    roughness: 0.5,
    normalStrength: 0.24,
  },
  {
    name: "poire nashi",
    emoji: "🍐",
    modelUrl: `${modelRoot}/food_pears_asian_01/food_pears_asian_01_1k.gltf`,
    nodeName: "food_pears_asian_01_d",
    color: "#a7c95f",
    highlight: "#eff3aa",
    roughness: 0.58,
    normalStrength: 0.22,
    scale: 1.12,
  },
  {
    name: "citron vert",
    emoji: "🟢",
    modelUrl: `${modelRoot}/food_lime_01/food_lime_01_1k.gltf`,
    color: "#75b94d",
    highlight: "#d8ec86",
    roughness: 0.62,
    normalStrength: 0.34,
  },
  {
    name: "orange",
    emoji: "🍊",
    modelUrl: `${modelRoot}/food_lime_01/food_lime_01_1k.gltf`,
    color: "#ed762f",
    highlight: "#ffc16f",
    roughness: 0.64,
    normalStrength: 0.38,
    rotation: [0.05, -0.18, 0.08],
    scale: 1.08,
  },
];
