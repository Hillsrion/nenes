<template>
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

      <BustPreviewSidebar :state="state" />

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

<script setup lang="ts">
import { reactive, toRef, toRefs } from "vue";
import ThreeBustViewer from "./ThreeBustViewer.vue";
import BustPreviewSidebar from "./three-bust/BustPreviewSidebar.vue";
import { useBustPreview } from "~/composables/three-bust/useBustPreview";

const props = defineProps<{ enabled: boolean }>();
const state = reactive(useBustPreview(toRef(props, "enabled")));
const {
  activeCatalogModel, previewModelUrl, activePreviewMaterial, activePreviewSymptom,
  showSourceComparison, sourceImageLoaded, sourceImageError, activeSourceComparisonView,
  comparisonResetKey, comparisonViewerKey,
} = toRefs(state);
const isThreeDPreview = toRef(props, "enabled");
</script>
