<template>
  <section
    ref="sectionRef"
    class="relative z-20 bg-white min-h-[450svh]"
  >
    <div v-if="isIOS" class="h-svh"></div>
    <div
      class="h-[100svh] w-full top-0 overflow-hidden bg-white"
      :class="{
        sticky: !isIOS,
        fixed: isIOS,
      }"
    >
      <!-- Anchored 3D bust model on left side (same styling and positioning as SymptomsSection) -->
      <div
        ref="profileModelRef"
        class="pointer-events-none absolute bottom-[-15svh] left-0 z-10 mx-0 h-[115svh] w-[min(78vw,42rem)] opacity-25 lg:opacity-100 max-md:w-[95vw]"
        aria-hidden="true"
      >
        <ThreeBustViewer
          model-url="/models/bust-multiview-v2-symptoms.glb"
          :auto-rotate="false"
          :enable-zoom="false"
          :interactive="false"
          :initial-rotation-y="Math.PI / 2"
          :model-scale="1.18"
          model-horizontal-alignment="left"
          :show-backdrop="false"
          :show-loading-indicator="false"
          compact
        />
      </div>

      <!-- Right column content -->
      <div
        class="relative z-20 h-full w-full flex items-center justify-end px-5 sm:px-10 lg:px-16 pointer-events-auto"
      >
        <div
          class="w-full lg:w-[54%] max-w-[620px] flex flex-col justify-center space-y-4 lg:space-y-6 pt-16 sm:pt-20 lg:pt-0"
        >
          <!-- Intro text (formerly in grand title header) -->
          <div ref="introTextRef" class="w-full">
            <h2
              class="text-2xl sm:text-3xl lg:text-4xl font-medium leading-[1.25] text-primary tracking-tight"
            >
              <span class="text-primary"
                >L’autopalpation est à réaliser une fois par mois, de préférence
                quelques
              </span>
              <span
                ref="fadeTextRef"
                class="text-primary/35 transition-colors duration-300"
              >
                jours après la fin de vos règles, lorsque vos seins sont moins
                sensibles
              </span>
            </h2>
          </div>

          <!-- Video (landscape) + stacked post-it cards -->
          <ExaminationSteps
            :steps="steps"
            :parent-section="sectionRef"
          />
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import ExaminationSteps from "~/components/ui/ExaminationSteps.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useAnimationsStore } from "~/stores";
import { useIsIOS } from "~/composables/useIsIOS";

declare const useNuxtApp: () => { $gsap: any };

interface Step {
  content: string;
  videoUrl?: string;
  mobileUrl?: string;
  desktopUrl?: string;
}

interface Props {
  steps: Step[];
}

defineProps<Props>();

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();
const { isIOS } = useIsIOS();

const sectionRef = ref<HTMLElement | null>(null);
const profileModelRef = ref<HTMLElement | null>(null);
const introTextRef = ref<HTMLElement | null>(null);
const fadeTextRef = ref<HTMLElement | null>(null);

let textFadeTween: any = null;

const initializeSectionAnimations = () => {
  if (!sectionRef.value || !fadeTextRef.value) return;

  // Signal completion of header section state
  store.updateSectionState("self-examination-header", "isComplete");

  textFadeTween?.scrollTrigger?.kill();
  textFadeTween?.kill();

  textFadeTween = $gsap.fromTo(
    fadeTextRef.value,
    { opacity: 0.35 },
    {
      opacity: 1,
      ease: "power1.out",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top top",
        end: "14% top",
        scrub: 0.6,
      },
    }
  );
};

onMounted(() => {
  if (store.getSectionState("loading") === "isComplete") {
    nextTick(() => {
      setTimeout(() => {
        requestAnimationFrame(() => {
          initializeSectionAnimations();
        });
      }, 100);
    });
  }
});

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (loadingState === "isComplete" && sectionRef.value) {
      nextTick(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            initializeSectionAnimations();
          });
        }, 100);
      });
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  textFadeTween?.scrollTrigger?.kill();
  textFadeTween?.kill();
  textFadeTween = null;
});
</script>
