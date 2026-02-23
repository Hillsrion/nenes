import { useAnimationsStore } from "~/stores";

type LoadingState = "idle" | "isAnimating" | "isComplete";

interface UseAfterLoadingReadyOptions {
  delayMs?: number;
  once?: boolean;
  enabled?: () => boolean;
  loadingState?: LoadingState;
}

const runAfterFrames = (
  callback: () => void,
  delayMs: number
): (() => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let raf1 = 0;
  let raf2 = 0;

  nextTick(() => {
    timeoutId = window.setTimeout(() => {
      raf1 = window.requestAnimationFrame(() => {
        raf2 = window.requestAnimationFrame(() => {
          callback();
        });
      });
    }, delayMs);
  });

  return () => {
    if (timeoutId !== null) {
      window.clearTimeout(timeoutId);
    }
    if (raf1) {
      window.cancelAnimationFrame(raf1);
    }
    if (raf2) {
      window.cancelAnimationFrame(raf2);
    }
  };
};

export const useAfterLoadingReady = (
  callback: () => void,
  options: UseAfterLoadingReadyOptions = {}
) => {
  const {
    delayMs = 50,
    once = false,
    enabled = () => true,
    loadingState = "isComplete",
  } = options;

  const animationsStore = useAnimationsStore();
  let hasRun = false;
  let cancelPending: (() => void) | null = null;

  const stopWatch = watch(
    () => animationsStore.getSectionState("loading"),
    (state) => {
      if (state !== loadingState) {
        return;
      }

      if (!enabled()) {
        return;
      }

      if (once && hasRun) {
        return;
      }

      cancelPending?.();
      cancelPending = runAfterFrames(() => {
        callback();
      }, delayMs);

      hasRun = true;
    }
  );

  onScopeDispose(() => {
    stopWatch();
    cancelPending?.();
  });

  return {
    stop: stopWatch,
  };
};
