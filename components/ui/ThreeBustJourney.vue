<template>
  <div ref="containerRef" class="relative h-full w-full" :data-animation-step="animationStep" :data-animation-time="animationTime.toFixed(2)" :data-model-rotation="secondRotationY">
    <canvas
      ref="canvasRef"
      class="relative z-10 block h-full w-full touch-none transition-opacity duration-700"
      :class="isLoading ? 'opacity-0' : 'opacity-100'"
    />
    <svg
      v-if="profileLabel && profileContour"
      class="profile-contour-label pointer-events-none absolute inset-0 z-20 h-full w-full overflow-visible text-primary"
      :viewBox="`0 0 ${profileContour.width} ${profileContour.height}`"
      :style="{
        opacity: isLoading || profileLabelProgress <= 0 ? 0 : profileLabelOpacity * secondModelOpacity,
        transition: 'opacity 240ms ease-out',
      }"
      aria-hidden="true"
    >
      <defs><path :id="profileCurveId" :d="profileContour.path" /></defs>
      <text class="font-serif" fill="currentColor" :font-size="Math.max(24, Math.min(38, profileContour.height * 0.031))">
        <textPath :href="`#${profileCurveId}`" :startOffset="`${100 * (1 - profileLabelProgress)}%`">{{ profileLabel.toLocaleLowerCase('fr-FR') }}</textPath>
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import type { BustJourneyProps } from "./three-bust/types";
import type { SymptomType } from "./three-bust/symptom-effects";
import { useBustJourney } from "~/composables/three-bust/useBustJourney";

const emit = defineEmits<{
  framingReady: [];
  symptomReady: [symptom: SymptomType];
}>();

const props = withDefaults(defineProps<BustJourneyProps>(), {
  animationStep: "observation",
  firstModelUrl: "",
  secondModelUrl: "",
  cameraProgress: 0,
  focusSymptoms: false,
  palpationProgress: 0,
  secondModelOpacity: 1,
  symptomType: "none",
  profileLabel: "",
  profileLabelProgress: 0,
  secondRotationY: 0,
  debugPath: false,
});

const {
  containerRef, canvasRef, isLoading, animationTime,
  profileLabelOpacity, profileCurveId, profileContour,
} = useBustJourney(props, emit);
</script>
