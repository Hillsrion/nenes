<template>
  <div>
    <MainLayout>
      <!-- Loading Section -->
      <LoadingSection />

      <!-- Statistics Section -->
      <StatisticsSection />

      <!-- Main Content Sections -->
      <ContentSection
        :content-elements="mainContentElements"
        :background-gradient="mainBackgroundGradient"
      />

      <!-- Self-Examination Section -->
      <SelfExaminationSection />

      <!-- Symptoms Section -->
      <SymptomsSection />

      <!-- Resources Section -->
      <ResourcesSection />
    </MainLayout>

    <!-- Sticky Scroll Indicator -->
    <StickyScrollIndicator text="scroll" :scroll-threshold="0.3" />
  </div>
</template>

<script setup>
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import StatisticsSection from "~/components/sections/StatisticsSection.vue";
import ContentSection from "~/components/sections/ContentSection.vue";
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import StickyScrollIndicator from "~/components/ui/StickyScrollIndicator.vue";

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
</script>
