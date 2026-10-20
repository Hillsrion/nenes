import { test } from "node:test";
import assert from "node:assert/strict";
import { createRenderer, defineComponent, nextTick, ref } from "vue";
import { useAudienceTracking } from "../composables/useAudienceTracking.ts";

// Exercise the real Vue lifecycle and browser callbacks without sending network data.
function fixture(t: { after: (cleanup: () => void) => void }, options: { hidden?: boolean; beacon?: boolean } = {}) {
  const originals = new Map<string, PropertyDescriptor | undefined>();
  const install = (key: string, value: unknown) => {
    originals.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  };
  const documentListeners = new Map<string, Function>();
  const windowListeners = new Map<string, Function>();
  const beacons: Blob[] = [];
  const fetches: RequestInit[] = [];
  class Element {
    constructor(public dataset: Record<string, string>) {}
    closest() { return this; }
  }
  const sections = [new Element({ analyticsSection: "entry" }), new Element({ analyticsSection: "resources" })];
  const observers: Observer[] = [];
  class Observer {
    observed = new Set<Element>();
    constructor(public callback: Function, public options: { rootMargin: string }) { observers.push(this); }
    observe(element: Element) { this.observed.add(element); }
    unobserve(element: Element) { this.observed.delete(element); }
    disconnect() { this.observed.clear(); }
    enter(element: Element) { this.callback([{ target: element, isIntersecting: true }]); }
  }
  const document = {
    visibilityState: options.hidden ? "hidden" : "visible",
    querySelectorAll: () => sections,
    addEventListener: (name: string, listener: Function) => documentListeners.set(name, listener),
    removeEventListener: (name: string) => documentListeners.delete(name),
  };
  const window = {
    location: { href: "https://nenes.ismaelsebbane.com/", pathname: "/" },
    innerHeight: 900, IntersectionObserver: Observer,
    addEventListener: (name: string, listener: Function) => windowListeners.set(name, listener),
    removeEventListener: (name: string) => windowListeners.delete(name),
  };
  const navigator = {
    doNotTrack: "0", globalPrivacyControl: false,
    sendBeacon: (_url: string, blob: Blob) => {
      if (options.beacon === false) return false;
      beacons.push(blob);
      return true;
    },
  };
  install("document", document);
  install("window", window);
  install("navigator", navigator);
  install("Element", Element);
  install("IntersectionObserver", Observer);
  install("fetch", async (_url: string, init: RequestInit) => { fetches.push(init); return new Response(null, { status: 204 }); });
  install("useRuntimeConfig", () => ({ public: { cloudflareAnalytics: {
    hosts: "nenes.ismaelsebbane.com", eventsEndpoint: "https://collector.example/events",
  } } }));
  const ready = ref(false);
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null,
  });
  const app = renderer.createApp(defineComponent({ setup() { useAudienceTracking(ready); return () => null; } }));
  app.mount({});
  t.after(() => {
    app.unmount();
    for (const [key, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else Reflect.deleteProperty(globalThis, key);
    }
  });
  const start = async () => { ready.value = true; await nextTick(); };
  const flush = () => windowListeners.get("pagehide")?.();
  return { document, window, navigator, observers, sections, documentListeners, windowListeners, beacons, fetches, Element, start, flush, app };
}

test("loading gates tracking; real section entries are sent once and listeners are cleaned up", async (t) => {
  const f = fixture(t);
  assert.equal(f.observers.length, 0);
  assert.equal(f.documentListeners.size, 0);
  await f.start();
  assert.equal(f.observers[0].options.rootMargin, "-360px 0px -360px 0px");
  f.observers[0].enter(f.sections[0]);
  f.flush();
  assert.equal(f.beacons.length, 1);
  assert.deepEqual(JSON.parse(await f.beacons[0].text()), { version: 1, events: [{ name: "section_view", target: "entry", page: "/" }] });
  f.observers[0].enter(f.sections[0]);
  f.flush();
  assert.equal(f.beacons.length, 1);
  f.app.unmount();
  assert.equal(f.documentListeners.size, 0);
  assert.equal(f.windowListeners.size, 0);
});

test("a tab loaded in the background starts counting when it becomes visible", async (t) => {
  const f = fixture(t, { hidden: true });
  await f.start();
  f.observers[0].enter(f.sections[0]);
  f.flush();
  assert.equal(f.beacons.length, 0);
  f.document.visibilityState = "visible";
  f.documentListeners.get("visibilitychange")?.();
  f.observers.at(-1)!.enter(f.sections[0]);
  f.flush();
  assert.equal(f.beacons.length, 1);
});

test("trusted resource clicks survive page exit and fallback fetch omits credentials", async (t) => {
  const f = fixture(t, { beacon: false });
  await f.start();
  const target = new f.Element({ analyticsResource: "cancer-info:phone" });
  f.documentListeners.get("click")?.({ target, button: 0, isTrusted: false });
  assert.equal(f.fetches.length, 0);
  f.documentListeners.get("click")?.({ target, button: 0, isTrusted: true });
  assert.equal(f.fetches.length, 1);
  assert.equal(f.fetches[0].keepalive, true);
  assert.equal(f.fetches[0].credentials, "omit");
  assert.deepEqual(JSON.parse(String(f.fetches[0].body)), { version: 1, events: [{ name: "resource_click", target: "cancer-info:phone", page: "/" }] });
});

test("turning on privacy preferences before flushing discards queued events", async (t) => {
  const f = fixture(t);
  await f.start();
  f.observers[0].enter(f.sections[0]);
  f.navigator.globalPrivacyControl = true;
  f.flush();
  assert.equal(f.beacons.length, 0);
  assert.equal(f.fetches.length, 0);
});
