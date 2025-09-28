import { defineStore } from "pinia";
import { ref } from "vue";

type Section =
  | "loading"
  | "statistics"
  | "content"
  | "self-examination"
  | "symptoms"
  | "resources";

// map of sections with objects, state: idle, isAnimating, isComplete
const sections = ref<
  Map<Section, { state: "idle" | "isAnimating" | "isComplete" }>
>(
  new Map<Section, { state: "idle" | "isAnimating" | "isComplete" }>([
    ["loading", { state: "idle" }],
    ["statistics", { state: "idle" }],
    ["content", { state: "idle" }],
    ["self-examination", { state: "idle" }],
    ["symptoms", { state: "idle" }],
    ["resources", { state: "idle" }],
  ])
);

export const useAnimationsStore = defineStore("animations", {
  state: () => ({
    sections,
  }),
  actions: {
    updateSectionState(
      section: Section,
      state: "idle" | "isAnimating" | "isComplete"
    ) {
      sections.value.set(section, { state });
    },
  },
});
