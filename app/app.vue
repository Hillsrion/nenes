<template>
  <div ref="globalContainer">
    <VueLenis root />

    <MainLayout>
      <!-- Loading Section -->
      <LoadingSection />
      <div
        class="transition-transform duration-1000 ease-out"
        :class="{
          'translate-y-[100vh]': !isLoadingComplete,
        }"
      >
        <!-- Unified Statistics and Content Section -->
        <EntrySection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
        />
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
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import { useAnimationsStore } from "~/stores";

// Store
const store = useAnimationsStore();

// Reactive state for loading completion
const isLoadingComplete = ref(false);

// Define main content elements for the ContentSection
const mainContentElements = ref([
  {
    content: "Il est le cancer le plus fréquent pour la femme",
  },
  {
    content: "Ainsi que la première cause de mortalité par cancer",
  },
]);

// Statistics text for the statistics section
const statisticsText = ref([
  "Chaque année en France,",
  "le cancer du sein touche",
  "plus de 60000 femmes.",
]);

const globalContainer = ref(null);

// Watch for loading completion
watch(
  () => store.sections.loading?.state,
  (newState) => {
    console.log("newState", newState);
    if (newState === "isComplete") {
      // Add a small delay to ensure smooth transition
      setTimeout(() => {
        isLoadingComplete.value = true;
      }, 200);
    }
  },
  { immediate: true }
);

onMounted(() => {
  scrollTo(0, 0);
});
</script>
