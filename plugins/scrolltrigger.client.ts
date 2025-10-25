import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "@studio-freight/lenis";

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger);

  // Initialize Lenis outside of Vue component lifecycle if you want a global instance
  // This ensures Lenis is available for ScrollTrigger immediately
  const lenis = new Lenis();

  lenis.on("scroll", ScrollTrigger.update);

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);

  // iOS ScrollTrigger Fixes
  ScrollTrigger.normalizeScroll(true); // Enables smooth scrolling and addresses iOS momentum scrolling

  // Configure ScrollTrigger to use Lenis as the scroller
  // ScrollTrigger.defaults({
  //   scroller: document.body,
  // });

  // Set up scroller proxy for Lenis
  ScrollTrigger.scrollerProxy(document.body, {
    scrollTop(value) {
      if (arguments.length) {
        lenis.scrollTo(value, { immediate: true });
      }
      return lenis.scroll.y; // Corrected: return lenis.scroll.y
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
  if (process.client) {
    window.addEventListener("orientationchange", () => {
      ScrollTrigger.refresh();
    });
  }
});
