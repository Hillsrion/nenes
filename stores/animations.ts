import { defineStore } from "pinia";

type TSection =
  | "loading"
  | "statistics"
  | "content"
  | "self-examination"
  | "symptoms"
  | "resources";

type TSectionAnimationState = "idle" | "isAnimating" | "isComplete";

const sections: Record<TSection, { state: TSectionAnimationState }> = {
  loading: { state: "isComplete" },
  statistics: { state: "idle" },
  content: { state: "idle" },
  "self-examination": { state: "idle" },
  symptoms: { state: "idle" },
  resources: { state: "idle" },
};

export const useAnimationsStore = defineStore("animations", {
  state: () => ({
    sections,
  }),
  actions: {
    updateSectionState(section: TSection, state: TSectionAnimationState) {
      this.sections[section].state = state;
    },
  },
  getters: {
    getSectionState: (state) => (section: TSection) => {
      return state.sections[section]?.state;
    },
  },
});
