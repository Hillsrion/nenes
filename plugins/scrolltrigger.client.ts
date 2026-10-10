import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLenis } from "lenis/vue";
import { watch } from 'vue';

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger);

  // Initialize Lenis outside of Vue component lifecycle if you want a global instance
  // This ensures Lenis is available for ScrollTrigger immediately
  const lenis = useLenis();

  const stopWatching = watch(lenis, (instance, previous) => {
    previous?.off('scroll', ScrollTrigger.update);
    instance?.on('scroll', ScrollTrigger.update);
  }, { immediate: true });

  // normalize scroll
  ScrollTrigger.normalizeScroll(true);
  ScrollTrigger.config({
    ignoreMobileResize: true, // Prevents false refreshes from iOS address bar
  });

  gsap.ticker.lagSmoothing(0);

  // Configure ScrollTrigger to use Lenis as the scroller
  // ScrollTrigger.defaults({
  //   scroller: document.body,
  // });

  // Set up scroller proxy for Lenis
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) {
        if (lenis.value) lenis.value.scrollTo(value, { immediate: true });
        else window.scrollTo(0, value);
      }
      return lenis.value?.scroll ?? window.scrollY;
    },
    getBoundingClientRect() {
      return {
        top: 0,
        left: 0,
        width: window.innerWidth,
        height: window.innerHeight,
      };
    },
    pinType: document.body.style.transform ? "transform" : "fixed",
  });

  ScrollTrigger.config({
    ignoreMobileResize: true, // Prevents false refreshes from iOS address bar
  });

  // Refresh ScrollTrigger after fonts are loaded
  document.fonts.ready.then(() => {
    ScrollTrigger.refresh();
  });

  // Refresh ScrollTrigger on orientation change
  if (import.meta.client) {
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener("orientationchange", refresh);
    import.meta.hot?.dispose(() => {
      window.removeEventListener('orientationchange', refresh);
      lenis.value?.off('scroll', ScrollTrigger.update);
      stopWatching();
    });
  }
});
