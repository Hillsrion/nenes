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
      ref="frameRef"
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
      <div v-if="!useSharedModel" ref="localVideoLayerRef" class="pointer-events-none absolute inset-0 z-0" />
      <!-- Dedicated animated bust, driven by the video step. -->
      <div
        v-if="!useSharedModel"
        ref="profileModelRef"
        class="palpation-model pointer-events-none absolute left-0 z-10"
        :style="{ visibility: mobileVideoActive ? 'hidden' : undefined }"
        aria-hidden="true"
      >
        <ThreeBustViewer
          material-style="iridescent"
          :model-url="getModelUrl(palpationFileName)"
          :animation-step="activeStepId"
          :animation-enabled="modelPresence > 0"
          :palpation-progress="modelPresence"
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
          <div ref="introTextRef" class="palpation-intro invisible opacity-0 relative z-30 w-full max-w-[740px]">
            <h2
              class="text-2xl sm:text-3xl lg:text-[2.2rem] xl:text-[2.45rem] font-medium leading-[1.28] text-primary tracking-tight select-none"
            >
              <span
                v-for="(word, index) in paragraphWords"
                :key="`word-${index}`"
                :ref="(el) => setWordRef(el, index)"
                class="inline-block mr-[0.26em] text-primary"
                style="opacity: 0.2"
              >
                {{ word }}
              </span>
            </h2>
          </div>

          <!-- Mobile puts the background video behind the model and the cards over its head. -->
          <div class="palpation-demonstration relative z-20 mt-4 sm:mt-5 w-full">
            <ExaminationSteps
              :steps="steps"
              :parent-section="sectionRef"
              :intro-element="introTextRef"
              :intro-words="wordRefs"
              :background-video-target="backgroundVideoTarget ?? localVideoLayerRef"
              :background-video-active="mobileVideoActive"
              @step-change="activeStepIndex = $event"
              @stage-visibility="demonstrationVisibility = $event"
            />
          </div>
        </div>
      </div>
      <button
        v-if="mobileDemonstrationActive"
        type="button"
        class="palpation-view-toggle absolute z-30 inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-white shadow-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary lg:hidden"
        @click="mobileView = mobileView === 'model' ? 'video' : 'model'"
      >
        <svg v-if="mobileView === 'model'" aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="m9 5 10 7-10 7V5Z" />
        </svg>
        <svg v-else aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round">
          <path d="m12 3 9 5v8l-9 5-9-5V8l9-5Z M3 8l9 5 9-5 M12 13v8" />
        </svg>
        {{ mobileView === 'model' ? 'Voir la vidéo' : 'Voir le modèle 3D' }}
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import { useElementVisibility, useMediaQuery } from "@vueuse/core";
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
  backgroundVideoTarget?: HTMLElement | null;
}

const props = withDefaults(defineProps<Props>(), {
  useSharedModel: false,
});

const emit = defineEmits<{
  (event: "model-presence", progress: number): void;
  (event: "step-change", id: string): void;
  (event: "demonstration-active", active: boolean): void;
  (event: "video-view-active", active: boolean): void;
}>();
const activeStepIndex = ref(0);
const activeStepId = computed(() => props.steps[activeStepIndex.value]?.id ?? "observation");
watch(activeStepId, id => emit("step-change", id), { immediate: true });
const modelPresence = ref(0);
const frameRef = ref<HTMLElement | null>(null);
const localVideoLayerRef = ref<HTMLElement | null>(null);
const frameVisible = useElementVisibility(frameRef);
const isMobileLayout = useMediaQuery('(max-width: 1023px)');
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
const sectionVisible = useElementVisibility(sectionRef);
const backgroundVideoActive = computed(() => isMobileLayout.value && sectionVisible.value && frameVisible.value && modelPresence.value > 0);
const demonstrationVisibility = ref(0);
const mobileView = ref<'model' | 'video'>('model');
const mobileDemonstrationActive = computed(() => backgroundVideoActive.value && demonstrationVisibility.value > 0);
const mobileVideoActive = computed(() => mobileDemonstrationActive.value && mobileView.value === 'video');
watch(mobileDemonstrationActive, active => emit("demonstration-active", active), { immediate: true });
watch(mobileVideoActive, active => emit("video-view-active", active), { immediate: true });
const profileModelRef = ref<HTMLElement | null>(null);
const introTextRef = ref<HTMLElement | null>(null);

const initializeSectionAnimations = () => {
  if (!sectionRef.value) return;

  // Signal completion of header section state
  store.updateSectionState("self-examination-header", "isComplete");

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
  emit("demonstration-active", false);
  emit("video-view-active", false);
});
</script>

<style scoped>
.palpation-model { top: -5svh; height: 112svh; width: 50vw; }
.palpation-content { display: grid; grid-template-areas: 'stage'; align-items: center; }
.palpation-intro, .palpation-demonstration { grid-area: stage; }
.palpation-demonstration { margin-top: 0; }
@media (max-width: 1023px) {
  .palpation-model { top: 36svh; left: 0; width: 100vw; height: 90svh; }
  .palpation-content { width: 100%; padding-top: 0; }
  .palpation-intro { position: absolute; inset-block: 0; left: 24px; width: calc(100% - 48px); display: flex; align-items: center; }
  .palpation-content h2 { font-size: clamp(1.5rem, 4vw, 2rem); line-height: 1.35; }
  .palpation-demonstration { position: absolute; top: max(48px, calc(env(safe-area-inset-top, 0px) + 32px)); left: 28px; width: calc(100% - 56px); margin-top: 0; }
  .palpation-view-toggle { right: max(20px, calc(env(safe-area-inset-right, 0px) + 16px)); bottom: max(24px, calc(env(safe-area-inset-bottom, 0px) + 16px)); }
  .palpation-content :deep(.examination-cards) { position: relative; top: 0; left: 0; width: 100%; max-width: none; margin: 0; min-height: clamp(160px, 22svh, 210px); }
  .palpation-content :deep(.examination-postit) { min-height: clamp(160px, 22svh, 210px); }
  .palpation-content :deep(.postit-content) { padding: 1rem 1rem 1rem 2rem; }
  .palpation-content :deep(p) { font-size: clamp(0.875rem, 2.35vw, 1.125rem); line-height: 1.5; }
}
@media (max-width: 1023px) and (max-height: 600px) and (orientation: portrait) {
  .palpation-content h2 { font-size: 1.25rem; }
  .palpation-content :deep(.examination-cards), .palpation-content :deep(.examination-postit) { min-height: 160px; }
  .palpation-content :deep(.postit-content) { padding: 1rem 0.8rem 1rem 1.8rem; }
}
@media (max-width: 1023px) and (orientation: landscape) {
  .palpation-content h2 { font-size: clamp(1.125rem, 2.4vw, 1.5rem); }
  .palpation-demonstration { left: 50%; width: min(420px, 70vw); transform: translateX(-50%); }
  .palpation-content :deep(.examination-cards), .palpation-content :deep(.examination-postit) { min-height: 140px; }
  .palpation-content :deep(.postit-content) { padding: 0.75rem 0.65rem 0.75rem 1.7rem; }
  .palpation-content :deep(p) { font-size: 0.75rem; line-height: 1.4; }
}
</style>
