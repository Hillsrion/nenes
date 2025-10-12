import { defineStore } from "pinia";

type TSection =
  | "loading"
  | "statistics"
  | "content"
  | "self-examination-header"
  | "self-examination"
  | "symptoms"
  | "resources";

type TSectionAnimationState = "idle" | "isAnimating" | "isComplete";

const sections: Record<TSection, { state: TSectionAnimationState }> = {
  loading: { state: "idle" },
  statistics: { state: "idle" },
  content: { state: "idle" },
  "self-examination-header": { state: "idle" },
  "self-examination": { state: "idle" },
  symptoms: { state: "idle" },
  resources: { state: "idle" },
};

// Logo state
interface LogoState {
  isPrimary: boolean;
}

export const useAnimationsStore = defineStore("animations", {
  state: () => ({
    sections,
    logo: {
      isPrimary: true,
    },
  }),
  actions: {
    updateSectionState(section: TSection, state: TSectionAnimationState) {
      this.sections[section].state = state;
    },
    updateLogoColor(isPrimary: boolean) {
      this.logo.isPrimary = isPrimary;
    },
  },
  getters: {
    getSectionState: (state) => (section: TSection) => {
      return state.sections[section]?.state;
    },
    getLogoState: (state) => {
      return state.logo.isPrimary;
    },
  },
});
