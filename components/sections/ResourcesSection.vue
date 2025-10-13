<template>
  <section
    class="h-screen py-9 bg-primary rounded-t-4xl sticky top-0 z-30"
    ref="sectionRef"
  >
    <div class="container mx-auto px-8 h-full flex flex-col justify-between">
      <div class="flex items-center justify-between flex-1 pt-15">
        <div class="flex flex-col w-3/5">
          <h2
            class="text-secondary mb-6 uppercase leading-normal text-base tracking-title-sm"
          >
            Ressources essentielles
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-10 mb-16">
            <div
              v-for="(resource, index) in resources"
              :key="index"
              class="text-secondary text-left space-y-4"
            >
              <div class="flex items-center justify-between">
                <h3
                  class="text-2xl leading-tight font-semibold text-secondary flex-1"
                >
                  {{ resource.title }}
                </h3>
              </div>

              <p class="lg:text-xl leading-normal">
                {{ resource.description }}
              </p>
              <p class="text-xl text-secondary" v-if="resource.phone">
                {{ resource.phone }}
              </p>
              <a
                class="text-xl text-secondary underline"
                :href="resource.website"
                target="_blank"
                v-if="resource.website"
              >
                {{ resource.website }}
              </a>
            </div>
          </div>
        </div>
        <div>
          <img
            src="/images/illustrations/1.svg"
            width="221"
            height="221"
            alt="Illustration de poitrine"
          />
        </div>
      </div>

      <div
        class="pt-8 flex justify-between items-center text-secondary leading-normal font-normal text-base"
      >
        <p>© {{ new Date().getFullYear() }} - nénés</p>
        <p>
          Design par
          <a
            href="https://www.instagram.com/anais_boucherie/"
            target="_blank"
            class="underline"
            >Anaïs</a
          >
          - Photos & Dev par
          <a
            href="https://www.instagram.com/ismaelsbn"
            target="_blank"
            class="underline"
            >Ismaël</a
          >
        </p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref } from "vue";

const sectionRef = ref(null);

const resources = ref([
  {
    title: "Numéro national Cancer Info",
    phone: "0 805 123 124 (appel et service gratuits)",
    description:
      "Pour obtenir des informations fiables et échanger avec des spécialistes.",
  },
  {
    title: "Ruban rose",
    website: "www.cancerdusein.org",
    description:
      "Association dédiée à la sensibilisation et au financement de la recherche.",
  },
  {
    title: "La Ligue contre le cancer",
    website: "www.ligue-cancer.net",
    description:
      "Informations, soutien psychologique, accompagnement et groupes de parole.",
  },
  {
    title: "Santé publique France",
    website: "www.santepubliquefrance.fr",
    description: "Recommandations officielles et ressources sur le dépistage.",
  },
]);
</script>