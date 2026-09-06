import type { SymptomType } from "./components/ui/three-bust/symptom-effects";

export type Card = {
  title: string;
  subtitle?: string;
  description?: string;
  image: string;
};

export type SymptomCardData = Card & {
  symptom: Exclude<SymptomType, "none">;
};

export type IntroCard = {
  title: string;
  description: string;
};

declare global {
  interface Window {
    _paq: Array<Array<string | number>>;
  }
}
