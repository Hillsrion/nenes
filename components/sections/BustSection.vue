<template>
  <section
    ref="sectionRef"
    class="py-24 min-h-screen relative z-20 bg-gradient-to-b from-white to-[#fff5f8] overflow-hidden"
  >
    <div class="max-w-7xl mx-auto px-6 md:px-12">
      <!-- Section Header -->
      <div class="mb-16 text-center max-w-3xl mx-auto">
        <h2
          ref="titleRef"
          class="text-4xl md:text-5xl font-bold text-primary mb-6 leading-tight opacity-0 translate-y-8"
        >
          Diversité & Anatomie
        </h2>
        <p
          ref="descRef"
          class="text-lg md:text-xl text-secondary leading-relaxed font-medium opacity-0 translate-y-8"
        >
          Toutes les poitrines sont uniques. Apprendre à connaître les différentes formes naturelles
          aide à mieux repérer les changements inhabituels lors de l'autopalpation.
        </p>
      </div>

      <!-- Main Interactive Content Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <!-- Interactive 3D canvas (6 cols on large screens) -->
        <div class="lg:col-span-7 relative order-1 lg:order-2">
          <div
            class="relative rounded-3xl bg-gradient-to-tr from-[#ffeef4] to-white p-4 shadow-xl border border-[#ffd2e1]/40 overflow-hidden"
            ref="canvasContainerRef"
          >
            <!-- Background ambient lights glow -->
            <div class="absolute -top-24 -left-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -bottom-24 -right-24 w-48 h-48 bg-[#f472b6]/10 rounded-full blur-3xl pointer-events-none"></div>

            <ThreeBustViewer
              :shape-type="activeShape"
              :scroll-progress="scrollProgress"
              :auto-rotate="!isUserInteracting"
              @mousedown="isUserInteracting = true"
              @touchstart="isUserInteracting = true"
            />

            <!-- Drag to rotate hint -->
            <div class="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-white/80 backdrop-blur px-4 py-2 rounded-full text-xs text-primary font-medium border border-primary/10 pointer-events-none shadow-sm transition-opacity duration-300">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 animate-pulse text-[#f472b6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
              Faites glisser pour faire pivoter le buste
            </div>
          </div>
        </div>

        <!-- Copy and Selector Panel (5 cols on large screens) -->
        <div class="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <!-- Selection buttons -->
          <div class="flex flex-col gap-3" ref="selectorPanelRef">
            <button
              v-for="shape in shapes"
              :key="shape.id"
              @click="selectShape(shape.id)"
              class="w-full text-left p-5 rounded-2xl border transition-all duration-300 flex items-start gap-4 shadow-sm"
              :class="[
                activeShape === shape.id
                  ? 'bg-white border-primary/30 ring-1 ring-primary/20 scale-[1.02] shadow-md'
                  : 'bg-white/40 hover:bg-white/70 border-primary/5 hover:border-primary/10'
              ]"
            >
              <!-- Icon indicator -->
              <span
                class="w-6 h-6 rounded-full flex items-center justify-center border text-xs font-semibold mt-0.5 shrink-0 transition-colors"
                :class="[
                  activeShape === shape.id
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white text-secondary border-primary/10'
                ]"
              >
                ✓
              </span>

              <div class="flex flex-col">
                <span class="font-bold text-primary text-lg">{{ shape.name }}</span>
                <span class="text-xs text-[#f472b6] font-semibold tracking-wider uppercase mt-1">
                  {{ shape.subtitle }}
                </span>
              </div>
            </button>
          </div>

          <!-- Description Card (Dynamic based on selected shape) -->
          <div
            class="bg-white p-6 rounded-2xl shadow-lg border border-primary/10 min-h-[160px] flex flex-col justify-between transition-all duration-500 relative overflow-hidden"
            ref="descCardRef"
          >
            <!-- Decorative badge -->
            <div class="absolute right-0 top-0 translate-x-4 -translate-y-4 w-20 h-20 bg-primary/5 rounded-full blur-lg"></div>

            <div>
              <p class="text-secondary font-medium leading-relaxed mb-4 text-base md:text-lg">
                {{ activeShapeContent.description }}
              </p>
              
              <div class="border-t border-primary/10 pt-4 mt-2">
                <h4 class="text-xs font-bold uppercase tracking-wider text-primary mb-2">Conseil d'autopalpation</h4>
                <p class="text-xs md:text-sm text-secondary italic">
                  {{ activeShapeContent.advice }}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useAnimationsStore } from "~/stores";

declare const useNuxtApp: () => { $gsap: any };

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();

const sectionRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);
const descRef = ref<HTMLElement | null>(null);
const selectorPanelRef = ref<HTMLElement | null>(null);
const descCardRef = ref<HTMLElement | null>(null);
const canvasContainerRef = ref<HTMLElement | null>(null);

const activeShape = ref<"round" | "asymmetric" | "ptose" | "mastectomy">("round");
const scrollProgress = ref(0);
const isUserInteracting = ref(false);

const shapes = [
  {
    id: "round" as const,
    name: "Symétrique & Ronde",
    subtitle: "Variation standard",
    description: "Une poitrine à la symétrie naturelle où les deux seins ont un volume et un galbe globalement uniformes. C'est la structure anatomique la plus représentée dans les manuels médicaux.",
    advice: "Palpez en faisant des cercles concentriques depuis la clavicule jusqu'au mamelon. La symétrie aide à comparer facilement une zone suspecte avec l'autre sein.",
  },
  {
    id: "asymmetric" as const,
    name: "Asymétrique",
    subtitle: "Variation naturelle fréquente",
    description: "Il est extrêmement fréquent et tout à fait normal d'avoir un sein plus grand, plus haut ou de forme différente de l'autre. L'asymétrie naturelle fait partie de la diversité des corps sains.",
    advice: "Ne cherchez pas une symétrie parfaite lors de l'autopalpation. L'important est d'identifier si l'asymétrie change soudainement de volume ou de consistance.",
  },
  {
    id: "ptose" as const,
    name: "Ptôse Mammaire",
    subtitle: "Variation de position",
    description: "Avec le temps, la grossesse ou les variations de poids, la peau se détend et la poitrine s'oriente vers le bas. C'est un phénomène naturel lié à la gravité et à l'élasticité de la peau.",
    advice: "Pensez à bien soutenir le dessous du sein avec une main pendant que vous palpez avec l'autre, pour ne rater aucun tissu glandulaire profond.",
  },
  {
    id: "mastectomy" as const,
    name: "Mastectomie",
    subtitle: "Cicatrice & Reconstruction",
    description: "La mastectomie est l'ablation d'un sein, souvent nécessaire dans le traitement du cancer. Les corps cicatrisés ou reconstruits témoignent du parcours de guérison.",
    advice: "La surveillance reste essentielle sur la zone cicatricielle et le tissu restant. Palpez doucement le long de la cicatrice et de l'aisselle pour détecter toute anomalie.",
  },
];

const activeShapeContent = computed(() => {
  return shapes.find((s) => s.id === activeShape.value) || shapes[0];
});

const selectShape = (shapeId: "round" | "asymmetric" | "ptose" | "mastectomy") => {
  activeShape.value = shapeId;
  isUserInteracting.value = false; // Reset to allow shape transition to be highlighted
  
  // Quick bounce animation on the description card on change
  if (descCardRef.value) {
    $gsap.fromTo(
      descCardRef.value,
      { y: 15, opacity: 0.7 },
      { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" }
    );
  }
};

// Initialize entry animations
onMounted(() => {
  if (process.client) {
    // Setup ScrollTrigger for scroll-linked rotation and reveal animations
    const { ScrollTrigger } = $gsap;
    
    if (ScrollTrigger && sectionRef.value) {
      // 1. Reveal header when scrolled into view
      $gsap.to([titleRef.value, descRef.value], {
        opacity: 1,
        y: 0,
        duration: 1.0,
        stagger: 0.2,
        ease: "power3.out",
        scrollTrigger: {
          trigger: sectionRef.value,
          start: "top 75%",
        },
      });

      // 2. Animate selector buttons entry
      if (selectorPanelRef.value) {
        $gsap.from(selectorPanelRef.value.children, {
          x: -30,
          opacity: 0,
          duration: 0.8,
          stagger: 0.15,
          ease: "power2.out",
          scrollTrigger: {
            trigger: selectorPanelRef.value,
            start: "top 80%",
          },
        });
      }

      // 3. Track scroll progress through the section to feed to ThreeJS rotation
      ScrollTrigger.create({
        trigger: sectionRef.value,
        start: "top bottom",
        end: "bottom top",
        onUpdate: (self: any) => {
          scrollProgress.value = self.progress * 100;
        },
      });
    }
  }
});
</script>

<style scoped>
/* Smooth shape hover and active transformations */
button {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
</style>
