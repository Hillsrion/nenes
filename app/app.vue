<template>
  <FruitTestPage v-if="isFruitTest" />
  <ThreeDFruitLoadingPage v-else-if="isThreeDFruitLoading" />
  <LinksPage v-else-if="isLinksPage" />
  <ThreeDModelCatalogPage v-else-if="isThreeDModelCatalog" />
  <ThreeDStudio v-else-if="isThreeDStudio" />

  <template v-else>
  <div ref="globalContainer">
    <VueLenis root />

    <MainLayout ref="mainLayoutRef">
      <!-- Loading Section -->
      <LoadingSection v-if="!isLoadingComplete" />
      <div
        class="transition-transform duration-1000 ease-out"
        :class="{
          'translate-y-[100vh]':
            store.sections.loading?.state === 'idle' && !isLoadingComplete,
        }"
      >
        <Logo
          class="fixed top-8 left-1/2 -translate-x-1/2 z-150 transition-opacity duration-500 ease-out"
          :color="logoColor"
          :style="{ opacity: store.logo.opacity }"
        />

        <!-- Unified Statistics and Content Section -->
        <EntrySection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
        />
        <!-- One full-viewport 3D stage hosts the screening bust and the symptoms
             bust in a single scene; the camera glides from one to the other as
             the reader scrolls between the two sections. A zero-height sticky
             sentinel carries the canvas: `fixed` would resolve against the
             transformed body (GSAP normalizeScroll) instead of the viewport. -->
        <div ref="journeyTrackRef" class="relative">
          <div v-if="fruitContinuing" class="pointer-events-none sticky top-0 z-0 h-0" aria-hidden="true">
            <div class="absolute inset-x-0 top-0 h-[100svh] bg-[radial-gradient(circle_at_58%_38%,#fff_0%,#ffe9f1_52%,#f8d6e2_100%)]" />
          </div>
          <div
            v-if="journeyStageReady"
            ref="journeyStageRef"
            class="pointer-events-none sticky top-0 z-10 h-0 overflow-visible"
            :style="{ zIndex: fruitContinuing ? 200 : 10 }"
            aria-hidden="true"
          >
            <div class="absolute inset-x-0 top-0 h-screen">
              <ThreeBustJourney
                :first-model-url="journeyFirstModelUrl"
                :second-model-url="selectedJourneyModelUrl"
                :fruit-selection-active="fruitSelectionActive"
                :fruit-transition-active="fruitContinuing"
                :fruit-transition-progress="fruitFlightProgress"
                :fruit-transition-phase="fruitFlightPhase"
                :selected-fruit-index="selectedFruitIndex"
                :hovered-fruit-index="hoveredFruitIndex"
                @fruit-ready="journeySceneReady = true"
                @model-ready="journeyReadyModelUrl = $event"
                :animation-step="sharedPalpationStep"
                :camera-progress="displayedJourneyCameraProgress"
                :focus-symptoms="sharedSymptomsFocus"
                :palpation-progress="palpationModelPresence"
                @framing-ready="symptomsSectionRef?.onFramingReady()"
                @symptom-ready="symptomsSectionRef?.onSymptomReady($event)"
                :second-model-opacity="screeningSecondModelOpacity"
                :symptom-type="palpationModelPresence > 0 ? 'none' : activeSectionSymptom"
                :profile-label="symptomsMainTitle"
                :profile-label-progress="sharedProfileLabelProgress"
                :second-rotation-y="sharedModelRotation"
                :debug-path="isJourneyDebug"
              />
            </div>
          </div>

          <ScreeningSection
            :sidebar-elements="screeningContentElements"
            :title="screeningMainTitle"
          />
          <FruitSelectionSection
            ref="fruitSelectionSectionRef"
            :active="fruitSelectionActive"
            :continuing="fruitContinuing"
            :selected-fruit="selectedFruit"
            :selected-index="selectedFruitIndex"
            :hovered-index="hoveredFruitIndex"
            :model-file="selectedJourneyModelFile"
            :scene-ready="journeySceneReady"
            @select="selectedFruit = $event"
            @hover="hoveredFruit = $event"
            @continue="continueFruitSelection"
          />
          <div class="relative bg-white" ref="symptomsAndExaminationContainerRef">
            <div class="relative z-20">
              <SymptomsSection
                ref="symptomsSectionRef"
                :title="symptomsMainTitle"
                :intro-card="symptomsIntroCard"
                :cards="symptomsCards"
                :show-profile-model="true"
                :use-shared-model="true"
                @profile-progress="symptomsProfileProgress = $event"
                @symptom-change="activeSectionSymptom = $event"
                @profile-view-change="isSymptomsProfileView = $event"
              />

              <SelfExaminationSection
                :steps="selfExaminationSteps"
                :use-shared-model="true"
                @model-presence="palpationModelPresence = $event"
                @step-change="palpationStepId = $event"
              />
            </div>
          </div>
        </div>

        <!-- Resources Section -->
        <ResourcesSection />
        <CursorImageSpawner
          v-if="isCursorImageSpawnerEnabled"
          :images="cursorImages"
          :disabled="isThreeDPreview"
        />
      </div>
    </MainLayout>
  </div>

  <ThreeDPreview :enabled="isThreeDPreview" />
  </template>
</template>

<script setup lang="ts">
import type { SymptomType } from "~/components/ui/three-bust/symptom-effects";
import { useFruitJourneySelection } from "~/composables/three-bust/useFruitJourneySelection";
import FruitSelectionSection from "~/components/sections/FruitSelectionSection.vue";
import { useJourneyStage } from "~/composables/three-bust/useJourneyStage";
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import EntrySection from "~/components/sections/EntrySection.vue";
import ScreeningSection from "~/components/sections/ScreeningSection.vue";
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import Logo from "~/components/ui/Logo.vue";
import CursorImageSpawner from "~/components/ui/CursorImageSpawner.vue";
import ThreeDPreview from "~/components/ui/ThreeDPreview.vue";
import ThreeBustJourney from "~/components/ui/ThreeBustJourney.vue";
import ThreeDStudio from "~/components/ui/ThreeDStudio.vue";
import ThreeDModelCatalogPage from "~/components/ui/ThreeDModelCatalogPage.vue";
import ThreeDFruitLoadingPage from "~/components/ui/ThreeDFruitLoadingPage.vue";
import FruitTestPage from "~/components/ui/FruitTestPage.vue";
import LinksPage from "~/components/ui/LinksPage.vue";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { useAnimationsStore } from "~/stores";
import { useContent } from "~/composables/useContent";
import { useLenis } from "lenis/vue";

// Store
const store = useAnimationsStore();
// Temporarily keep the editorial cursor trail out of the experience.
const isCursorImageSpawnerEnabled = false;
const route = useRoute();
const isFruitTest = computed(() => route.path === "/fruits");
const isThreeDFruitLoading = computed(() => route.path === "/loading-3d");
const isLinksPage = computed(() => route.path === "/links");
const isThreeDModelCatalog = computed(() => route.path === "/models-3d");
const isThreeDStudio = computed(
  () => route.path === "/studio-3d" || route.query.studio3d === "upload"
);
const isThreeDPreview = computed(() => route.query.preview3d === "photo");
const { monoviewFileName, getModelUrl } = useDemoBustModelUrls();
// Lenis instance for scroll control
const lenis = useLenis();

// Content data from hook
const {
  mainContentElements,
  statisticsText,
  screeningContentElements,
  screeningMainTitle,
  symptomsMainTitle,
  symptomsIntroCard,
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
      !isFruitTest.value &&
      !isThreeDFruitLoading.value &&
      !isLinksPage.value &&
      !isThreeDModelCatalog.value &&
      !isThreeDPreview.value &&
      !isThreeDStudio.value &&
      !isLoadingComplete.value
        ? "overflow-hidden h-screen"
        : ""
    ),
  },
  bodyAttrs: {
    class: computed(() =>
      !isFruitTest.value &&
      !isThreeDFruitLoading.value &&
      !isLinksPage.value &&
      !isThreeDModelCatalog.value &&
      !isThreeDPreview.value &&
      !isThreeDStudio.value &&
      !isLoadingComplete.value
        ? "overflow-hidden"
        : ""
    ),
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
const symptomsAndExaminationContainerRef = ref<HTMLElement | null>(null);
const journeyTrackRef = ref<HTMLElement | null>(null);
const journeyStageRef = ref<HTMLElement | null>(null);
const symptomsSectionRef = ref<InstanceType<typeof SymptomsSection> | null>(null);
const symptomsProfileProgress = ref(0);
const fruitSelectionSectionRef = ref<InstanceType<typeof FruitSelectionSection> | null>(null);
const fruitElementRef = computed(() => fruitSelectionSectionRef.value?.sectionRef ?? null);
const journeySceneReady = ref(false);
const journeyReadyModelUrl = ref("");
const {
  selectedFruit, hoveredFruit,
  selectedIndex: selectedFruitIndex, hoveredIndex: hoveredFruitIndex,
  modelFile: selectedJourneyModelFile, modelUrl: selectedJourneyModelUrl,
  selectionActive: fruitSelectionActive, continuing: fruitContinuing,
  flightProgress: fruitFlightProgress, flightPhase: fruitFlightPhase,
  continueSelection: continueFruitSelection,
} = useFruitJourneySelection({
  sectionRef: fruitElementRef, destinationRef: symptomsAndExaminationContainerRef,
  ready: computed(() => isLoadingComplete.value && !isThreeDPreview.value),
  loadedModelUrl: journeyReadyModelUrl,
});
const displayedJourneyCameraProgress = computed(() => fruitContinuing.value
  ? fruitFlightPhase.value === "approach" ? 0.5 : 1
  : journeyCamera.progress);
const screeningSecondModelOpacity = computed(() => Math.min(1, Math.max(0, (displayedJourneyCameraProgress.value - 0.52) / 0.24)));
const palpationModelPresence = ref(0);
const palpationStepId = ref("observation");
const sharedPalpationStep = computed(() => palpationModelPresence.value > 0 ? palpationStepId.value : "observation");
const sharedModelRotation = computed(() => {
  if (palpationModelPresence.value > 0) return 0;
  return isSymptomsProfileView.value ? -Math.PI / 2 : 0;
});
const activeSectionSymptom = ref<SymptomType>("none");
const isSymptomsProfileView = ref(true);
// Keep the symptoms close-up between cards; the viewer blends into palpation.
const sharedSymptomsFocus = computed(() =>
  !isSymptomsProfileView.value && palpationModelPresence.value <= 0
);
const sharedProfileLabelProgress = computed(() =>
  isSymptomsProfileView.value && palpationModelPresence.value <= 0
    ? symptomsProfileProgress.value
    : 0
);

const isJourneyDebug = computed(() => route.query.journeyDebug === "1");
// Same asset as the screening section's viewer, so the browser cache serves it.
const journeyFirstModelUrl = computed(() => {
  return getModelUrl(monoviewFileName);
});

const { journeyCamera, journeyStageReady, scheduleJourneyStageMount } = useJourneyStage({
  trackRef: journeyTrackRef, stageRef: journeyStageRef, fruitRef: fruitElementRef, endRef: symptomsAndExaminationContainerRef,
});

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

// Watch loading state and control Lenis scrolling
watch(
  () => store.sections.loading?.state,
  (newState) => {
    if (newState === "isComplete") {
      if (lenis.value) {
        // Re-enable scrolling after loading is complete
        lenis.value.start();
      }
      nextTick(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            scheduleJourneyStageMount();
          });
        }, 120);
      });
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (
    isFruitTest.value ||
    isThreeDFruitLoading.value ||
    isLinksPage.value ||
    isThreeDModelCatalog.value ||
    isThreeDPreview.value ||
    isThreeDStudio.value
  ) return;

  scrollTo(0, 0);
  if (store.sections.loading?.state !== "isComplete") lenis.value?.stop();

  if (store.sections.loading?.state === "isComplete") {
    nextTick(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          scheduleJourneyStageMount();
        });
      }, 150);
    });
  }
  // Matomo tracking code
  const config = useRuntimeConfig();
  const matomoUrl = config.public.matomoUrl;
  const siteId = config.public.siteId;

  if (process.client && matomoUrl && siteId) {
    var _paq = (window._paq = window._paq || []);
    _paq.push(["trackPageView"]);
    _paq.push(["enableLinkTracking"]);
    (function () {
      var u = matomoUrl + "/";
      _paq.push(["setTrackerUrl", u + "matomo.php"]);
      _paq.push(["setSiteId", siteId]);
      var d = document,
        g = d.createElement("script"),
        s = d.getElementsByTagName("script")[0];
      g.type = "text/javascript";
      g.async = true;
      g.src = u + "matomo.js";
      s.parentNode.insertBefore(g, s);
    })();
  }
});
</script>
