import type { SymptomType } from "./symptom-effects";

export type MaterialStyle = "original" | "glass" | "glow" | "iridescent";

export interface BustViewerProps {
  animationStep?: string;
  animationEnabled?: boolean;
  modelVerticalOffset?: number;
  profileLabel?: string;
  profileLabelProgress?: number;
  modelUrl?: string;
  scrollProgress?: number; // 0 to 100
  autoRotate?: boolean;
  enableZoom?: boolean;
  interactive?: boolean;
  compact?: boolean;
  modelScale?: number;
  focusSymptoms?: boolean;
  /** Scroll progress between symptoms and the closer palpation framing. */
  palpationProgress?: number;
  showBackdrop?: boolean;
  showLoadingIndicator?: boolean;
  initialRotationY?: number;
  modelHorizontalAlignment?: "center" | "left";
  symptomType?: SymptomType;
  materialStyle?: MaterialStyle;
  shapeType?: "round" | "asymmetric" | "ptose" | "mastectomy";
}

export interface BustJourneyProps {
  fruitSelectionActive?: boolean;
  fruitTransitionActive?: boolean;
  fruitTransitionProgress?: number;
  fruitTransitionPhase?: "idle" | "approach" | "covered" | "reveal";
  selectedFruitIndex?: number;
  hoveredFruitIndex?: number;
  animationStep?: string;
  firstModelUrl?: string;
  secondModelUrl?: string;
  /** 0: screening · 0.5: fruit selection · 1: locked profile framing on the second. */
  cameraProgress?: number;
  focusSymptoms?: boolean;
  /** Scroll progress between symptoms and the closer palpation framing. */
  palpationProgress?: number;
  secondModelOpacity?: number;
  symptomType?: SymptomType;
  profileLabel?: string;
  profileLabelProgress?: number;
  secondRotationY?: number;
  debugPath?: boolean;
}

export interface BustEvents {
  (event: "framingReady"): void;
  (event: "symptomReady", symptom: SymptomType): void;
}

export interface BustJourneyEvents extends BustEvents {
  (event: "fruitReady"): void;
  (event: "modelReady", url: string): void;
}
