<template>
  <main class="min-h-screen bg-secondary-light px-6 py-8 text-primary md:px-10 md:py-12">
    <div class="mx-auto max-w-5xl">
      <header class="flex flex-wrap items-start justify-between gap-6">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.24em] text-primary/55">
            Navigation interne
          </p>
          <h1 class="mt-3 text-4xl font-bold tracking-tight md:text-6xl">Liens</h1>
          <p class="mt-4 max-w-2xl text-sm leading-6 text-primary/70 md:text-base">
            Un arbre pour retrouver rapidement les pages du site, les prototypes et les
            outils de test.
          </p>
        </div>

        <a
          href="/"
          class="rounded-full border border-primary/20 bg-white px-5 py-2.5 text-sm font-bold transition hover:border-primary/50 hover:bg-primary hover:text-white"
        >
          Retour au site
        </a>
      </header>

      <nav
        class="mt-12 rounded-[2rem] border border-primary/10 bg-white p-5 shadow-[0_20px_60px_rgba(51,94,222,0.1)] md:p-8"
        aria-label="Arbre de navigation"
      >
        <div class="flex items-center gap-3 border-b border-primary/10 pb-5">
          <span
            class="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-lg text-white"
            aria-hidden="true"
          >
            ↗
          </span>
          <div>
            <p class="text-[10px] font-bold uppercase tracking-[0.18em] text-primary/45">
              Racine
            </p>
            <a href="/" class="font-bold transition hover:text-primary/65">Nénés</a>
          </div>
        </div>

        <ul class="mt-6 space-y-6">
          <li v-for="branch in navTree" :key="branch.label" class="relative pl-7">
            <span
              class="absolute left-0 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white"
              aria-hidden="true"
            >
              {{ branch.icon }}
            </span>
            <span
              v-if="branch.children?.length"
              class="absolute left-[9px] top-6 h-[calc(100%+1.5rem)] border-l border-primary/15"
              aria-hidden="true"
            />

            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-primary/45">
                {{ branch.label }}
              </p>
              <p class="mt-1 text-sm text-primary/65">{{ branch.description }}</p>
            </div>

            <ul v-if="branch.children?.length" class="mt-4 space-y-3">
              <li
                v-for="link in branch.children"
                :key="link.href"
                class="group relative pl-7"
              >
                <span
                  class="absolute left-0 top-1/2 h-px w-5 -translate-y-1/2 bg-primary/15"
                  aria-hidden="true"
                />
                <a
                  :href="link.href"
                  class="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-2xl border border-primary/8 bg-secondary-light/45 px-4 py-3 transition hover:-translate-y-0.5 hover:border-primary/20 hover:bg-secondary-light"
                >
                  <span class="font-bold">{{ link.label }}</span>
                  <span class="text-xs font-mono text-primary/45">{{ link.href }}</span>
                  <span class="basis-full text-xs leading-5 text-primary/60">
                    {{ link.description }}
                  </span>
                </a>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <p class="mt-6 text-xs leading-5 text-primary/50">
        Les pages marquées « Prototype » restent séparées du parcours principal.
      </p>
    </div>
  </main>
</template>

<script setup lang="ts">
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";

type NavLink = {
  label: string;
  href: string;
  description: string;
};

type NavBranch = {
  label: string;
  icon: string;
  description: string;
  children: NavLink[];
};

const { multiviewFileName } = useDemoBustModelUrls();
const multiviewPreviewHref = computed(
  () => `/?preview3d=photo&model=${encodeURIComponent(multiviewFileName)}&material=glass`
);

const navTree: NavBranch[] = [
  {
    label: "Site principal",
    icon: "⌂",
    description: "Le parcours public de prévention et d’information.",
    children: [
      {
        label: "Accueil",
        href: "/",
        description: "Page principale de Nénés.",
      },
    ],
  },
  {
    label: "Prototypes 3D",
    icon: "◇",
    description: "Explorations visuelles isolées du parcours public.",
    children: [
      {
        label: "Chargement avec fruits 3D",
        href: "/loading-3d",
        description: "Prévisualisation du nouveau chargement animé.",
      },
      {
        label: "Catalogue des fruits",
        href: "/fruits",
        description: "Références 3D utilisées pour le chargement.",
      },
      {
        label: "Catalogue des bustes",
        href: "/models-3d",
        description: "Bibliothèque des modèles publiés.",
      },
      {
        label: "Studio photo vers 3D",
        href: "/studio-3d",
        description: "Préparer une génération à partir de plusieurs vues.",
      },
      {
        label: "Viewer du modèle multivue",
        href: multiviewPreviewHref.value,
        description: "Aperçu interactif avec les matières expérimentales.",
      },
    ],
  },
  {
    label: "Outils",
    icon: "+",
    description: "Points d’accès pratiques pour les itérations en cours.",
    children: [
      {
        label: "Index de navigation",
        href: "/links",
        description: "Cette page.",
      },
    ],
  },
];

useHead({
  title: "Liens · Nénés",
});
</script>
