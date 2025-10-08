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
        <div class="bg-white rounded-t-4xl sticky top-0 z-30 py-27">
          <ScreeningSection :sidebar-elements="screeningContentElements" />
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

const screeningContentElements = ref([
  {
    title: "Dépistage",
    content:
      "Les femmes entre 50 et 74 ans sont invitées à faire une mammographie tous les 2 ans. Ce simple examen peut sauver des vies. Il est cependant recommandé dès l’âge de 25 ans de les montrer une fois par an à un médecin et/ou à un gynécologue.",
    image: "/images/screening-01.jpg",
  },
  {
    title: "Autopalpation",
    content:
      "L'autopalpation régulière est un procédé simple qui vous permettra de détecter d’éventuels symptômes de cancer du sein entre deux dépistages. Au plus tôt il est détecté, au plus facile il est de le soigner.",
    image: "/images/screening-02.jpg",
  },
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
