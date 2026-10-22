<template>
  <section ref="sectionRef" id="choisir-un-gabarit" class="fruit-selection relative z-20 h-[100svh] text-primary" :class="{ 'is-active': active, 'is-continuing': continuing }" :style="{ zIndex: modelWaitExpired ? 201 : undefined }" aria-labelledby="fruit-selection-title" :data-selected-fruit="selectedFruit" :data-model="modelFile" :data-lenis-prevent-touch="active || continuing ? '' : undefined">
    <header class="fruit-heading absolute inset-x-5 top-[16svh] text-center">
      <h2 id="fruit-selection-title" class="mx-auto max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">Choisis le modèle qui te ressemble.</h2>
    </header>
    <div class="fruit-choices absolute inset-x-0 top-[32%] h-[42%]" role="group" aria-label="Choisir un gabarit de poitrine">
      <button v-for="(choice, index) in journeyFruitChoices" :key="choice.id" :ref="element => setChoiceButton(element, index)" type="button" class="fruit-choice absolute top-0 h-full w-[40%] -translate-x-1/2" :style="{ left: `${50 + fruitSelectionColumn(index) * 50}%` }" :class="{ 'is-selected': choice.id === selectedFruit, 'has-landed': index < landedCount }" :aria-pressed="choice.id === selectedFruit" :aria-label="`Gabarit ${choice.sizeLabel.toLowerCase()}`" :disabled="continuing || !sceneReady || index >= landedCount" @click="choose(choice.id, true)" @mouseenter="$emit('hover', choice.id)" @mouseleave="$emit('hover', null)" @focus="$emit('hover', choice.id)" @blur="$emit('hover', null)" @keydown="navigateChoices($event, index)">
        <span class="fruit-glow" aria-hidden="true" />
      </button>
    </div>
    <footer class="fruit-footer absolute inset-x-5 bottom-[8svh] flex flex-col items-center gap-3 text-center">
      <button type="button" class="inline-flex items-center gap-4 rounded-full bg-primary px-7 py-3 text-sm font-medium text-white transition hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60" :disabled="continuing || !sceneReady || selectedIndex >= landedCount" @click="continueJourney">{{ continuing ? 'Le modèle arrive…' : 'Continuer avec ce gabarit' }} <span aria-hidden="true">↗</span></button>
      <div v-if="modelWaitExpired" class="model-wait-message max-w-sm rounded-2xl bg-white/95 p-4 text-sm" role="status">
        <p>Le modèle 3D met du temps à charger. Tu peux poursuivre les explications sans attendre.</p>
        <button type="button" class="mt-2 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary" @click="$emit('continueWithoutModel')">Continuer sans le modèle 3D</button>
      </div>
    </footer>
  </section>
</template>
<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { journeyFruitChoices, type JourneyFruitId } from "~/config/bust-fruit-catalog";
import { fruitSelectionColumn } from "~/utils/fruit-selection-motion";
defineProps<{ active: boolean; continuing: boolean; selectedFruit: JourneyFruitId; selectedIndex: number; hoveredIndex: number; modelFile: string; sceneReady: boolean; landedCount: number; modelWaitExpired?: boolean }>();
const emit = defineEmits<{ select: [fruit: JourneyFruitId]; hover: [fruit: JourneyFruitId | null]; continue: []; continueWithoutModel: [] }>();
const sectionRef = ref<HTMLElement | null>(null);
const choiceButtons: Array<HTMLButtonElement | null> = [];
function setChoiceButton(element: Element | ComponentPublicInstance | null, index: number) { choiceButtons[index] = element as HTMLButtonElement | null; }
function choose(id: JourneyFruitId, continueNow = false) {
  emit("select", id);
  if (continueNow) continueJourney();
}
function continueJourney() { emit("continue"); }
function navigateChoices(event: KeyboardEvent, index: number) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const count = journeyFruitChoices.length;
  const next = event.key === "Home" ? 0 : event.key === "End" ? count - 1 : (index + (event.key === "ArrowRight" ? 1 : count - 1)) % count;
  choiceButtons[next]?.focus(); choose(journeyFruitChoices[next].id);
}
defineExpose({ sectionRef });
</script>
<style scoped>
.fruit-glow { position: absolute; left: 50%; top: 43%; width: clamp(7rem, 20vw, 19rem); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, #fff5bb 0%, #ffc29990 30%, #ffaac34d 47%, transparent 72%); opacity: 0; transition: opacity 300ms; pointer-events: none; z-index: 0; }
.fruit-choice.has-landed.is-selected .fruit-glow, .fruit-choice.has-landed:hover .fruit-glow, .fruit-choice.has-landed:focus-visible .fruit-glow { opacity: 1; }
.fruit-choice { border-radius: 50%; outline: none; }
.fruit-choice:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 6px; }
.fruit-heading, .fruit-footer { transition: opacity 400ms, transform 500ms; }
.is-continuing { pointer-events: none; }
/* Let the browser preserve taps while both native and Lenis scrolling are locked. */
.is-active, .is-continuing { touch-action: none; }
.model-wait-message { pointer-events: auto; }
@media (max-width: 640px) { .fruit-heading { top: 14svh; } .fruit-heading h2 { font-size: 1.55rem; max-width: 20rem; } .fruit-glow { width: 30vw; } }
@media (max-width: 640px) and (max-height: 650px) {
  .fruit-choices { top: 30%; height: 38%; }
  .fruit-footer { bottom: 4svh; gap: 0.4rem; }
}
@media (max-width: 1023px) and (orientation: landscape) {
  .fruit-heading { top: 21svh; }
  .fruit-heading h2 { max-width: none; font-size: 1.25rem; }
  .fruit-choices { top: 28%; height: 39%; }
  .fruit-footer { bottom: 4svh; flex-direction: row; justify-content: center; gap: 0.5rem; }
}
@media (prefers-reduced-motion: reduce) { *, *::before { transition: none !important; } }
</style>
