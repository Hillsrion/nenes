import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default defineNuxtPlugin(() => {
  gsap.registerPlugin(ScrollTrigger);

  // iOS ScrollTrigger Fixes
  ScrollTrigger.normalizeScroll(true); // Enables smooth scrolling and addresses iOS momentum scrolling
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
