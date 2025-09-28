<template>
  <section
    class="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-nenes-blue-light to-nenes-blue-dark"
    ref="sectionRef"
  >
    <div class="max-w-6xl w-full px-8 relative z-10">
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div class="text-white">
          <h2 class="text-3xl lg:text-4xl font-light leading-tight mb-8">
            Chaque année en France, le cancer du sein touche
          </h2>
          <div class="flex flex-col gap-4">
            <span class="text-xl lg:text-2xl font-light text-white/80"
              >plus de</span
            >
            <span
              class="text-4xl lg:text-5xl font-bold text-nenes-yellow shadow-lg"
              >60000 femmes</span
            >
          </div>
        </div>

        <div class="relative h-96">
          <div class="relative w-full h-full">
            <div
              v-for="(image, index) in images"
              :key="index"
              class="absolute w-20 h-20 rounded-full bg-white/10 backdrop-blur-md border-2 border-white/30 opacity-0 translate-y-12 scale-75 transition-all duration-700 ease-out"
              :class="{ 'opacity-100 translate-y-0 scale-100': isVisible }"
              :style="getImageStyle(index)"
            ></div>
          </div>
        </div>
      </div>

      <ScrollIndicator
        text="scroll"
        class="absolute bottom-8 left-1/2 -translate-x-1/2 text-white"
      />
    </div>
  </section>
</template>

<script setup>
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";

const { sectionRef, isVisible } = useSectionVisibility(0.3);
const images = ref([...Array(8)]); // 8 floating images from the design

const getImageStyle = (index) => {
  const positions = [
    { x: "80%", y: "15%" },
    { x: "5%", y: "15%" },
    { x: "15%", y: "25%" },
    { x: "25%", y: "15%" },
    { x: "45%", y: "35%" },
    { x: "70%", y: "25%" },
    { x: "85%", y: "45%" },
    { x: "10%", y: "50%" },
  ];

  return {
    left: positions[index]?.x || "50%",
    top: positions[index]?.y || "50%",
    animationDelay: `${index * 0.2}s`,
  };
};
</script>

<style scoped>
@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1 gap-8 text-center;
  }

  .text-3xl {
    @apply text-2xl lg:text-3xl;
  }

  .text-xl {
    @apply text-lg lg:text-xl;
  }

  .text-4xl {
    @apply text-3xl lg:text-4xl;
  }
}
</style>
