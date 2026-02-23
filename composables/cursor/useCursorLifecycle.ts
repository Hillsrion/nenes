import {
  nextTick,
  onMounted,
  onUnmounted,
  watch,
  type Ref,
} from "vue";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useAnimationsStore } from "~/stores";

interface AssetPreloaderLike {
  isComplete: Readonly<Ref<boolean>>;
  preloadAllAssets: () => Promise<void>;
}

interface UseCursorLifecycleOptions {
  disabled: Ref<boolean>;
  isLoaded: Ref<boolean>;
  isActive: Ref<boolean>;
  isMobileOrTouch: Ref<boolean>;
  assetPreloader: AssetPreloaderLike;
  detectMobileOrTouch: () => boolean;
  loadImages: () => Promise<void>;
  resetImages: () => void;
  setupCanvas: () => void;
  startMouse: () => void;
  stopMouse: () => void;
  startAnimation: (initializePosition?: boolean) => void;
  stopAnimation: () => void;
  forceStopAnimation: () => void;
  disposeRenderer: () => void;
}

const refreshScrollTriggerWithDelay = () => {
  nextTick(() => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      });
    }, 50);
  });
};

const refreshScrollTriggerImmediately = () => {
  nextTick(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    });
  });
};

export const useCursorLifecycle = ({
  disabled,
  isLoaded,
  isActive,
  isMobileOrTouch,
  assetPreloader,
  detectMobileOrTouch,
  loadImages,
  resetImages,
  setupCanvas,
  startMouse,
  stopMouse,
  startAnimation,
  stopAnimation,
  forceStopAnimation,
  disposeRenderer,
}: UseCursorLifecycleOptions) => {
  const animationsStore = useAnimationsStore();

  const onResize = async () => {
    const wasMobileOrTouch = isMobileOrTouch.value;
    isMobileOrTouch.value = detectMobileOrTouch();

    if (!wasMobileOrTouch && isMobileOrTouch.value) {
      stopAnimation();
      stopMouse();
      resetImages();
      return;
    }

    if (
      wasMobileOrTouch &&
      !isMobileOrTouch.value &&
      !disabled.value &&
      animationsStore.getSectionState("loading") === "isComplete"
    ) {
      await loadImages();
      setupCanvas();
      startMouse();
      startAnimation(true);
      refreshScrollTriggerWithDelay();
    }
  };

  onMounted(async () => {
    isMobileOrTouch.value = detectMobileOrTouch();

    if (!assetPreloader.isComplete.value) {
      await assetPreloader.preloadAllAssets();
    }

    if (!isMobileOrTouch.value) {
      await loadImages();
      setupCanvas();
      startMouse();

      if (
        !disabled.value &&
        animationsStore.getSectionState("loading") === "isComplete"
      ) {
        startAnimation(true);
        refreshScrollTriggerWithDelay();
      }
    }

    window.addEventListener("resize", onResize, { passive: true });
  });

  onUnmounted(() => {
    stopMouse();
    window.removeEventListener("resize", onResize);
    disposeRenderer();
  });

  watch(
    () => disabled.value,
    async (nextDisabled) => {
      if (nextDisabled || isMobileOrTouch.value) {
        stopAnimation();
        return;
      }

      if (
        isLoaded.value &&
        animationsStore.getSectionState("loading") === "isComplete"
      ) {
        startAnimation(true);
        refreshScrollTriggerWithDelay();
        return;
      }

      if (assetPreloader.isComplete.value && !isMobileOrTouch.value) {
        await loadImages();

        if (animationsStore.getSectionState("loading") === "isComplete") {
          startAnimation(true);
          refreshScrollTriggerWithDelay();
        }
      }
    }
  );

  watch(
    () => animationsStore.getSectionState("loading"),
    async (loadingState) => {
      if (
        loadingState === "isComplete" &&
        !disabled.value &&
        !isMobileOrTouch.value
      ) {
        nextTick(() => {
          window.requestAnimationFrame(async () => {
            window.requestAnimationFrame(async () => {
              if (!isLoaded.value) {
                await loadImages();
                setupCanvas();
              }

              startMouse();
              startAnimation(true);
              ScrollTrigger.refresh();
            });
          });
        });
      }
    }
  );

  watch(
    () => animationsStore.getCoverScaling,
    async (isScaling) => {
      if (isScaling) {
        if (isActive.value) {
          stopAnimation();
        } else {
          forceStopAnimation();
        }

        return;
      }

      if (
        !isScaling &&
        !isActive.value &&
        !disabled.value &&
        !isMobileOrTouch.value &&
        animationsStore.getSectionState("loading") === "isComplete"
      ) {
        if (!isLoaded.value) {
          await loadImages();
          setupCanvas();
        }

        startMouse();
        startAnimation(false);
        refreshScrollTriggerImmediately();
      }
    }
  );
};
