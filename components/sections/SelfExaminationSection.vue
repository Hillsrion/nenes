<template>
  <section
    ref="sectionRef"
    class="relative z-20 min-h-[600svh]"
    :class="useSharedModel ? 'bg-transparent' : 'bg-white'"
  >
    <div v-if="isIOS" class="h-svh"></div>
    <div
      class="h-[100svh] w-full top-0 overflow-hidden"
      :class="[
        useSharedModel ? 'bg-transparent' : 'bg-white',
        {
          sticky: !isIOS,
          fixed: isIOS,
        }
      ]"
    >
      <!-- Anchored 3D bust model on left side (rendered only if not shared with parent) -->
      <div
        v-if="!useSharedModel"
        ref="profileModelRef"
        class="pointer-events-none absolute bottom-[-15svh] left-0 z-10 mx-0 h-[115svh] w-[min(78vw,42rem)] opacity-25 lg:opacity-100 max-md:w-[95vw]"
        aria-hidden="true"
      >
        <ThreeBustViewer
          :model-url="getModelUrl(multiviewFileName)"
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

      <!-- Right column content with widened width -->
      <div
        class="relative z-20 h-full w-full flex items-center justify-end px-4 sm:px-8 lg:px-12 xl:px-16 pointer-events-auto"
      >
        <div
          class="w-full lg:w-[62%] xl:w-[66%] max-w-[780px] xl:max-w-[880px] flex flex-col justify-center pt-8 sm:pt-12 lg:pt-[11vh]"
        >
          <!-- Intro text with word-by-word reveal -->
          <div ref="introTextRef" class="relative z-30 w-full max-w-[740px]">
            <h2
              class="text-2xl sm:text-3xl lg:text-[2.2rem] xl:text-[2.45rem] font-medium leading-[1.28] text-primary tracking-tight select-none"
            >
              <span
                v-for="(word, index) in paragraphWords"
                :key="`word-${index}`"
                :ref="(el) => setWordRef(el, index)"
                class="inline-block mr-[0.26em] text-primary transition-opacity duration-150"
                style="opacity: 0.2"
              >
                {{ word }}
              </span>
            </h2>
          </div>

          <!-- Video & Stacked Post-its with upward overlap onto the text above -->
          <div class="relative z-20 -mt-6 sm:-mt-10 lg:-mt-14 w-full">
            <ExaminationSteps
              :steps="steps"
              :parent-section="sectionRef"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import ExaminationSteps from "~/components/ui/ExaminationSteps.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { useAnimationsStore } from "~/stores";
import { useIsIOS } from "~/composables/useIsIOS";

const { multiviewFileName, getModelUrl } = useDemoBustModelUrls();

declare const useNuxtApp: () => { $gsap: any };

interface Step {
  content: string;
  videoUrl?: string;
  mobileUrl?: string;
  desktopUrl?: string;
}

interface Props {
  steps: Step[];
  useSharedModel?: boolean;
}

withDefaults(defineProps<Props>(), {
  useSharedModel: false,
});

const paragraphText =
  "L’autopalpation est à réaliser une fois par mois, de préférence quelques jours après la fin de vos règles, lorsque vos seins sont moins sensibles";
const paragraphWords = paragraphText.split(" ");
const wordRefs = ref<(HTMLElement | null)[]>([]);

const setWordRef = (el: any, index: number) => {
  if (el) wordRefs.value[index] = el;
};

const { $gsap } = useNuxtApp();
const store = useAnimationsStore();
const { isIOS } = useIsIOS();

const sectionRef = ref<HTMLElement | null>(null);
const profileModelRef = ref<HTMLElement | null>(null);
const introTextRef = ref<HTMLElement | null>(null);

let textRevealTween: any = null;

const initializeSectionAnimations = () => {
  if (!sectionRef.value || wordRefs.value.length === 0) return;

  // Signal completion of header section state
  store.updateSectionState("self-examination-header", "isComplete");

  textRevealTween?.scrollTrigger?.kill();
  textRevealTween?.kill();

  const validWordRefs = wordRefs.value.filter(Boolean);

  // Progressive word-by-word reveal scrubbed on initial scroll segment (0% to 15%)
  textRevealTween = $gsap.to(validWordRefs, {
    opacity: 1,
    stagger: 0.04,
    ease: "none",
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top top",
      end: "15% top",
      scrub: 0.7,
    },
  });
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
  textRevealTween?.scrollTrigger?.kill();
  textRevealTween?.kill();
  textRevealTween = null;
});
</script>
