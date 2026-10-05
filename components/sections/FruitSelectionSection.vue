<template>
  <section ref="sectionRef" id="choisir-un-gabarit" class="fruit-selection relative z-20 h-[100svh] text-primary" :class="{ 'is-active': active, 'is-continuing': continuing }" aria-labelledby="fruit-selection-title" :data-selected-fruit="selectedFruit" :data-model="modelFile">
    <header class="fruit-heading absolute inset-x-5 top-[16svh] text-center">
      <p class="text-xs uppercase tracking-[0.2em]">À chaque poitrine, son gabarit</p>
      <h2 id="fruit-selection-title" class="mx-auto mt-3 max-w-2xl text-3xl font-medium leading-tight sm:text-4xl">Choisis le modèle qui te ressemble.</h2>
    </header>
    <div class="fruit-choices absolute inset-x-0 top-[32%] h-[42%]" role="group" aria-label="Choisir un gabarit de poitrine">
      <button v-for="(choice, index) in journeyFruitChoices" :key="choice.id" :ref="element => setChoiceButton(element, index)" type="button" class="fruit-choice absolute top-0 h-full w-[27%] -translate-x-1/2" :style="{ left: `${23 + index * 27}%` }" :class="{ 'is-selected': choice.id === selectedFruit }" :aria-pressed="choice.id === selectedFruit" :aria-label="`${choice.fruit}, ${choice.sizeLabel.toLowerCase()}`" :disabled="continuing" @click="choose(choice.id)" @mouseenter="$emit('hover', choice.id)" @mouseleave="$emit('hover', null)" @focus="pauseTimer(); $emit('hover', choice.id)" @blur="$emit('hover', null)" @keydown="navigateChoices($event, index)">
        <span class="fruit-glow" aria-hidden="true" />
        <span class="fruit-label z-10 absolute inset-x-0 bottom-0 text-sm font-medium sm:text-base">{{ choice.fruit }}<span class="mt-1 block text-[10px] font-normal uppercase tracking-[0.14em] opacity-70 sm:text-xs">{{ choice.sizeLabel }}</span></span>
        <span v-if="choice.id === selectedFruit && active && !paused" class="fruit-timer z-10 absolute left-1/2 top-[6%] -translate-x-1/2" role="timer" :aria-label="`Suite automatique dans ${remainingSeconds} secondes`">
          <svg viewBox="0 0 40 40" aria-hidden="true"><circle class="timer-track" cx="20" cy="20" r="17" /><circle class="timer-progress" cx="20" cy="20" r="17" :style="{ strokeDashoffset: circumference * (1 - timerProgress) }" /></svg>
          <span aria-hidden="true">{{ remainingSeconds }}</span>
        </span>
      </button>
    </div>
    <footer class="fruit-footer absolute inset-x-5 bottom-[8svh] flex flex-col items-center gap-3 text-center">
      <button type="button" class="rounded-full bg-primary px-7 py-3 text-sm font-medium text-white transition hover:bg-primary/85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary disabled:opacity-60" :disabled="continuing" @click="continueJourney">{{ continuing ? 'Le modèle arrive…' : 'Continuer avec ce gabarit' }} <span aria-hidden="true">↗</span></button>
      <button v-if="active && !paused" type="button" class="text-xs underline underline-offset-4 opacity-75" @click="pauseTimer">Prendre mon temps</button>
      <p v-else class="text-xs opacity-65">Trois repères de volume, à choisir librement.</p>
    </footer>
  </section>
</template>
<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { journeyFruitChoices, type JourneyFruitId } from "~/config/bust-fruit-catalog";
const props = defineProps<{ active: boolean; continuing: boolean; selectedFruit: JourneyFruitId; selectedIndex: number; hoveredIndex: number; modelFile: string; sceneReady: boolean }>();
const emit = defineEmits<{ select: [fruit: JourneyFruitId]; hover: [fruit: JourneyFruitId | null]; continue: [] }>();
const sectionRef = ref<HTMLElement | null>(null);
const paused = ref(false);
const timerProgress = ref(1);
const remainingSeconds = computed(() => Math.max(1, Math.ceil(timerProgress.value * 5)));
const circumference = 2 * Math.PI * 17;
const choiceButtons: Array<HTMLButtonElement | null> = [];
let timer = 0;
let lastTime = 0;
let arrivalTimer = 0;
let timerReady = false;
function setChoiceButton(element: Element | ComponentPublicInstance | null, index: number) { choiceButtons[index] = element as HTMLButtonElement | null; }
function cancelTimer() { cancelAnimationFrame(timer); timer = 0; lastTime = 0; }
function pauseTimer() { paused.value = true; cancelTimer(); }
function countdown(now: number) {
  timer = 0;
  if (!props.active || paused.value || document.hidden) { lastTime = 0; return; }
  if (lastTime) timerProgress.value = Math.max(0, timerProgress.value - (now - lastTime) / 5000);
  lastTime = now;
  if (timerProgress.value <= 0) { continueJourney(); return; }
  timer = requestAnimationFrame(countdown);
}
function resumeTimer() { if (props.active && timerReady && props.sceneReady && !paused.value && !timer && !document.hidden) timer = requestAnimationFrame(countdown); }
function choose(id: JourneyFruitId) {
  emit("select", id); timerProgress.value = 1; lastTime = 0;
}
function continueJourney() { cancelTimer(); emit("continue"); }
function navigateChoices(event: KeyboardEvent, index: number) {
  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
  event.preventDefault(); pauseTimer();
  const next = event.key === "Home" ? 0 : event.key === "End" ? 2 : (index + (event.key === "ArrowRight" ? 1 : 2)) % 3;
  choiceButtons[next]?.focus(); choose(journeyFruitChoices[next].id);
}
watch(() => props.active, active => {
  cancelTimer(); window.clearTimeout(arrivalTimer); timerReady = false;
  if (!active) return;
  timerProgress.value = 1; paused.value = false;
  arrivalTimer = window.setTimeout(() => { timerReady = true; resumeTimer(); }, window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1600);
});
watch(() => props.sceneReady, resumeTimer);
onMounted(() => document.addEventListener("visibilitychange", resumeTimer));
onUnmounted(() => { cancelTimer(); window.clearTimeout(arrivalTimer); document.removeEventListener("visibilitychange", resumeTimer); });
defineExpose({ sectionRef });
</script>
<style scoped>
.fruit-glow { position: absolute; left: 50%; top: 43%; width: clamp(7rem, 20vw, 19rem); aspect-ratio: 1; transform: translate(-50%, -50%); border-radius: 50%; background: radial-gradient(circle, #fff5bb 0%, #ffc29990 30%, #ffaac34d 47%, transparent 72%); opacity: 0; filter: blur(14px); transition: opacity 300ms; pointer-events: none; z-index: 0; }
.fruit-choice.is-selected .fruit-glow, .fruit-choice:hover .fruit-glow, .fruit-choice:focus-visible .fruit-glow { opacity: 1; }
.fruit-choice { border-radius: 50%; outline: none; }
.fruit-choice:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 6px; }
.fruit-timer { width: 36px; height: 36px; display: grid; place-items: center; font-size: 11px; }
.fruit-timer svg { position: absolute; inset: 0; transform: rotate(-90deg); }
.fruit-timer circle { fill: none; stroke-width: 1.8; }
.timer-track { stroke: #335ede22; }
.timer-progress { stroke: var(--color-primary); stroke-dasharray: 106.814; }
.fruit-heading, .fruit-label, .fruit-footer { transition: opacity 400ms, transform 500ms; }
.is-continuing .fruit-heading, .is-continuing .fruit-label, .is-continuing .fruit-footer { opacity: 0; transform: translateY(-12px); pointer-events: none; }
@media (max-width: 640px) { .fruit-heading { top: 14svh; } .fruit-heading h2 { font-size: 1.55rem; max-width: 20rem; } .fruit-glow { filter: blur(8px); width: 30vw; } }
@media (prefers-reduced-motion: reduce) { *, *::before { transition: none !important; } }
</style>
