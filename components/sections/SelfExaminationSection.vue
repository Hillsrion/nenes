<template>
  <section
    ref="sectionRef"
    id="autopalpation"
    :data-palpation-step="activeStepId"
    class="relative z-20 min-h-[600svh]"
    :class="useSharedModel ? 'bg-transparent' : 'bg-white'"
  >
    <div v-if="isIOS" class="h-svh"></div>
    <div
      class="h-[100svh] w-full top-0 overflow-hidden"
      :style="{ visibility: isIOS && modelPresence <= 0 ? 'hidden' : undefined }"
      :class="[
        useSharedModel ? 'bg-transparent' : 'bg-white',
        {
          sticky: !isIOS,
          fixed: isIOS,
        }
      ]"
    >
      <!-- Dedicated animated bust, driven by the video step. -->
      <div
        ref="profileModelRef"
        class="palpation-model pointer-events-none absolute left-0 z-10"
        aria-hidden="true"
      >
        <ThreeBustViewer
          :model-url="getModelUrl(palpationFileName)"
          :animation-step="activeStepId"
          :animation-enabled="modelPresence > 0"
          :auto-rotate="false"
          :enable-zoom="false"
          :interactive="false"
          :initial-rotation-y="0"
          :model-scale="1.65"
          :model-vertical-offset="-0.48"
          model-horizontal-alignment="center"
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
          class="palpation-content w-full lg:w-[53%] max-w-[780px] flex flex-col justify-center pt-8 sm:pt-12 lg:pt-[7vh]"
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

          <!-- Keep the video below the introduction; only the cards overlap the video. -->
          <div class="palpation-demonstration relative z-20 mt-4 sm:mt-5 w-full">
            <ExaminationSteps
              :steps="steps"
              :parent-section="sectionRef"
              @step-change="activeStepIndex = $event"
            />
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import ExaminationSteps from "~/components/ui/ExaminationSteps.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { useAnimationsStore } from "~/stores";
import { useIsIOS } from "~/composables/useIsIOS";

const { palpationFileName, getModelUrl } = useDemoBustModelUrls();

declare const useNuxtApp: () => { $gsap: any };

interface Step {
  id?: string;
  content: string;
  videoUrl?: string;
  mobileUrl?: string;
  desktopUrl?: string;
}

interface Props {
  steps: Step[];
  useSharedModel?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  useSharedModel: false,
});

const emit = defineEmits<{ (event: "model-presence", progress: number): void }>();
const activeStepIndex = ref(0);
const activeStepId = computed(() => props.steps[activeStepIndex.value]?.id ?? "observation");
const modelPresence = ref(0);
let modelEntrance: any = null;

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

  modelEntrance?.scrollTrigger?.kill();
  modelEntrance?.kill();
  modelEntrance = $gsap.fromTo(modelPresence, { value: 0 }, {
    value: 1,
    ease: "none",
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top bottom",
      end: "top 20%",
      scrub: true,
      onUpdate: (self: { progress: number }) => emit("model-presence", self.progress),
    },
  });

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
  modelEntrance?.scrollTrigger?.kill();
  modelEntrance?.kill();
  textRevealTween?.scrollTrigger?.kill();
  textRevealTween?.kill();
  textRevealTween = null;
});
</script>

<style scoped>
.palpation-model { top: -5svh; height: 112svh; width: 50vw; }
@media (max-width: 1023px) {
  .palpation-model { top: 25svh; left: 0; width: 50vw; height: 40svh; }
  .palpation-content { width: 100%; padding-top: 0; }
  .palpation-content > div:first-child { position: absolute; top: 12svh; left: 24px; width: calc(100% - 48px); }
  .palpation-content h2 { font-size: clamp(1rem, 2.5vw, 1.5rem); line-height: 1.35; }
  .palpation-demonstration { position: absolute; top: 37svh; left: 52vw; width: 44vw; margin-top: 0; }
  .palpation-content :deep(.examination-cards) { position: absolute; top: 27svh; left: calc(-52vw + 24px); width: calc(100vw - 48px); margin: 0; min-height: 210px; }
  .palpation-content :deep(.examination-postit) { min-height: 185px; }
  .palpation-content :deep(.postit-content) { padding: 1.2rem 1rem 1.2rem 2rem; }
  .palpation-content :deep(p) { font-size: 0.875rem; line-height: 1.5; }
}
</style>
