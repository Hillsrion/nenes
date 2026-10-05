<template>
  <div
    ref="containerRef" :data-model-url="modelUrl"
    class="relative h-full w-full"
    :data-animation-step="animationStep ?? currentAnimationStep?.id"
    :data-animation-time="animationTime.toFixed(2)"
    :class="compact ? 'min-h-0' : 'min-h-[350px] md:min-h-[500px]'"
  >
    <div
      v-if="showBackdrop"
      aria-hidden="true"
      class="absolute inset-0 transition-all duration-700"
      :class="materialBackdropClass"
    />

    <!-- Loading indicator -->
    <div
      v-if="isLoading && showLoadingIndicator"
      class="pointer-events-none absolute inset-0 z-20 flex items-center justify-center bg-transparent transition-opacity duration-300"
    >
      <div class="flex flex-col items-center gap-3">
        <div class="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        <p class="text-xs text-primary font-medium tracking-wider uppercase opacity-80">Chargement 3D...</p>
      </div>
    </div>

    <!-- WebGL Canvas -->
    <canvas
      ref="canvasRef"
      class="relative z-10 block h-full w-full touch-none transition-opacity duration-700"
      :class="[
        { 'pointer-events-none': !interactive },
        isLoading ? 'opacity-0' : 'opacity-100',
      ]"
    />
    <svg
      v-if="profileLabel && profileContour"
      class="profile-contour-label pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible text-primary"
      :viewBox="`0 0 ${profileContour.width} ${profileContour.height}`"
      :style="{
        opacity: isLoading || profileLabelProgress <= 0 ? 0 : profileLabelOpacity,
        transition: 'opacity 240ms ease-out',
      }"
      aria-hidden="true"
    >
      <defs><path :id="profileCurveId" :d="profileContour.path" /></defs>
      <text class="font-serif" fill="currentColor" :font-size="Math.max(24, Math.min(38, profileContour.height * 0.031))">
        <textPath :href="`#${profileCurveId}`" :startOffset="`${100 * (1 - profileLabelProgress)}%`">{{ profileLabel.toLocaleLowerCase('fr-FR') }}</textPath>
      </text>
    </svg>
    <div v-if="animationDuration > 0 && interactive && !isLoading" class="absolute bottom-12 left-1/2 z-30 w-[min(90%,38rem)] -translate-x-1/2 rounded-2xl bg-white/95 px-4 py-3 text-sm text-[#702741] shadow-lg">
      <div v-if="animationSteps.length" class="mb-3 border-b border-[#702741]/15 pb-3">
        <div class="flex flex-wrap items-center justify-between gap-2">
          <label class="font-semibold">Étape
            <select aria-label="Étape de palpation" :value="currentAnimationStep?.id" class="ml-2 max-w-[16rem] rounded-lg border border-[#702741]/20 bg-white px-2 py-1" @change="selectAnimationStep">
              <option v-for="(step,index) in animationSteps" :key="step.id" :value="step.id">{{ index + 1 }}. {{ step.title }}</option>
            </select>
          </label>
          <span class="text-xs">{{ animationGestureLabel }}</span>
        </div>
        <p class="mt-2 text-xs leading-relaxed">{{ currentAnimationStep?.content }}</p>
        <p v-if="currentAnimationSegment?.kind === 'axilla'" class="mt-1 text-[11px] opacity-75">Zone montrée : pli antérieur de l’aisselle et liaison avec le sein.</p>
      </div>
      <div class="flex items-center gap-3">
      <button type="button" class="shrink-0 font-semibold" @click="toggleAnimation">{{ animationPlaying ? 'Pause' : 'Lire' }}</button>
      <input aria-label="Progression de l’animation" type="range" min="0" :max="animationDuration" step="0.05" :value="animationTime" class="min-w-0 flex-1 accent-[#a13d62]" @input="seekAnimation" />
      <span class="shrink-0 tabular-nums">{{ animationTime.toFixed(1) }} s</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { BustViewerProps } from "./three-bust/types";
import type { SymptomType } from "./three-bust/symptom-effects";
import { useBustViewer } from "~/composables/three-bust/useBustViewer";

const emit = defineEmits<{
  framingReady: [];
  symptomReady: [symptom: SymptomType];
}>();

const props = withDefaults(defineProps<BustViewerProps>(), {
  animationEnabled: true,
  modelVerticalOffset: 0,
  profileLabel: "",
  profileLabelProgress: 0,
  modelUrl: "",
  scrollProgress: 0,
  autoRotate: true,
  enableZoom: false,
  interactive: true,
  compact: false,
  modelScale: 1,
  focusSymptoms: false,
  palpationProgress: 0,
  showBackdrop: true,
  showLoadingIndicator: true,
  initialRotationY: 0,
  modelHorizontalAlignment: "center",
  symptomType: "none",
  materialStyle: "original",
  shapeType: "round",
});

const {
  containerRef, canvasRef, isLoading, materialBackdropClass,
  profileLabelOpacity, profileCurveId, profileContour,
  animationTime, animationDuration, animationPlaying, animationSteps,
  currentAnimationStep, currentAnimationSegment, animationGestureLabel,
  selectAnimationStep, toggleAnimation, seekAnimation,
} = useBustViewer(props, emit);
</script>
