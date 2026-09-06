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
          class="fixed top-8 left-1/2 -translate-x-1/2 z-150"
          :color="logoColor"
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
          <div
            v-if="journeyStageReady"
            ref="journeyStageRef"
            class="pointer-events-none sticky top-0 z-10 hidden h-0 overflow-visible lg:block"
            aria-hidden="true"
          >
            <div class="absolute inset-x-0 top-0 h-screen">
              <ThreeBustJourney
                :first-model-url="journeyFirstModelUrl"
                :second-model-url="getModelUrl(multiviewFileName)"
                :camera-progress="journeyCamera.progress"
                :symptom-type="activeSectionSymptom"
                :profile-label="symptomsMainTitle"
                :profile-label-progress="symptomsProfileProgress"
                :second-rotation-y="isSymptomsProfileView ? Math.PI / 2 : 0"
                :debug-path="isJourneyDebug"
              />
            </div>
          </div>

          <ScreeningSection
            :sidebar-elements="screeningContentElements"
            :title="screeningMainTitle"
          />
          <div class="relative bg-white" ref="symptomsAndExaminationContainerRef">
            <!-- Shared 3D Bust Model anchored on left across both Symptoms & Palpation sections.
                 Desktop reads the journey stage above; this sticky viewer stays for touch layouts. -->
            <div
              class="pointer-events-none sticky top-0 h-screen w-full z-15 overflow-hidden lg:hidden"
              aria-hidden="true"
            >
              <div
                ref="sharedProfileModelRef"
                class="absolute bottom-[-15svh] left-0 z-10 mx-0 h-[115svh] w-[min(100vw,56rem)] max-md:w-[100vw]"
              >
                <ThreeBustViewer
                  :profile-label="symptomsMainTitle"
                  :profile-label-progress="symptomsProfileProgress"
                  :model-url="getModelUrl(multiviewFileName)"
                  :auto-rotate="false"
                  :enable-zoom="false"
                  :interactive="false"
                  :initial-rotation-y="isSymptomsProfileView ? Math.PI / 2 : 0"
                  :symptom-type="activeSectionSymptom"
                  :model-scale="1.05"
                  model-horizontal-alignment="left"
                  :show-backdrop="false"
                  :show-loading-indicator="false"
                  compact
                />
              </div>
            </div>

            <div class="relative z-20 -mt-[100vh]">
              <SymptomsSection
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

  <ClientOnly>
    <div
      v-if="isThreeDPreview"
      class="fixed inset-0 z-[10000] overflow-hidden bg-[#fff5f8] text-primary"
    >
      <header
        class="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-white/90 px-5 py-4 backdrop-blur md:px-8"
      >
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#f472b6]">
            Démo 3D · matières
          </p>
          <h1 class="text-lg font-bold md:text-xl">Reconstruction 3D depuis une photo</h1>
        </div>
        <div class="flex items-center gap-4 text-xs font-medium text-secondary md:text-sm">
          <span>{{ activeCatalogModel.label }} · aperçu 3D</span>
          <a
            href="/models-3d"
            class="rounded-full border border-primary/15 bg-white px-4 py-2 text-primary transition hover:border-primary/30"
          >
            Tous les modèles
          </a>
          <a
            href="/"
            class="rounded-full border border-primary/15 bg-white px-4 py-2 text-primary transition hover:border-primary/30"
          >
            Retour au site
          </a>
        </div>
      </header>

      <aside
        class="absolute left-5 top-24 z-30 max-h-[calc(100vh-8rem)] w-[min(20rem,calc(100%-2.5rem))] overflow-y-auto rounded-3xl border border-primary/10 bg-white/92 p-4 shadow-xl backdrop-blur md:left-8 md:top-28"
      >
        <div class="mb-4 px-1">
          <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-[#f472b6]">
            Prototype pédagogique
          </p>
          <h2 class="mt-1 text-lg font-bold">Illustrer un symptôme</h2>
        </div>

        <div class="mb-4 rounded-2xl border border-primary/10 bg-[#fff8fa] p-3">
          <label
            for="bust-fruit-size"
            class="block text-[10px] font-bold uppercase tracking-[0.16em] text-secondary"
          >
            Repère de volume
          </label>
          <select
            id="bust-fruit-size"
            v-model="activeCatalogModelId"
            class="mt-2 w-full rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none transition focus:border-[#e95678]/50 focus:ring-2 focus:ring-[#e95678]/10"
          >
            <option
              v-for="catalogModel in bustModelCatalog"
              :key="catalogModel.id"
              :value="catalogModel.id"
            >
              {{ catalogModel.shortLabel }} · {{ catalogModel.badge }}
            </option>
          </select>

          <div class="mt-2 px-0.5 text-[11px] leading-snug" aria-live="polite">
            <p class="font-bold text-primary">{{ activeCatalogModel.label }}</p>
            <p v-if="isResolvingPreviewModel" class="mt-0.5 text-secondary">
              Recherche du modèle local…
            </p>
            <p v-else-if="isUsingDefaultPreviewModel" class="mt-0.5 text-[#a35f2d]">
              Modèle non généré · affichage du modèle de démonstration
            </p>
            <p v-else class="mt-0.5 text-[#27845b]">Modèle 3D disponible</p>
          </div>

          <p class="mt-2 border-t border-primary/10 pt-2 text-[10px] leading-relaxed text-secondary/75">
            Comparaison visuelle uniquement, sans équivalence médicale de taille.
          </p>
        </div>

        <div
          v-if="sourceComparisonEnabled && (isResolvingSourceComparison || sourceComparison)"
          class="mb-4 rounded-2xl border border-primary/10 bg-white/80 p-3"
        >
          <label class="flex cursor-pointer items-start gap-3">
            <input
              v-model="showSourceComparison"
              type="checkbox"
              :disabled="!sourceComparison"
              class="mt-0.5 h-4 w-4 rounded border-primary/20 accent-[#e95678]"
            />
            <span>
              <span class="block text-xs font-bold text-primary">Comparer à la photo source</span>
              <span class="mt-0.5 block text-[10px] leading-relaxed text-secondary/80">
                {{
                  isResolvingSourceComparison
                    ? "Recherche de la photo privée…"
                    : "Affiche la vue d’origine à côté du modèle, avec le même angle de départ."
                }}
              </span>
            </span>
          </label>
          <label
            v-if="sourceComparison && sourceComparison.views.length > 1"
            class="mt-3 block border-t border-primary/10 pt-3"
          >
            <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
              Vue à comparer
            </span>
            <select
              v-model="selectedSourceViewId"
              class="mt-1.5 w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold text-primary outline-none transition focus:border-[#e95678]/50"
            >
              <option v-for="view in sourceComparison.views" :key="view.id" :value="view.id">
                {{ view.label }}
              </option>
            </select>
          </label>
        </div>

        <div class="mb-4 rounded-2xl border border-primary/10 bg-white/80 p-3">
          <p class="text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
            Matière expérimentale
          </p>
          <div class="mt-2 grid grid-cols-2 gap-2">
            <button
              v-for="material in previewMaterials"
              :key="material.id"
              type="button"
              class="flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition"
              :class="
                activePreviewMaterial === material.id
                  ? 'border-[#e95678]/40 bg-[#fff0f5] text-primary shadow-sm'
                  : 'border-primary/8 bg-white text-secondary hover:border-primary/20'
              "
              :aria-pressed="activePreviewMaterial === material.id"
              @click="activePreviewMaterial = material.id"
            >
              <span
                aria-hidden="true"
                class="h-7 w-7 shrink-0 rounded-full border border-white/70 shadow-inner"
                :style="{ background: material.swatch }"
              />
              <span class="min-w-0">
                <span class="block text-xs font-bold leading-tight">{{ material.label }}</span>
                <span class="mt-0.5 block text-[9px] leading-tight opacity-70">
                  {{ material.short }}
                </span>
              </span>
            </button>
          </div>
          <p class="mt-2 px-0.5 text-[10px] leading-relaxed text-secondary/80">
            {{ activePreviewMaterialContent.description }}
          </p>
        </div>

        <div class="flex flex-col gap-2">
          <button
            v-for="symptom in previewSymptoms"
            :key="symptom.id"
            type="button"
            class="rounded-2xl border px-4 py-3 text-left transition"
            :class="
              activePreviewSymptom === symptom.id
                ? 'border-[#e95678]/35 bg-[#fff0f4] text-primary shadow-sm'
                : 'border-primary/5 bg-white/70 text-secondary hover:border-primary/15 hover:bg-white'
            "
            @click="activePreviewSymptom = symptom.id"
          >
            <span class="block text-sm font-bold">{{ symptom.label }}</span>
            <span class="mt-0.5 block text-[11px] leading-snug opacity-75">
              {{ symptom.short }}
            </span>
          </button>
        </div>

        <p class="mt-4 border-t border-primary/10 px-1 pt-3 text-[11px] leading-relaxed text-secondary">
          {{ activePreviewSymptomContent.description }}
        </p>
      </aside>

      <main
        class="h-full pt-20 md:pt-16"
        :class="showSourceComparison && activeSourceComparisonView ? 'md:pl-[23rem]' : ''"
      >
        <div
          v-if="showSourceComparison && activeSourceComparisonView"
          class="grid h-full min-h-0 grid-rows-2 bg-[#fff5f8] md:grid-cols-2 md:grid-rows-1"
        >
          <figure class="relative min-h-0 overflow-hidden border-b border-primary/10 bg-[#f7edf1] md:border-b-0 md:border-r">
            <div
              v-if="!sourceImageLoaded"
              class="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-[#f7edf1] text-primary"
              role="status"
              aria-live="polite"
            >
              <span
                class="h-8 w-8 animate-spin rounded-full border-2 border-primary/15 border-t-[#e95678]"
                aria-hidden="true"
              />
              <span class="text-[10px] font-bold uppercase tracking-[0.14em]">
                Chargement de la photo…
              </span>
            </div>
            <img
              :src="activeSourceComparisonView.imageUrl"
              :alt="activeSourceComparisonView.label"
              class="h-full w-full object-contain transition-opacity duration-200"
              :class="sourceImageLoaded ? 'opacity-100' : 'opacity-0'"
              draggable="false"
              @load="sourceImageLoaded = true"
              @error="sourceImageError = true; sourceImageLoaded = true"
            />
            <div
              v-if="sourceImageError"
              class="absolute inset-0 z-20 flex items-center justify-center bg-[#f7edf1]/95 px-6 text-center text-xs font-semibold text-primary"
              role="alert"
            >
              La photo source n’a pas pu être chargée.
            </div>
            <figcaption class="absolute bottom-4 left-4 rounded-full bg-white/90 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm backdrop-blur">
              {{ activeSourceComparisonView.label }} · privée
            </figcaption>
          </figure>
          <section class="relative min-h-0">
            <ThreeBustViewer
              :key="comparisonViewerKey"
              :model-url="previewModelUrl"
              :auto-rotate="false"
              :enable-zoom="true"
              :initial-rotation-y="activeSourceComparisonView.initialRotationY"
              :symptom-type="activePreviewSymptom"
              :material-style="activePreviewMaterial"
            />
            <button
              type="button"
              class="absolute right-4 top-4 z-20 rounded-full border border-primary/10 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-primary shadow-sm backdrop-blur transition hover:border-primary/30"
              @click="comparisonResetKey += 1"
            >
              Recaler l’angle
            </button>
          </section>
        </div>
        <ThreeBustViewer
          v-else
          :key="previewModelUrl"
          :model-url="previewModelUrl"
          :auto-rotate="false"
          :enable-zoom="true"
          :symptom-type="activePreviewSymptom"
          :material-style="activePreviewMaterial"
        />
      </main>

      <div
        class="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-primary/10 bg-white/90 px-4 py-2 text-center text-xs font-medium text-primary shadow-sm backdrop-blur"
      >
        Glisser pour tourner · molette ou pincement pour zoomer
      </div>
    </div>
  </ClientOnly>
  </template>
</template>

<script setup lang="ts">
import type { SymptomType } from "~/components/ui/three-bust/symptom-effects";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import EntrySection from "~/components/sections/EntrySection.vue";
import ScreeningSection from "~/components/sections/ScreeningSection.vue";
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import Logo from "~/components/ui/Logo.vue";
import CursorImageSpawner from "~/components/ui/CursorImageSpawner.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import ThreeBustJourney from "~/components/ui/ThreeBustJourney.vue";
import ThreeDStudio from "~/components/ui/ThreeDStudio.vue";
import ThreeDModelCatalogPage from "~/components/ui/ThreeDModelCatalogPage.vue";
import ThreeDFruitLoadingPage from "~/components/ui/ThreeDFruitLoadingPage.vue";
import FruitTestPage from "~/components/ui/FruitTestPage.vue";
import LinksPage from "~/components/ui/LinksPage.vue";
import { useBustModelCatalog } from "~/composables/useBustModelCatalog";
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
const { monoviewFileName, multiviewFileName, getModelUrl } = useDemoBustModelUrls();
const fallbackPreviewModelName = computed(() => {
  const requestedModel = Array.isArray(route.query.model)
    ? route.query.model[0]
    : route.query.model;

  return requestedModel &&
    /^[a-zA-Z0-9][a-zA-Z0-9_-]*(?:\/[a-zA-Z0-9][a-zA-Z0-9_-]*)*\.glb$/.test(requestedModel)
    ? requestedModel
    : multiviewFileName;
});
const requestedFruit = Array.isArray(route.query.fruit)
  ? route.query.fruit[0]
  : route.query.fruit;
const bustModelCatalog = useBustModelCatalog();
const requestedCatalogModel = computed(() =>
  bustModelCatalog.value.find(
    (model) =>
      model.fileName === fallbackPreviewModelName.value ||
      model.id === `volume-${requestedFruit}`
  )
);
const activeCatalogModelId = ref(requestedCatalogModel.value?.id ?? "");
const activeCatalogModel = computed(
  () =>
    bustModelCatalog.value.find((model) => model.id === activeCatalogModelId.value) ??
    bustModelCatalog.value[0]
);
watch(requestedCatalogModel, (model) => {
  if (model) activeCatalogModelId.value = model.id;
});
watch(bustModelCatalog, (models) => {
  if (!models.some((model) => model.id === activeCatalogModelId.value)) {
    activeCatalogModelId.value = models[0]?.id ?? "";
  }
});
const previewModelName = ref(fallbackPreviewModelName.value);
const isResolvingPreviewModel = ref(false);
const isUsingDefaultPreviewModel = ref(true);
const runtimeConfig = useRuntimeConfig();
const sourceComparisonEnabled = Boolean(
  runtimeConfig.public.modelReview?.sourceComparisonEnabled
);
const getPreviewModelUrl = getModelUrl;
const previewModelUrl = computed(() => getPreviewModelUrl(previewModelName.value));
interface SourceComparison {
  imageUrl: string;
  initialRotationY: number;
  label: string;
  selectedViewId: string;
  views: SourceComparisonView[];
}
interface SourceComparisonView {
  id: string;
  imageIndex: number;
  imageUrl: string;
  initialRotationY: number;
  label: string;
}
const sourceComparison = ref<SourceComparison | null>(null);
const isResolvingSourceComparison = ref(false);
const showSourceComparison = ref(false);
const selectedSourceViewId = ref("");
const sourceImageLoaded = ref(false);
const sourceImageError = ref(false);
const activeSourceComparisonView = computed<SourceComparisonView | null>(() => {
  const comparison = sourceComparison.value;
  if (!comparison) return null;

  return (
    comparison.views.find((view) => view.id === selectedSourceViewId.value) ??
    comparison.views[0] ??
    null
  );
});
const comparisonResetKey = ref(0);
const comparisonViewerKey = computed(
  () => `${previewModelUrl.value}:${selectedSourceViewId.value}:${comparisonResetKey.value}`
);
let previewModelRequestId = 0;
let sourceComparisonRequestId = 0;

const resolvePreviewModel = async () => {
  if (!import.meta.client || !isThreeDPreview.value) return;

  const requestId = ++previewModelRequestId;
  const candidateName = requestedCatalogModel.value?.fileName ?? fallbackPreviewModelName.value;
  isResolvingPreviewModel.value = true;

  try {
    const response = await fetch(getPreviewModelUrl(candidateName), {
      method: "HEAD",
      cache: "no-store",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const candidateExists = response.ok && !contentType.includes("text/html");

    if (requestId !== previewModelRequestId) return;
    previewModelName.value = candidateExists
      ? candidateName
      : fallbackPreviewModelName.value;
    isUsingDefaultPreviewModel.value = !candidateExists;
  } catch {
    if (requestId !== previewModelRequestId) return;
    previewModelName.value = fallbackPreviewModelName.value;
    isUsingDefaultPreviewModel.value = true;
  } finally {
    if (requestId === previewModelRequestId) {
      isResolvingPreviewModel.value = false;
    }
  }
};

watch(
  [activeCatalogModelId, fallbackPreviewModelName, isThreeDPreview],
  () => void resolvePreviewModel(),
  { immediate: true }
);

const resolveSourceComparison = async () => {
  const requestId = ++sourceComparisonRequestId;
  sourceComparison.value = null;
  selectedSourceViewId.value = "";
  showSourceComparison.value = false;

  if (!import.meta.client || !sourceComparisonEnabled || !isThreeDPreview.value) return;

  isResolvingSourceComparison.value = true;
  try {
    const response = await fetch(
      `/api/3d/source-comparison?model=${encodeURIComponent(previewModelName.value)}`,
      { cache: "no-store" }
    );
    if (!response.ok) return;

    const payload = (await response.json()) as SourceComparison;
    if (requestId === sourceComparisonRequestId) {
      sourceComparison.value = payload;
      selectedSourceViewId.value = payload.selectedViewId;
    }
  } catch {
    // The private review helper is optional and remains hidden when unavailable.
  } finally {
    if (requestId === sourceComparisonRequestId) {
      isResolvingSourceComparison.value = false;
    }
  }
};

watch(
  [previewModelName, isThreeDPreview],
  () => void resolveSourceComparison(),
  { immediate: true }
);

watch(showSourceComparison, (isVisible) => {
  if (isVisible) comparisonResetKey.value += 1;
});

watch(selectedSourceViewId, () => {
  sourceImageLoaded.value = false;
  sourceImageError.value = false;
});
type PreviewMaterialStyle = "original" | "glass" | "glow" | "iridescent";
const previewMaterials: Array<{
  id: PreviewMaterialStyle;
  label: string;
  short: string;
  description: string;
  swatch: string;
}> = [
  {
    id: "original",
    label: "Original",
    short: "Argile / texture",
    description: "Conserve la texture du GLB ou applique une argile rose au maillage brut.",
    swatch: "linear-gradient(135deg, #f7d7e3, #c991aa)",
  },
  {
    id: "glass",
    label: "Verre",
    short: "Rose translucide",
    description: "Transmission, réfraction douce et reflets de studio sur un verre rose.",
    swatch: "linear-gradient(135deg, #ffffff 8%, #bde9ff 42%, #ffb8dc 78%, #ffffff)",
  },
  {
    id: "glow",
    label: "Glow",
    short: "Néon émissif",
    description: "Émission rose pulsée et halo lumineux sur un fond nocturne.",
    swatch: "radial-gradient(circle at 35% 30%, #ffffff, #ff2b9b 24%, #6d0b6f 58%, #13031f)",
  },
  {
    id: "iridescent",
    label: "Nacre",
    short: "Irisée",
    description: "Une matière claire dont les reflets varient entre cyan, lilas et rose.",
    swatch: "linear-gradient(135deg, #9ff7ec, #ddd2ff 46%, #ffcae1 72%, #fff6ce)",
  },
];
const requestedMaterial = Array.isArray(route.query.material)
  ? route.query.material[0]
  : route.query.material;
const activePreviewMaterial = ref<PreviewMaterialStyle>(
  previewMaterials.some((material) => material.id === requestedMaterial)
    ? (requestedMaterial as PreviewMaterialStyle)
    : "original"
);
const activePreviewMaterialContent = computed(
  () =>
    previewMaterials.find((material) => material.id === activePreviewMaterial.value) ??
    previewMaterials[0]
);

type PreviewSymptom = "none" | "asymmetry" | "skin" | "dimpling" | "nipple";

const activePreviewSymptom = ref<PreviewSymptom>("none");
const previewSymptoms: Array<{
  id: PreviewSymptom;
  label: string;
  short: string;
  description: string;
}> = [
  {
    id: "none",
    label: "Modèle neutre",
    short: "Masquer les annotations",
    description: "Le maillage original, sans modification ni annotation.",
  },
  {
    id: "asymmetry",
    label: "Taille ou asymétrie",
    short: "Comparer les deux volumes",
    description:
      "La différence de volume est montrée directement par la forme des deux seins, sans contour ajouté.",
  },
  {
    id: "skin",
    label: "Aspect de la peau",
    short: "Rougeur et peau d’orange",
    description:
      "La rougeur et le microrelief intégrés au maillage illustrent une texture de peau d’orange à surveiller.",
  },
  {
    id: "dimpling",
    label: "Fossettes ou croûtes",
    short: "Petites zones localisées",
    description:
      "Les rétractions du maillage et les petits reliefs irréguliers illustrent fossettes ou croûtes inhabituelles.",
  },
  {
    id: "nipple",
    label: "Mamelon ou écoulement",
    short: "Modification localisée",
    description:
      "Des gouttes se forment au mamelon, se détachent puis tombent pour illustrer un écoulement spontané.",
  },
];

const activePreviewSymptomContent = computed(
  () =>
    previewSymptoms.find((symptom) => symptom.id === activePreviewSymptom.value) ??
    previewSymptoms[0]
);

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

declare const useNuxtApp: () => { $gsap: any };
const { $gsap } = useNuxtApp();

const globalContainer = ref(null);
const mainLayoutRef = ref(null); // Ref to MainLayout component
const symptomsAndExaminationContainerRef = ref<HTMLElement | null>(null);
const sharedProfileModelRef = ref<HTMLElement | null>(null);
const journeyTrackRef = ref<HTMLElement | null>(null);
const journeyStageRef = ref<HTMLElement | null>(null);
const symptomsProfileProgress = ref(0);
const activeSectionSymptom = ref<SymptomType>("none");
const isSymptomsProfileView = ref(true);

// Journey stage: one scene with the screening bust and the symptoms bust. The
// ScrollTrigger below scrubs the camera from the screening framing, over the
// first bust's shoulder, onto the second one in profile.
const journeyCamera = reactive({ progress: 0 });
const isJourneyDebug = computed(() => route.query.journeyDebug === "1");
// The content wrapper carries a 1s transform transition when the loading gate
// lifts; mounting the fixed stage before it ends would resolve `fixed` against
// the transformed ancestor and size the canvas to the whole document.
const journeyStageReady = ref(false);
// Same asset as the screening section's viewer, so the browser cache serves it.
const journeyFirstModelUrl = computed(() => {
  return getModelUrl(monoviewFileName);
});

let journeyCameraTimeline: any = null;
let journeyStageInAnimation: any = null;
let journeyStageOutAnimation: any = null;
let journeyStageReadyTimer: number | null = null;

const killJourneyAnimations = () => {
  [journeyCameraTimeline, journeyStageInAnimation, journeyStageOutAnimation].forEach(
    (animation) => {
      animation?.scrollTrigger?.kill?.();
      animation?.kill?.();
    }
  );
  journeyCameraTimeline = null;
  journeyStageInAnimation = null;
  journeyStageOutAnimation = null;
};

// The stage mounts only once the wrapper's exit transform has fully
// transitioned; its ScrollTriggers and camera timeline follow right after.
watch(journeyStageReady, (ready) => {
  if (!ready) return;
  nextTick(() => initializeJourneyStage());
});

const initializeJourneyStage = () => {
  const track = journeyTrackRef.value;
  const stage = journeyStageRef.value;
  if (!track || !stage || !symptomsAndExaminationContainerRef.value) return;

  killJourneyAnimations();

  // The stage fades in while the screening section slides up, and out again as
  // the resources section takes the viewport.
  journeyStageInAnimation = $gsap.fromTo(
    stage,
    { autoAlpha: 0 },
    {
      autoAlpha: 1,
      ease: "none",
      scrollTrigger: {
        trigger: track,
        start: "top bottom",
        end: "top 20%",
        scrub: true,
      },
    }
  );
  journeyStageOutAnimation = $gsap.to(stage, {
    autoAlpha: 0,
    ease: "none",
    immediateRender: false,
    scrollTrigger: {
      trigger: symptomsAndExaminationContainerRef.value,
      start: "bottom 92%",
      end: "bottom 55%",
      scrub: true,
    },
  });

  // Hold the opening framing through most of the screening scroll, then spend
  // the remaining runway (screening outro + symptoms rise-in) on the move so
  // the camera locks on the profile exactly when the symptoms section pins.
  journeyCameraTimeline = $gsap.timeline({
    scrollTrigger: {
      trigger: track,
      start: "top top",
      endTrigger: symptomsAndExaminationContainerRef.value,
      end: "top top",
      scrub: 0.8,
      invalidateOnRefresh: true,
    },
  });
  journeyCameraTimeline
    .to({}, { duration: 3, ease: "none" })
    .to(journeyCamera, { progress: 1, duration: 1, ease: "power1.inOut" });

  // The loading gate collapses the document height while it hides the page;
  // re-measure every trigger once the real layout is back.
  ScrollTrigger.refresh();
};

// Called wherever the shared-model animation is initialized: the stage mounts
// 1.1s later, once the wrapper's exit transform has fully transitioned.
const scheduleJourneyStageMount = () => {
  if (journeyStageReadyTimer) window.clearTimeout(journeyStageReadyTimer);
  journeyStageReadyTimer = window.setTimeout(() => {
    journeyStageReady.value = true;
  }, 1100);
};

let sharedModelAnimation: any = null;

const initializeSharedModelAnimation = () => {
  if (!symptomsAndExaminationContainerRef.value || !sharedProfileModelRef.value) return;

  sharedModelAnimation?.scrollTrigger?.kill();
  sharedModelAnimation?.kill();

  sharedModelAnimation = $gsap.fromTo(
    sharedProfileModelRef.value,
    { yPercent: 118, opacity: 0 },
    {
      yPercent: 0,
      opacity: 1,
      ease: "none",
      scrollTrigger: {
        trigger: symptomsAndExaminationContainerRef.value,
        start: "top bottom",
        end: "top top",
        scrub: 1,
      },
    }
  );
};

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
            initializeSharedModelAnimation();
            scheduleJourneyStageMount();
          });
        }, 120);
      });
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  sharedModelAnimation?.scrollTrigger?.kill();
  sharedModelAnimation?.kill();
  sharedModelAnimation = null;
  killJourneyAnimations();
  if (journeyStageReadyTimer) window.clearTimeout(journeyStageReadyTimer);
});

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
  lenis.value.stop();

  if (store.sections.loading?.state === "isComplete") {
    nextTick(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          initializeSharedModelAnimation();
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
