import { watch, onMounted, onBeforeUnmount, type Ref } from "vue";
import { createAudienceEventBuffer } from "../utils/audience-events";
import { getAudienceEventsEndpoint, isAudienceTrackingAllowed } from "../utils/cloudflare-analytics";

export function useAudienceTracking(ready: Ref<boolean>) {
  const config = useRuntimeConfig().public.cloudflareAnalytics;
  const buffer = createAudienceEventBuffer();
  let timer: ReturnType<typeof setTimeout> | undefined;
  let observer: IntersectionObserver | undefined;
  let stopWatching: (() => void) | undefined;
  let started = false;
  const reachedElements = new WeakSet<Element>();
  const endpoint = getAudienceEventsEndpoint(config.eventsEndpoint);

  function allowed() {
    return Boolean(endpoint) && isAudienceTrackingAllowed({
      hosts: config.hosts,
      url: window.location.href,
      development: import.meta.dev,
      doNotTrack: navigator.doNotTrack,
      globalPrivacyControl: (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl,
    }) && window.location.pathname === "/";
  }

  function flush() {
    clearTimeout(timer);
    timer = undefined;
    const events = buffer.take();
    if (!events.length || !allowed() || !endpoint) return;
    const body = JSON.stringify({ version: 1, events });
    // text/plain makes the cross-origin beacon a simple request, including on tab exit.
    try {
      if (navigator.sendBeacon?.(endpoint, new Blob([body], { type: "text/plain" }))) return;
    } catch {
      // Browser policies can reject beacons; the fetch fallback must remain non-blocking.
    }
    void fetch(endpoint, {
      method: "POST", body, keepalive: true, credentials: "omit",
      referrerPolicy: "no-referrer", headers: { "Content-Type": "text/plain" },
    }).catch(() => {});
  }

  function record(name: "section_view" | "resource_click", target: string) {
    if (document.visibilityState === "hidden" || !allowed()) return false;
    if (!buffer.add({ name, target, page: "/" })) return false;
    if (!timer) timer = setTimeout(flush, 1000);
    return true;
  }

  function onResourceClick(event: MouseEvent) {
    if (!event.isTrusted || (event.button !== 0 && event.button !== 1)) return;
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[data-analytics-resource]");
    if (!link) return;
    record("resource_click", link.dataset.analyticsResource ?? "");
    flush();
  }

  function onVisibilityChange() {
    if (document.visibilityState === "hidden") flush();
    else observeSections();
  }

  function observeSections() {
    observer?.disconnect();
    if (!("IntersectionObserver" in window) || !allowed()) return;
    // Pixel margins stay relative to viewport height on wide screens.
    const margin = Math.round(window.innerHeight * 0.4);
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target as HTMLElement;
        if (record("section_view", element.dataset.analyticsSection ?? "")) {
          reachedElements.add(element);
          observer?.unobserve(element);
        }
      }
    }, { rootMargin: `-${margin}px 0px -${margin}px 0px`, threshold: 0 });
    document.querySelectorAll<HTMLElement>("[data-analytics-section]").forEach((element) => {
      if (!reachedElements.has(element)) observer?.observe(element);
    });
  }

  onMounted(() => {
    if (!allowed()) return;
    stopWatching = watch(ready, (isReady) => {
      if (!isReady || started) return;
      started = true;
      observeSections();
      document.addEventListener("click", onResourceClick, true);
      document.addEventListener("auxclick", onResourceClick, true);
      document.addEventListener("visibilitychange", onVisibilityChange);
      window.addEventListener("pagehide", flush);
      window.addEventListener("resize", observeSections);
    }, { immediate: true, flush: "post" });
  });

  onBeforeUnmount(() => {
    stopWatching?.();
    observer?.disconnect();
    clearTimeout(timer);
    if (!started) return;
    flush();
    document.removeEventListener("click", onResourceClick, true);
    document.removeEventListener("auxclick", onResourceClick, true);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    window.removeEventListener("pagehide", flush);
    window.removeEventListener("resize", observeSections);
  });
}
