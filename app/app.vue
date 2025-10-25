<template>
  <div ref="globalContainer">
    <!-- <VueLenis root /> -->

    <MainLayout ref="mainLayoutRef">
      <!-- Loading Section -->
      <LoadingSection v-show="!isLoadingComplete" />
      <div
        class="transition-transform duration-1000 ease-out"
        :class="{
          'translate-y-[100vh]':
            store.sections.loading?.state === 'idle' && !isLoadingComplete,
        }"
      >
        <Logo
          class="fixed top-8 left-1/2 -translate-x-1/2 z-150"
          :color="logoColor"
        />

        <!-- Unified Statistics and Content Section -->
        <EntrySection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
        />
        <ScreeningSection
          :sidebar-elements="screeningContentElements"
          :title="screeningMainTitle"
        />
        <SymptomsSection :title="symptomsMainTitle" :cards="symptomsCards" />

        <SelfExaminationSection :steps="selfExaminationSteps" />

        <!-- Resources Section -->
        <ResourcesSection />
        <CursorImageSpawner :images="cursorImages" />
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
import CursorImageSpawner from "~/components/ui/CursorImageSpawner.vue";
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
  symptomsMainTitle,
  symptomsCards,
  selfExaminationSteps,
  cursorImages,
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
  link: [
    // Preload critical illustrations that appear in loading sequence
    { rel: "preload", href: "/images/illustrations/1.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/2.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/3.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/4.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/5.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/6.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/7.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/8.svg", as: "image" },
    // DNS prefetch for external resources
    { rel: "dns-prefetch", href: "//fonts.googleapis.com" },
    { rel: "dns-prefetch", href: "//fonts.gstatic.com" },
  ],
});

const globalContainer = ref(null);
const mainLayoutRef = ref(null); // Ref to MainLayout component

// Computed logo color based on store state
const logoColor = computed(() => {
  return store.getLogoState ? "var(--color-primary)" : "var(--color-secondary)";
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

onMounted(async () => {
  scrollTo(0, 0);
});
</script>
