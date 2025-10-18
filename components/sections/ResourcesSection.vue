<template>
  <section
    class="lg:h-screen py-9 bg-primary rounded-t-4xl sticky top-0 z-30"
    ref="sectionRef"
  >
    <div
      class="container mx-auto px-6 xl:px-8 h-full flex flex-col justify-between"
    >
      <div
        class="flex flex-wrap items-center justify-between flex-1 lg:pt-15 md:pt-10 sm:pt-6 pt-4"
      >
        <div class="flex flex-col md:w-3/5 w-full">
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
                  class="lg:text-2xl text-xl leading-tight font-semibold text-secondary flex-1"
                >
                  {{ resource.title }}
                </h3>
              </div>

              <p class="lg:text-xl leading-normal">
                {{ resource.description }}
              </p>
              <a
                class="lg:text-xl text-secondary"
                :title="`Appeler le numéro ${resource.phone}`"
                v-if="resource.phone"
                :href="`tel:${resource.phone}`"
              >
                {{ resource.phone }}
                <span class="italic text-base"
                  >(appel et service gratuits)</span
                >
              </a>
              <a
                class="lg:text-xl text-secondary underline"
                :href="
                  resource.website.startsWith('http')
                    ? resource.website
                    : `https://${resource.website}`
                "
                target="_blank"
                v-if="resource.website"
              >
                {{ resource.website }}
              </a>
            </div>
          </div>
        </div>
        <div class="md:w-auto sm:w-4/5 w-3/5 mx-auto my-8 md:mx-0 md:my-0">
          <img
            src="/images/illustrations/1.svg"
            width="221"
            height="221"
            class="mx-auto max-w-full"
            alt="Illustration de poitrine"
          />
        </div>
      </div>

      <div
        class="pt-8 flex flex-wrap gap-2 justify-between items-center text-secondary leading-normal font-normal text-base"
      >
        <p>© {{ new Date().getFullYear() }} - nénés</p>
        <p>
          Design par
          <a href="https://anabanana.fr" target="_blank" class="underline"
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
import { ref, onMounted, onUnmounted } from "vue";
import { useAnimationsStore } from "../../stores";
import { useNuxtApp } from "nuxt/app";

// Animation store
const store = useAnimationsStore();
const { $gsap } = useNuxtApp();

// Register ScrollTrigger
$gsap.registerPlugin($gsap.ScrollTrigger);

const sectionRef = ref(null);
let logoScrollTrigger = null;

// Initialize logo scroll trigger for color change
const initializeLogoColorChangeAnimation = () => {
  logoScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top top+=100px",
      end: "bottom bottom",
      markers: true,
      onEnter: () => {
        store.updateLogoColor(false);
      },
      onLeaveBack: () => {
        store.updateLogoColor(true);
      },
      onEnterBack: () => {
        store.updateLogoColor(false);
      },
    },
  });
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      sectionRef.value &&
      sectionRef.value.parentElement
    ) {
      setTimeout(() => {
        initializeLogoColorChangeAnimation();
      }, 1000);
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  if (logoScrollTrigger && logoScrollTrigger.scrollTrigger) {
    logoScrollTrigger.scrollTrigger.kill();
  }
  if (logoScrollTrigger && logoScrollTrigger.kill) {
    logoScrollTrigger.kill();
  }
});

const resources = [
  {
    title: "Numéro national Cancer Info",
    phone: "0 805 123 124",
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
];
</script>