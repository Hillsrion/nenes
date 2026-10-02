<template>
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
        v-model="state.activeCatalogModelId"
        class="mt-2 w-full rounded-xl border border-primary/15 bg-white px-3 py-2.5 text-sm font-bold text-primary outline-none transition focus:border-[#e95678]/50 focus:ring-2 focus:ring-[#e95678]/10"
      >
        <option
          v-for="catalogModel in state.bustModelCatalog"
          :key="catalogModel.id"
          :value="catalogModel.id"
        >
          {{ catalogModel.shortLabel }} · {{ catalogModel.badge }}
        </option>
      </select>

      <div class="mt-2 px-0.5 text-[11px] leading-snug" aria-live="polite">
        <p class="font-bold text-primary">{{ state.activeCatalogModel.label }}</p>
        <p v-if="state.isResolvingPreviewModel" class="mt-0.5 text-secondary">
          Recherche du modèle local…
        </p>
        <p v-else-if="state.isUsingDefaultPreviewModel" class="mt-0.5 text-[#a35f2d]">
          Modèle non généré · affichage du modèle de démonstration
        </p>
        <p v-else class="mt-0.5 text-[#27845b]">Modèle 3D disponible</p>
      </div>

      <p class="mt-2 border-t border-primary/10 pt-2 text-[10px] leading-relaxed text-secondary/75">
        Comparaison visuelle uniquement, sans équivalence médicale de taille.
      </p>
    </div>

    <div
      v-if="state.sourceComparisonEnabled && (state.isResolvingSourceComparison || state.sourceComparison)"
      class="mb-4 rounded-2xl border border-primary/10 bg-white/80 p-3"
    >
      <label class="flex cursor-pointer items-start gap-3">
        <input
          v-model="state.showSourceComparison"
          type="checkbox"
          :disabled="!state.sourceComparison"
          class="mt-0.5 h-4 w-4 rounded border-primary/20 accent-[#e95678]"
        />
        <span>
          <span class="block text-xs font-bold text-primary">Comparer à la photo source</span>
          <span class="mt-0.5 block text-[10px] leading-relaxed text-secondary/80">
            {{
              state.isResolvingSourceComparison
                ? "Recherche de la photo privée…"
                : "Affiche la vue d’origine à côté du modèle, avec le même angle de départ."
            }}
          </span>
        </span>
      </label>
      <label
        v-if="state.sourceComparison && state.sourceComparison.views.length > 1"
        class="mt-3 block border-t border-primary/10 pt-3"
      >
        <span class="block text-[10px] font-bold uppercase tracking-[0.14em] text-secondary">
          Vue à comparer
        </span>
        <select
          v-model="state.selectedSourceViewId"
          class="mt-1.5 w-full rounded-xl border border-primary/10 bg-white px-3 py-2 text-xs font-semibold text-primary outline-none transition focus:border-[#e95678]/50"
        >
          <option v-for="view in state.sourceComparison.views" :key="view.id" :value="view.id">
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
            state.activePreviewMaterial === material.id
              ? 'border-[#e95678]/40 bg-[#fff0f5] text-primary shadow-sm'
              : 'border-primary/8 bg-white text-secondary hover:border-primary/20'
          "
          :aria-pressed="state.activePreviewMaterial === material.id"
          @click="state.activePreviewMaterial = material.id"
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
        {{ state.activePreviewMaterialContent.description }}
      </p>
    </div>

    <div class="flex flex-col gap-2">
      <button
        v-for="symptom in previewSymptoms"
        :key="symptom.id"
        type="button"
        class="rounded-2xl border px-4 py-3 text-left transition"
        :class="
          state.activePreviewSymptom === symptom.id
            ? 'border-[#e95678]/35 bg-[#fff0f4] text-primary shadow-sm'
            : 'border-primary/5 bg-white/70 text-secondary hover:border-primary/15 hover:bg-white'
        "
        @click="state.activePreviewSymptom = symptom.id"
      >
        <span class="block text-sm font-bold">{{ symptom.label }}</span>
        <span class="mt-0.5 block text-[11px] leading-snug opacity-75">
          {{ symptom.short }}
        </span>
      </button>
    </div>

    <p class="mt-4 border-t border-primary/10 px-1 pt-3 text-[11px] leading-relaxed text-secondary">
      {{ state.activePreviewSymptomContent.description }}
    </p>
  </aside>

</template>

<script setup lang="ts">
import { previewMaterials, previewSymptoms } from "~/config/bust-preview-options";
import type { BustPreviewState } from "~/composables/three-bust/useBustPreview";

defineProps<{ state: BustPreviewState }>();
</script>
