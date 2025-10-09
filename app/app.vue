<template>
  <div ref="globalContainer">
    <VueLenis root />

    <MainLayout>
      <!-- Loading Section -->
      <LoadingSection />
      <div
        class="transition-transform duration-1000 ease-out"
        :class="{
          'translate-y-[100vh]': store.sections.loading?.state === 'idle',
        }"
      >
        <Logo
          class="fixed top-8 left-1/2 transform -translate-x-1/2 z-150"
          :color="logoColor"
        />

        <!-- Unified Statistics and Content Section -->
        <EntrySection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
        />
        <div class="bg-white rounded-t-4xl sticky top-0 z-30 py-27">
          <ScreeningSection
            :sidebar-elements="screeningContentElements"
            :title="screeningMainTitle"
          />
        </div>
        <!-- Symptoms Section -->
        <!-- <SymptomsSection /> -->

        <!-- Self-Examination Section -->
        <!-- <SelfExaminationSection /> -->

        <!-- Resources Section -->
        <!-- <ResourcesSection /> -->
      </div>
    </MainLayout>
  </div>
</template>

<script setup>
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import EntrySection from "~/components/sections/EntrySection.vue";
import ScreeningSection from "~/components/sections/ScreeningSection.vue";
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import Logo from "~/components/ui/Logo.vue";
import { useAnimationsStore } from "~/stores";
import { useContent } from "~/composables/useContent";

// Store
const store = useAnimationsStore();

// Content data from hook
const {
  mainContentElements,
  statisticsText,
  screeningContentElements,
  screeningMainTitle,
} = useContent();

// Reactive state for loading completion
const isLoadingComplete = computed(
  () => store.sections.loading?.state === "isComplete"
);

// Prevent scroll during loading using useHead with Tailwind classes on both html and body
useHead({
  htmlAttrs: {
    class: computed(() =>
      !isLoadingComplete.value ? "overflow-hidden h-screen" : ""
    ),
  },
  bodyAttrs: {
    class: computed(() => (!isLoadingComplete.value ? "overflow-hidden" : "")),
  },
});

const globalContainer = ref(null);

// Computed logo color based on store state
const logoColor = computed(() => {
  return store.getLogoState
    ? "var(--color-primary)"
    : "var(--color-nenes-pink-light)";
});

// Watch for loading completion
watch(
  () => store.sections.loading?.state,
  (newState) => {
    if (newState === "isAnimating") {
      setTimeout(() => {
        store.updateSectionState("loading", "isComplete");
      }, 1000);
    }
  },
  { immediate: true }
);

onMounted(() => {
  scrollTo(0, 0);
});
</script>
