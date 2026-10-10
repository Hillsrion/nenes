<template>
  <section ref="sectionRef" id="choisir-un-gabarit" class="fruit-selection relative z-20 h-[100svh] text-primary" :class="{ 'is-active': active, 'is-continuing': continuing }" aria-labelledby="fruit-selection-title" :data-selected-fruit="selectedFruit" :data-model="modelFile">
    <header class="fruit-heading absolute inset-x-5 top-[16svh] text-center">
      <p class="text-xs uppercase tracking-[0.2em]">À chaque poitrine, son gabarit</p>
      <h2 id="fruit-selection-title" class="mx-auto mt-3 max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">Choisis le modèle qui te ressemble.</h2>
    </header>
    <div class="fruit-choices absolute inset-x-0 top-[32%] h-[42%]" role="group" aria-label="Choisir un gabarit de poitrine">
      <button v-for="(choice, index) in journeyFruitChoices" :key="choice.id" :ref="element => setChoiceButton(element, index)" type="button" class="fruit-choice absolute top-0 h-full w-[27%] -translate-x-1/2" :style="{ left: `${23 + index * 27}%` }" :class="{ 'is-selected': choice.id === selectedFruit }" :aria-pressed="choice.id === selectedFruit" :aria-label="`${choice.fruit}, ${choice.sizeLabel.toLowerCase()}`" :disabled="continuing" @click="choose(choice.id)" @mouseenter="$emit('hover', choice.id)" @mouseleave="$emit('hover', null)" @focus="$emit('hover', choice.id)" @blur="$emit('hover', null)" @keydown="navigateChoices($event, index)">
        <span class="fruit-glow" aria-hidden="true" />
        <span class="fruit-label z-10 absolute inset-x-0 bottom-0 text-sm font-medium sm:text-base">{{ choice.fruit }}<span class="mt-1 block text-[10px] font-normal uppercase tracking-[0.14em] opacity-70 sm:text-xs">{{ choice.sizeLabel }}</span></span>
      </button>
    </div>
    <footer class="fruit-footer absolute inset-x-5 bottom-[8svh] flex flex-col items-center gap-3 text-center">
      <button type="button" class="rounded-full bg-primary px-7 py-3 text-sm font-medium text-white transition hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60" :disabled="continuing" @click="continueJourney">{{ continuing ? 'Le modèle arrive…' : 'Continuer avec ce gabarit' }} <span aria-hidden="true">↗</span></button>
      <p class="text-xs opacity-65">Trois repères de volume, à choisir librement.</p>
    </footer>
  </section>
</template>
<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { journeyFruitChoices, type JourneyFruitId } from "~/config/bust-fruit-catalog";
defineProps<{ active: boolean; continuing: boolean; selectedFruit: JourneyFruitId; selectedIndex: number; hoveredIndex: number; modelFile: string; sceneReady: boolean }>();
const emit = defineEmits<{ select: [fruit: JourneyFruitId]; hover: [fruit: JourneyFruitId | null]; continue: [] }>();
const sectionRef = ref<HTMLElement | null>(null);
const choiceButtons: Array<HTMLButtonElement | null> = [];
function setChoiceButton(element: Element | ComponentPublicInstance | null, index: number) { choiceButtons[index] = element as HTMLButtonElement | null; }
function choose(id: JourneyFruitId) {
  emit("select", id);
}
function continueJourney() { emit("continue"); }
function navigateChoices(event: KeyboardEvent, index: number) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault();
  const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
  choiceButtons[next]?.focus(); choose(journeyFruitChoices[next].id);
}
defineExpose({ sectionRef });
</script>
<style scoped>
.fruit-glow { position: absolute; left: 50%; top: 43%; width: clamp(7rem, 20vw, 19rem); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, #fff5bb 0%, #ffc29990 30%, #ffaac34d 47%, transparent 72%); opacity: 0; filter: blur(14px); transition: opacity 300ms; pointer-events: none; z-index: 0; }
.fruit-choice.is-selected .fruit-glow, .fruit-choice:hover .fruit-glow, .fruit-choice:focus-visible .fruit-glow { opacity: 1; }
.fruit-choice { border-radius: 50%; outline: none; }
.fruit-choice:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 6px; }
.fruit-heading, .fruit-label, .fruit-footer { transition: opacity 400ms, transform 500ms; }
.is-continuing .fruit-heading, .is-continuing .fruit-label, .is-continuing .fruit-footer { opacity: 0; transform: translateY(-12px); pointer-events: none; }
@media (max-width: 640px) { .fruit-heading { top: 14svh; } .fruit-heading h2 { font-size: 1.55rem; max-width: 20rem; } .fruit-glow { filter: blur(8px); width: 30vw; } }
@media (prefers-reduced-motion: reduce) { *, *::before { transition: none !important; } }
</style>
