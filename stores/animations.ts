import { defineStore } from "pinia";

type TSection =
  | "loading"
  | "statistics"
  | "content"
  | "self-examination-header"
  | "self-examination"
  | "symptoms"
  | "resources"
  | "bust";

type TSectionAnimationState = "idle" | "isAnimating" | "isComplete";

const sections: Record<TSection, { state: TSectionAnimationState }> = {
  loading: { state: "idle" },
  statistics: { state: "idle" },
  content: { state: "idle" },
  "self-examination-header": { state: "idle" },
  "self-examination": { state: "idle" },
  symptoms: { state: "idle" },
  resources: { state: "idle" },
  bust: { state: "idle" },
};

// Logo state
interface LogoState {
  isPrimary: boolean;
  opacity: number;
}

// Cover scaling state
interface CoverState {
  isScaling: boolean;
  cornerRadius: number;
}

export const useAnimationsStore = defineStore("animations", {
  state: () => ({
    sections: sections || {},
    logo: {
      isPrimary: true,
      opacity: 1,
    },
    cover: {
      isScaling: false,
      cornerRadius: 32,
    },
  }),
  actions: {
    updateSectionState(section: TSection, state: TSectionAnimationState) {
      if (this.sections && this.sections[section]) {
        this.sections[section].state = state;
      }
    },
    updateLogoColor(isPrimary: boolean) {
      if (this.logo) {
        this.logo.isPrimary = isPrimary;
      }
    },
    updateLogoOpacity(opacity: number) {
      if (this.logo) {
        this.logo.opacity = Math.max(0, Math.min(1, opacity));
      }
    },
    updateCoverScaling(isScaling: boolean) {
      if (this.cover) {
        this.cover.isScaling = isScaling;
      }
    },
    updateCoverCornerRadius(cornerRadius: number) {
      if (this.cover) {
        this.cover.cornerRadius = Math.max(0, Math.min(32, cornerRadius));
      }
    },
  },
  getters: {
    getSectionState: (state) => (section: TSection) => {
      return state?.sections?.[section]?.state;
    },
    getLogoState: (state) => {
      return state?.logo?.isPrimary ?? true;
    },
    getCoverScaling: (state) => {
      return state?.cover?.isScaling ?? false;
    },
  },
});
