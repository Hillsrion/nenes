import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { runInNewContext } from "node:vm";
import { computed, effectScope, nextTick, reactive, ref, watch } from "vue";
import { journeyFruitChoices, resolveJourneyFruitModel } from "../config/bust-fruit-catalog";
import { FRUIT_COVER_PROGRESS } from "../utils/fruit-flight-motion";

// Execute the real composable with deterministic scroll, animation and network
// readiness so failures do not depend on GPU speed or actual model downloads.
const source = stripTypeScriptTypes(readFileSync(new URL("../composables/three-bust/useFruitJourneySelection.ts", import.meta.url), "utf8")
  .replace(/^import .*;\n/gm, "").replace("export function", "function"));

async function fixture(loaded = true) {
  const scope = effectScope();
  const timers = new Map<number, () => void>();
  const tweens: any[] = [];
  const listeners = new Map<string, Function>();
  let cleanup!: () => void;
  let gate: any;
  let timerId = 0;
  let stops = 0;
  let starts = 0;
  const lenis = ref({
    stop: () => { stops++; }, start: () => { starts++; },
    scrollTo: (y: number) => { window.scrollY = y; },
  });
  const window = {
    scrollY: 800,
    scrollTo: () => {},
    matchMedia: () => ({ matches: false }),
    addEventListener: (name: string, fn: Function) => listeners.set(name, fn),
    removeEventListener: (name: string) => listeners.delete(name),
  };
  const context = {
    computed, nextTick, reactive, ref, watch, onUnmounted: (fn: () => void) => { cleanup = fn; },
    gsap: { to: (target: object, options: any) => {
      const tween = { kill() {}, finish() { options.onStart?.(); Object.assign(target, { progress: options.progress }); options.onComplete?.(); } };
      tweens.push(tween); return tween;
    } },
    ScrollTrigger: {
      normalizeScroll: () => null, refresh() {}, update() {},
      create: (options: any) => { gate = options; return { kill() {} }; },
    },
    useLenis: () => lenis,
    useDemoBustModelUrls: () => ({ palpationFileName: "fallback.glb", getModelUrl: (file: string) => `/models/${file}` }),
    useBustModelCatalog: () => ref([]), journeyFruitChoices, resolveJourneyFruitModel, FRUIT_COVER_PROGRESS,
    window, setTimeout: (fn: () => void) => { timers.set(++timerId, fn); return timerId; },
    clearTimeout: (id: number) => timers.delete(id),
  };
  const create = runInNewContext(`${source}\nuseFruitJourneySelection`, context);
  const loadedModelUrl = ref(loaded ? "/models/fallback.glb" : "");
  const sectionRef = ref({ getBoundingClientRect: () => ({ top: 1000 - window.scrollY }) });
  const state = scope.run(() => create({
    sectionRef,
    destinationRef: ref({ getBoundingClientRect: () => ({ top: 1844 - window.scrollY }) }),
    ready: ref(true), loadedModelUrl,
  }));
  await nextTick();
  await new Promise(resolve => setImmediate(resolve));
  return { state, loadedModelUrl, tweens, timers, window, listeners, sectionRef,
    enter: () => gate.onEnter(), get stops() { return stops; }, get starts() { return starts; },
    expire: () => { for (const fn of [...timers.values()]) fn(); },
    dispose: () => { cleanup(); scope.stop(); },
  };
}

test("a fruit clicked before the gate activates still advances and unlocks scrolling", async () => {
  const f = await fixture();
  try {
    assert.equal(f.state.selectionActive.value, false);
    f.state.continueSelection();
    assert.equal(f.state.continuing.value, true);
    assert.equal(f.stops, 1);
    assert.equal(f.window.scrollY, 1000);
    f.state.continueSelection();
    assert.equal(f.tweens.length, 1, "double taps do not start another transition");
    f.tweens[0].finish();
    assert.equal(f.window.scrollY, 1846);
    f.tweens[1].finish();
    assert.equal(f.state.continuing.value, false);
    assert.equal(f.starts, 1);
    assert.equal(f.listeners.size, 0);
    assert.equal(f.timers.size, 0);
  } finally { f.dispose(); }
});

test("a missing model offers an exit after the wait and that exit releases the gate", async () => {
  const f = await fixture(false);
  try {
    f.enter(); f.state.continueSelection(); f.tweens[0].finish();
    assert.equal(f.state.flightPhase.value, "covered");
    f.state.continueWithoutModel();
    assert.equal(f.tweens.length, 1, "the escape is available only after the wait");
    f.expire();
    assert.equal(f.state.modelWaitExpired.value, true);
    f.state.continueWithoutModel();
    f.tweens[1].finish();
    assert.equal(f.window.scrollY, 1846);
    assert.equal(f.state.continuing.value, false);
    assert.equal(f.state.modelWaitExpired.value, false);
    assert.equal(f.listeners.size, 0);
  } finally { f.dispose(); }
});

test("a late model resumes automatically and cancels the escape timer", async () => {
  const f = await fixture(false);
  try {
    f.enter(); f.state.continueSelection(); f.tweens[0].finish();
    f.loadedModelUrl.value = "/models/fallback.glb";
    await nextTick();
    assert.equal(f.tweens.length, 2);
    assert.equal(f.timers.size, 0);
    f.tweens[1].finish();
    assert.equal(f.starts, 1);
  } finally { f.dispose(); }
});

test("leaving during the model wait clears the timer and scroll lock", async () => {
  const f = await fixture(false);
  f.enter(); f.state.continueSelection(); f.tweens[0].finish();
  f.dispose();
  assert.equal(f.timers.size, 0);
  assert.equal(f.listeners.size, 0);
  assert.equal(f.starts, 1);
});


test("a small finger movement on the locked selection does not cancel the native tap", async () => {
  const f = await fixture(false);
  try {
    f.enter();
    for (const transition of [false, true]) {
      if (transition) f.state.continueSelection();
      let prevented = false;
      f.listeners.get("touchmove")!({
        type: "touchmove", cancelable: true,
        composedPath: () => [{}, f.sectionRef.value],
        preventDefault: () => { prevented = true; },
      });
      assert.equal(prevented, false, "touch-action locks panning without suppressing button clicks");
    }
    let prevented = false;
    f.listeners.get("touchmove")!({
      type: "touchmove", cancelable: true, composedPath: () => [{}],
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, true, "touches outside the selection still cannot scroll past the gate");
    prevented = false;
    f.listeners.get("wheel")!({
      type: "wheel", cancelable: true, composedPath: () => [f.sectionRef.value],
      preventDefault: () => { prevented = true; },
    });
    assert.equal(prevented, true, "wheel scrolling remains locked over the controls");
  } finally { f.dispose(); }
});
