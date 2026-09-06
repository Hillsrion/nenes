<template>
  <main class="min-h-screen bg-secondary-light px-5 py-8 text-primary md:px-10 md:py-12">
    <header class="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-primary/60">
          Bibliothèque 3D
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
          Catalogue des bustes
        </h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-primary/70 md:text-base">
          Les modèles locaux et publiés peuvent être ouverts directement dans le viewer
          pour être examinés sous tous les angles et avec les différentes matières.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <a
          href="/fruits"
          class="rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold transition hover:border-primary/50"
        >
          Voir les fruits
        </a>
        <a
          href="/"
          class="rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold transition hover:border-primary/50 hover:bg-primary hover:text-white"
        >
          Retour au site
        </a>
      </div>
    </header>

    <section class="mx-auto mt-10 grid max-w-7xl gap-5 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="model in bustModelCatalog"
        :key="model.id"
        class="group relative overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-[0_18px_45px_rgba(51,94,222,0.1)] transition hover:-translate-y-1 hover:border-primary/25 hover:shadow-[0_24px_55px_rgba(51,94,222,0.16)]"
      >
        <div class="relative h-64 bg-[radial-gradient(circle_at_55%_35%,#fff_0%,#ffe9f1_52%,#f8d6e2_100%)]">
          <ThreeBustViewer
            :model-url="getModelUrl(model.fileName)"
            :auto-rotate="true"
            :enable-zoom="false"
            :interactive="false"
            compact
            material-style="glass"
          />
          <span class="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary shadow-sm">
            {{ model.badge }}
          </span>
        </div>

        <div class="p-5">
          <h2 class="text-lg font-bold">{{ model.shortLabel }}</h2>
          <p class="mt-1 min-h-10 text-sm leading-5 text-primary/65">{{ model.description }}</p>
          <span class="mt-5 inline-flex rounded-full bg-primary px-4 py-2 text-xs font-bold text-white transition group-hover:bg-primary/85">
            Ouvrir dans le viewer
          </span>
        </div>

        <a
          :href="getViewerUrl(model.fileName)"
          class="absolute inset-0 z-20 rounded-3xl"
          :aria-label="`Ouvrir ${model.label} dans le viewer`"
        />
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useBustModelCatalog } from "~/composables/useBustModelCatalog";

const runtimeConfig = useRuntimeConfig();
const modelsPublicUrl = String(runtimeConfig.public.r2.modelsPublicUrl || "").replace(/\/+$/, "");
const bustModelCatalog = useBustModelCatalog();

const getModelUrl = (fileName: string) => {
  const encodedName = fileName.split("/").map(encodeURIComponent).join("/");
  if (import.meta.dev) return `/models/${encodedName}`;

  return modelsPublicUrl ? `${modelsPublicUrl}/models/${encodedName}` : `/models/${encodedName}`;
};

const getViewerUrl = (fileName: string) =>
  `/?preview3d=photo&model=${encodeURIComponent(fileName)}&material=glass`;

useHead({ title: "Catalogue 3D · Nénés" });
</script>
