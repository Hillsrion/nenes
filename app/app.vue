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
        <FlexibleSection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
          :background-gradient="mainBackgroundGradient"
          :is-loading-complete="isLoadingComplete"
        />

        <!-- Self-Examination Section -->
        <SelfExaminationSection />

        <!-- Symptoms Section -->
        <SymptomsSection />

        <!-- Resources Section -->
        <ResourcesSection />
      </div>
    </MainLayout>
  </div>
</template>

<script setup>
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import FlexibleSection from "~/components/sections/FlexibleSection.vue";
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
    type: "h2",
    props: {
      class:
        "text-2xl font-normal leading-relaxed text-white text-center max-w-4xl mx-auto",
    },
    content:
      "Détecté à un stade précoce, le cancer du sein est guéri dans plus de 9 cas sur 10. C'est pourquoi il est essentiel d'agir et de se sensibiliser aux gestes qui sauvent.",
  },
]);

const mainBackgroundGradient = ref(
  "bg-gradient-to-br from-pink-300 to-pink-500"
);

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
