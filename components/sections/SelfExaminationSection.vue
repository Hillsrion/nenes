<template>
  <section
    class="min-h-screen py-16 bg-gradient-to-br from-nenes-pink-medium to-nenes-pink-purple relative"
    ref="sectionRef"
  >
    <div class="max-w-6xl mx-auto px-8">

      <div class="mt-24">
        <div class="text-center mb-16">
          <h2 class="text-5xl font-bold text-white mb-4">L'autopalpation</h2>
          <p class="text-xl text-white/90 max-w-4xl mx-auto leading-relaxed">
            L'autopalpation est à réaliser une fois par mois, de préférence
            quelques jours après la fin de vos règles, lorsque vos seins sont
            moins sensibles
          </p>
        </div>

        <div class="flex flex-col gap-6 mb-16">
          <div
            v-for="(step, index) in examSteps"
            :key="index"
            class="grid grid-cols-3 gap-6 items-center p-8 bg-white/10 backdrop-blur-md border border-white/20 rounded-3xl opacity-70 transition-all duration-500"
            :class="{
              'opacity-100 bg-white/20 scale-105': activeStep === index,
              'opacity-70': activeStep > index,
            }"
          >
            <div
              class="w-16 h-16 rounded-full bg-white/30 flex items-center justify-center text-2xl font-bold text-white"
            >
              {{ step.number }}
            </div>
            <div class="text-white">
              <h3 class="text-2xl font-semibold mb-2">{{ step.title }}</h3>
              <p class="text-white/90 leading-relaxed">
                {{ step.description }}
              </p>
            </div>
            <div
              class="w-24 h-24 rounded-xl bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center"
            >
              <div class="w-16 h-16 rounded-lg bg-white/30"></div>
            </div>
          </div>
        </div>

        <div class="mt-16 text-center">
          <div class="flex justify-center gap-6 flex-wrap">
            <div
              v-for="(image, index) in guideImages"
              :key="`guide-${index}`"
              class="w-48 h-36 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 opacity-0 translate-y-8 transition-all duration-700 ease-out"
              :class="{
                'opacity-100 translate-y-0 animate-slide-up': isVisible,
              }"
              :style="{ animationDelay: `${index * 0.3}s` }"
            >
              <div class="w-full h-full rounded-xl bg-white/30 m-4"></div>
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

const { sectionRef, isVisible } = useSectionVisibility(0.3);
const activeStep = ref(0);

const examSteps = ref([
  {
    number: "01",
    title: "L'observation visuelle",
    description:
      "Placez-vous devant un miroir, les bras le long du corps, puis les mains sur les hanches, et enfin les bras levés au-dessus de la tête. Observez vos seins pour détecter tout changement inhabituel.",
  },
  {
    number: "02",
    title: "La palpation circulaire",
    description:
      "Couvrez l'intégralité du sein, de l'extérieur vers le mamelon, en utilisant différents niveaux de pression (légère, moyenne, forte).",
  },
  {
    number: "03",
    title: "La zone sous l'aisselle",
    description:
      "N'oubliez pas de palper la zone sous l'aisselle ainsi que l'espace entre le sein et l'aisselle.",
  },
  {
    number: "04",
    title: "Le mamelon",
    description:
      "Terminez en pinçant délicatement le mamelon pour vérifier l'absence d'écoulement anormal.",
  },
  {
    number: "05",
    title: "Le sein droit",
    description:
      "Répétez ces mêmes gestes sur le sein droit avec votre main gauche.",
  },
]);

const guideImages = ref([...Array(4)]); // 4 guide images

// Auto-advance through steps when section becomes visible
watch(isVisible, (visible) => {
  if (visible) {
    let stepIndex = 0;
    const interval = setInterval(() => {
      if (stepIndex < examSteps.value.length) {
        activeStep.value = stepIndex;
        stepIndex++;
      } else {
        clearInterval(interval);
      }
    }, 3000);
  }
});
</script>

<style scoped>
/* Responsive adjustments */
@media (max-width: 768px) {
  .grid-cols-3 {
    @apply grid-cols-1 text-center gap-4;
  }

  .text-5xl {
    @apply text-3xl;
  }

  .text-2xl {
    @apply text-xl;
  }

  .w-48 {
    @apply w-40;
  }

  .h-36 {
    @apply h-32;
  }
}
</style>
