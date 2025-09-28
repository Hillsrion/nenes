<template>
  <section
    class="min-h-screen py-16 bg-gradient-to-br from-nenes-sky-light to-nenes-sky-dark"
    ref="sectionRef"
  >
    <div class="max-w-6xl mx-auto px-8 text-center">
      <div class="mb-16">
        <h2 class="text-4xl font-bold text-gray-800 mb-4">
          RESSOURCES ESSENTIELLES
        </h2>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
        <div
          v-for="(resource, index) in resources"
          :key="index"
          class="bg-white/90 rounded-3xl p-8 shadow-lg backdrop-blur-md border border-white/50 opacity-0 translate-y-8 transition-all duration-700 ease-out"
          :class="{ 'opacity-100 translate-y-0 animate-slide-up': isVisible }"
          :style="{ animationDelay: `${index * 0.2}s` }"
        >
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-2xl font-semibold text-gray-800 flex-1">
              {{ resource.title }}
            </h3>
            <div
              class="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center ml-4"
            >
              <div class="w-6 h-6 rounded-full bg-white/30"></div>
            </div>
          </div>

          <div class="text-left">
            <div class="mb-4">
              <p
                class="text-xl font-semibold text-gray-700 mb-2"
                v-if="resource.phone"
              >
                {{ resource.phone }}
              </p>
              <p
                class="text-xl font-semibold text-gray-700 mb-2"
                v-if="resource.website"
              >
                {{ resource.website }}
              </p>
            </div>
            <p class="text-gray-600 leading-relaxed">
              {{ resource.description }}
            </p>
          </div>
        </div>
      </div>

      <div
        class="border-t border-white/30 pt-8 flex justify-between items-center text-gray-600"
      >
        <p class="text-lg">© 2025 - nénés</p>
        <p class="text-lg">Site par Anaïs & Ismaël</p>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";

const sectionRef = ref(null);
const isVisible = ref(false);

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

onMounted(() => {
  const observer = new IntersectionObserver(
    ([entry]) => {
      if (entry.isIntersecting) {
        isVisible.value = true;
      }
    },
    { threshold: 0.2 }
  );

  if (sectionRef.value) {
    observer.observe(sectionRef.value);
  }
});
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-cols-1 {
    @apply grid-cols-1;
  }

  .text-4xl {
    @apply text-2xl;
  }

  .text-2xl {
    @apply text-xl;
  }

  .text-xl {
    @apply text-lg;
  }

  .flex {
    @apply flex-col gap-4 text-center;
  }
}
</style>
