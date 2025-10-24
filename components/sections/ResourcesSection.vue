<template>
  <section
    class="lg:h-screen py-9 bg-primary sticky top-0 z-30 transition-all duration-300 ease-out"
    :class="{ 'rounded-t-4xl': !isAtTop }"
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
        <div
          class="md:w-auto sm:w-3/5 w-2/5 mx-auto my-8 md:mx-0 md:my-0 md:h-auto h-20"
        >
          <ImageSequenceAnimator :progress="illustrationProgress" />
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
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useAnimationsStore } from "../../stores";
import { useNuxtApp } from "nuxt/app";
import ImageSequenceAnimator from "~/components/ui/ImageSequenceAnimator.vue";

// Animation store
const store = useAnimationsStore();
const { $gsap } = useNuxtApp();

// Register ScrollTrigger
$gsap.registerPlugin($gsap.ScrollTrigger);

const sectionRef = ref(null);
let illustrationAnimationTimeline = null;
let topScrollTrigger = null;
const illustrationProgress = ref(0);

// Track if section is at top (sticky)
const isAtTop = ref(false);

// Initialize scroll trigger to track when section reaches top
const initializeTopTracking = () => {
  if (!sectionRef.value) {
    return;
  }

  // Use the section itself as trigger but with proper positioning
  topScrollTrigger = $gsap.timeline({
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top top+=10px",
      end: "bottom top",
      onEnter: () => {
        isAtTop.value = true;
      },
      onLeaveBack: () => {
        isAtTop.value = false;
      },
    },
  });
};

// Initialize illustration animation
const initializeIllustrationAnimation = () => {
  illustrationAnimationTimeline = $gsap.to(
    {},
    {
      duration: 10, // Adjust duration for desired speed
      repeat: -1, // Infinite loop
      ease: "none",
      onUpdate: function () {
        illustrationProgress.value = this.progress() * 100;
      },
    }
  );
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
        initializeIllustrationAnimation();
        initializeTopTracking();
      }, 1000);
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  // Clean up top tracking scroll trigger
  if (topScrollTrigger && topScrollTrigger.scrollTrigger) {
    topScrollTrigger.scrollTrigger.kill();
  }
  if (topScrollTrigger && topScrollTrigger.kill) {
    topScrollTrigger.kill();
  }

  if (illustrationAnimationTimeline && illustrationAnimationTimeline.kill) {
    illustrationAnimationTimeline.kill();
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