<template>
  <main class="min-h-screen bg-secondary-light px-5 py-8 text-primary md:px-10 md:py-12">
    <header class="mx-auto flex max-w-7xl flex-wrap items-start justify-between gap-6">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.22em] text-primary/60">
          Test 3D · chargement
        </p>
        <h1 class="mt-2 text-3xl font-bold tracking-tight md:text-5xl">
          Catalogue des fruits
        </h1>
        <p class="mt-3 max-w-2xl text-sm leading-6 text-primary/70 md:text-base">
          Aperçu des modèles 3D utilisés dans l’animation de chargement. Le rendu
          doux du premier essai est appliqué à des silhouettes issues de vrais scans.
        </p>
      </div>

      <div class="flex flex-wrap gap-3">
        <a
          href="/models-3d"
          class="rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold transition hover:border-primary/50"
        >
          Voir les bustes
        </a>
        <a
          href="/"
          class="rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold transition hover:border-primary/50 hover:bg-primary hover:text-white"
        >
          Retour au site
        </a>
      </div>
    </header>

    <section class="mx-auto mt-10 grid max-w-7xl grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      <article
        v-for="(fruit, index) in loadingFruitSequence"
        :key="fruit.name"
        class="overflow-hidden rounded-3xl border border-primary/10 bg-white shadow-[0_18px_45px_rgba(51,94,222,0.1)]"
      >
        <div class="flex h-40 items-center justify-center bg-primary sm:h-48">
          <div class="h-32 w-32 sm:h-40 sm:w-40">
            <ThreeFruitLoadingAnimator :progress="0" :fruit-index="index" />
          </div>
        </div>
        <div class="flex items-center gap-2 px-4 py-4">
          <span class="text-xl" aria-hidden="true">{{ fruit.emoji }}</span>
          <div>
            <h2 class="text-sm font-bold capitalize md:text-base">{{ fruit.name }}</h2>
            <p class="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-primary/50">
              rendu lisse · source scan
            </p>
          </div>
        </div>
      </article>
    </section>
  </main>
</template>

<script setup lang="ts">
import ThreeFruitLoadingAnimator from "~/components/ui/ThreeFruitLoadingAnimator.vue";
import { loadingFruitSequence } from "~/config/loading-fruits";

useHead({
  title: "Test 3D · Fruits · Nénés",
});

</script>
