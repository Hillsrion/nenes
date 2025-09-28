import { ref, onMounted, onUnmounted } from "vue";
import Lenis from "lenis";

export const useLenis = () => {
  const lenis = ref<Lenis | null>(null);

  onMounted(() => {
    // Initialize Lenis with default configuration
    lenis.value = new Lenis({
      duration: 1.2,
      easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      touchMultiplier: 2,
      infinite: false,
    });

    // Start the animation loop
    const raf = (time: number) => {
      lenis.value?.raf(time);
      requestAnimationFrame(raf);
    };

    requestAnimationFrame(raf);

    // Listen for scroll events
    lenis.value.on(
      "scroll",
      ({ scroll, progress }: { scroll: number; progress: number }) => {
        // Emit scroll events for GSAP ScrollTrigger if needed
        // This can be used to sync with GSAP animations
      }
    );
  });

  onUnmounted(() => {
    lenis.value?.destroy();
  });

  const scrollTo = (target: string | number | HTMLElement, options?: any) => {
    lenis.value?.scrollTo(target as any, options);
  };

  const start = () => {
    lenis.value?.start();
  };

  const stop = () => {
    lenis.value?.stop();
  };

  return {
    lenis,
    scrollTo,
    start,
    stop,
  };
};
