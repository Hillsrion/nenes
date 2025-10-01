<template>
  <section
    class="min-h-screen py-16 bg-gradient-to-br from-nenes-orange-light to-nenes-orange-dark relative"
    ref="sectionRef"
  >
    <div class="max-w-6xl mx-auto px-8">
      <Logo class="absolute top-8 left-1/2 -translate-x-1/2 z-10" />

      <div class="mt-24">
        <div class="text-center mb-16">
          <h2 class="text-5xl font-bold text-gray-800 mb-4">Les symptômes</h2>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 mb-16">
          <div
            v-for="(symptom, index) in symptoms"
            :key="index"
            class="bg-white/90 rounded-3xl p-8 shadow-lg backdrop-blur-md border border-white/50 opacity-0 translate-y-8 transition-all duration-700 ease-out"
            :class="{ 'opacity-100 translate-y-0 animate-slide-up': isVisible }"
            :style="{ animationDelay: `${index * 0.2}s` }"
          >
            <div
              class="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-purple-600 flex items-center justify-center mb-6"
            >
              <div class="w-8 h-8 rounded-full bg-white/30"></div>
            </div>
            <div>
              <h3 class="text-2xl font-semibold mb-4 text-gray-800">
                {{ symptom.title }}
              </h3>
              <p class="text-gray-600 leading-relaxed">
                {{ symptom.description }}
              </p>
            </div>
          </div>
        </div>

        <div class="text-center">
          <div class="inline-block max-w-2xl w-full">
            <div
              class="bg-white/30 rounded-3xl p-8 backdrop-blur-md border border-white/50"
            >
              <div class="w-full h-64 rounded-xl bg-white/30"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import Logo from "~/components/ui/Logo.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";

const { sectionRef, isVisible } = useSectionVisibility(0.2);

const symptoms = ref([
  {
    title: "L'observation visuelle",
    description: "Modification de la taille, de la forme ou de la symétrie.",
  },
  {
    title: "La palpation circulaire",
    description:
      "Changement d'aspect de la peau (rougeur, aspect de \"peau d'orange\", plis)",
  },
  {
    title: "La zone sous l'aisselle",
    description: "Apparition de fossettes ou de croûtes",
  },
  {
    title: "Le mamelon",
    description: "Écoulement ou modification du mamelon",
  },
]);
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-cols-1 {
    @apply grid-cols-1;
  }

  .text-5xl {
    @apply text-3xl;
  }

  .text-2xl {
    @apply text-xl;
  }
}
</style>
