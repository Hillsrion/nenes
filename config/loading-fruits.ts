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
    name: "kiwi",
    emoji: "🥝",
    modelUrl: `${modelRoot}/food_kiwi_01/food_kiwi_01_1k.gltf`,
    color: "#9a744c",
    highlight: "#dfbd86",
    roughness: 0.72,
    normalStrength: 0.38,
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
  {
    name: "poire asiatique",
    emoji: "🍐",
    modelUrl: `${modelRoot}/food_pears_asian_01/food_pears_asian_01_1k.gltf`,
    nodeName: "food_pears_asian_01_e",
    color: "#d7bf65",
    highlight: "#fff0b1",
    roughness: 0.64,
    normalStrength: 0.3,
    scale: 1.18,
  },
  {
    name: "avocat",
    emoji: "🥑",
    modelUrl: `${modelRoot}/food_avocado_01/food_avocado_01_1k.gltf`,
    color: "#638749",
    highlight: "#c4d997",
    roughness: 0.68,
    normalStrength: 0.36,
  },
];
