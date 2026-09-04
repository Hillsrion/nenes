<template>
  <main class="min-h-screen overflow-hidden bg-primary text-secondary">
    <div class="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-6 md:px-10 md:py-8">
      <header class="flex items-center justify-between gap-6">
        <Logo color="var(--color-secondary)" />
        <div class="flex items-center gap-3 text-xs font-bold uppercase tracking-[0.16em]">
          <span class="rounded-full border border-secondary/30 px-3 py-1.5">Prototype</span>
          <a class="transition hover:text-white" href="/">Retour au site</a>
        </div>
      </header>

      <section class="grid flex-1 items-center gap-10 py-12 lg:grid-cols-[0.82fr_1.18fr] lg:gap-20">
        <div class="max-w-xl">
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-secondary/65">
            Nouveau chargement
          </p>
          <h1 class="mt-4 max-w-lg text-4xl font-bold leading-[0.98] tracking-tight md:text-6xl">
            Des fruits 3D pour accompagner l’attente.
          </h1>
          <p class="mt-6 max-w-md text-base leading-7 text-secondary/75 md:text-lg">
            Une page de test dédiée pour observer le nouveau chargement avant de le
            brancher au parcours principal.
          </p>

          <div class="mt-10 max-w-md">
            <div class="flex items-end justify-between gap-4">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.18em] text-secondary/60">
                  {{ statusLabel }}
                </p>
                <p class="mt-2 text-3xl font-bold tabular-nums md:text-4xl">
                  {{ displayProgress }}<span class="text-secondary/50">%</span>
                </p>
              </div>
              <button
                type="button"
                class="rounded-full border border-secondary/35 px-4 py-2 text-xs font-bold uppercase tracking-[0.14em] transition hover:border-secondary hover:bg-secondary hover:text-primary"
                @click="replay"
              >
                Rejouer
              </button>
            </div>

            <div
              class="mt-5 h-1.5 overflow-hidden rounded-full bg-secondary/20"
              role="progressbar"
              :aria-valuenow="displayProgress"
              aria-valuemin="0"
              aria-valuemax="100"
              aria-label="Progression du chargement 3D"
            >
              <div
                class="h-full rounded-full bg-secondary transition-[width] duration-150"
                :style="{ width: `${displayProgress}%` }"
              />
            </div>
          </div>
        </div>

        <div class="relative mx-auto w-full max-w-2xl">
          <div class="absolute -inset-10 rounded-full bg-secondary/10 blur-3xl" aria-hidden="true" />
          <div
            class="relative h-[min(62vh,38rem)] min-h-[22rem] overflow-hidden rounded-[2.5rem] border border-secondary/20 bg-secondary/[0.08] shadow-2xl shadow-[#1d2e85]/30"
          >
            <ThreeFruitLoadingAnimator :progress="progress" />
            <div
              class="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-primary/35 to-transparent"
              aria-hidden="true"
            />
            <p class="absolute bottom-6 left-1/2 -translate-x-1/2 text-center text-xs font-bold uppercase tracking-[0.2em] text-secondary/60">
              Modèle 3D en rotation
            </p>
          </div>
        </div>
      </section>

      <footer class="flex flex-wrap items-center justify-between gap-3 border-t border-secondary/15 pt-5 text-xs text-secondary/55">
        <span>Les modèles changent au fil de la progression.</span>
        <a class="transition hover:text-secondary" href="/fruits">Voir le catalogue des fruits</a>
      </footer>
    </div>
  </main>
</template>

<script setup lang="ts">
import { gsap } from "gsap";
import Logo from "~/components/ui/Logo.vue";
import ThreeFruitLoadingAnimator from "~/components/ui/ThreeFruitLoadingAnimator.vue";

const progress = ref(0);
const isComplete = ref(false);
let progressTween: gsap.core.Tween | null = null;

const displayProgress = computed(() => Math.round(progress.value));
const statusLabel = computed(() =>
  isComplete.value ? "Chargement terminé" : "Préparation des modèles"
);

const startLoading = () => {
  progressTween?.kill();
  progress.value = 0;
  isComplete.value = false;
  progressTween = gsap.to(progress, {
    value: 100,
    duration: 8,
    ease: "none",
    onComplete: () => {
      progress.value = 100;
      isComplete.value = true;
    },
  });
};

const replay = () => startLoading();

useHead({
  title: "Prototype · Chargement 3D · Nénés",
});

onMounted(() => startLoading());

onUnmounted(() => {
  progressTween?.kill();
});
</script>
