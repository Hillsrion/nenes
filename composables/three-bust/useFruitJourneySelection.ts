import { computed, nextTick, onUnmounted, ref, watch, type Ref } from "vue";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/vue";
import { useBustModelCatalog } from "~/composables/useBustModelCatalog";
import { useDemoBustModelUrls } from "~/composables/useDemoBustModelUrls";
import { resolveJourneyFruitModel, journeyFruitChoices, type JourneyFruitId } from "~/config/bust-fruit-catalog";

export function useFruitJourneySelection(options: {
  sectionRef: Ref<HTMLElement | null>;
  destinationRef: Ref<HTMLElement | null>;
  ready: Ref<boolean>;
}) {
  const lenis = useLenis();
  const { palpationFileName, getModelUrl } = useDemoBustModelUrls();
  const catalog = useBustModelCatalog();
  const selectedFruit = ref<JourneyFruitId>("orange");
  const hoveredFruit = ref<JourneyFruitId | null>(null);
  const selectionActive = ref(false);
  const continuing = ref(false);
  const selectionVisited = ref(false);
  const selectedIndex = computed(() => journeyFruitChoices.findIndex(choice => choice.id === selectedFruit.value));
  const hoveredIndex = computed(() => journeyFruitChoices.findIndex(choice => choice.id === hoveredFruit.value));
  const modelFile = computed(() => resolveJourneyFruitModel(
    selectedFruit.value, catalog.value.map(model => model.fileName), palpationFileName,
  ));
  const modelUrl = computed(() => getModelUrl(modelFile.value));
  let gate: ScrollTrigger | null = null;
  let scrollTween: gsap.core.Tween | null = null;
  let disposed = false;
  let normalizerWasEnabled = false;
  let selectionScrollY = 0;
  const holdSelectionPosition = () => {
    if (!selectionActive.value || Math.abs(window.scrollY - selectionScrollY) < 1) return;
    if (lenis.value) lenis.value.scrollTo(selectionScrollY, { immediate: true, force: true });
    else window.scrollTo({ top: selectionScrollY, behavior: "instant" });
  };
  const preventScroll = (event: Event) => {
    if ((selectionActive.value || continuing.value) && event.cancelable) event.preventDefault();
  };
  const preventScrollKey = (event: KeyboardEvent) => {
    if (["PageDown", "PageUp", "Home", "End", "ArrowDown", "ArrowUp"].includes(event.key)) preventScroll(event);
  };
  function lockScroll() {
    lenis.value?.stop();
    const normalizer = ScrollTrigger.normalizeScroll();
    normalizerWasEnabled = normalizer?.isEnabled ?? false;
    normalizer?.disable();
    window.addEventListener("wheel", preventScroll, { passive: false });
    window.addEventListener("touchmove", preventScroll, { passive: false });
    window.addEventListener("keydown", preventScrollKey);
    window.addEventListener("scroll", holdSelectionPosition, { passive: true });
  }
  function unlockScroll() {
    window.removeEventListener("wheel", preventScroll);
    window.removeEventListener("touchmove", preventScroll);
    window.removeEventListener("keydown", preventScrollKey);
    window.removeEventListener("scroll", holdSelectionPosition);
    if (normalizerWasEnabled) ScrollTrigger.normalizeScroll()?.enable();
    lenis.value?.start();
  }
  function enterSelection() {
    if (disposed || selectionActive.value || continuing.value || !gate) return;
    selectionVisited.value = true;
    selectionActive.value = true;
    selectionScrollY = window.scrollY + options.sectionRef.value!.getBoundingClientRect().top;
    lockScroll();
    // A fast wheel gesture may cross the entire section in one frame.
    holdSelectionPosition();
  }
  function continueSelection() {
    if (!selectionActive.value || continuing.value) return;
    continuing.value = true;
    selectionActive.value = false;
    hoveredFruit.value = null;
    const destination = options.destinationRef.value;
    if (!destination) { continuing.value = false; unlockScroll(); return; }
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1.65;
    const position = { y: window.scrollY };
    // Cross the gate fully even when browser zoom rounds fractional CSS pixels.
    const destinationY = Math.ceil(window.scrollY + destination.getBoundingClientRect().top) + 2;
    // Keep the scroll normalizer paused until both the camera and the page arrive.
    // Re-enabling it beforehand can restore the momentum from the incoming wheel.
    scrollTween = gsap.to(position, {
      y: destinationY, duration, ease: "power2.inOut",
      onUpdate: () => {
        if (lenis.value) lenis.value.scrollTo(position.y, { immediate: true, force: true });
        else window.scrollTo(0, position.y);
        ScrollTrigger.update();
      },
      onComplete: () => { continuing.value = false; unlockScroll(); },
    });
  }
  watch(options.ready, async ready => {
    if (!ready || gate) return;
    await nextTick();
    if (disposed || !options.sectionRef.value) return;
    gate = ScrollTrigger.create({
      trigger: options.sectionRef.value,
      start: "top top", end: "bottom top",
      onEnter: enterSelection,
      onEnterBack: enterSelection,
      onRefresh: () => {
        if (!selectionActive.value) return;
        selectionScrollY = window.scrollY + options.sectionRef.value!.getBoundingClientRect().top;
        holdSelectionPosition();
      },
    });
    ScrollTrigger.refresh();
  }, { immediate: true });
  onUnmounted(() => {
    disposed = true;
    gate?.kill();
    scrollTween?.kill();
    if (selectionActive.value || continuing.value) unlockScroll();
  });
  return { selectedFruit, hoveredFruit, selectedIndex, hoveredIndex, modelFile, modelUrl,
    selectionActive, selectionVisited, continuing, continueSelection };
}
