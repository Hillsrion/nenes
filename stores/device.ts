import { defineStore } from "pinia";

interface DeviceState {
  isInitialized: boolean;
  isIOS: boolean;
  isTouchOrCoarse: boolean;
  isMobileViewport: boolean;
  supportsAvif: boolean;
  supportsWebp: boolean;
}

const checkFormatSupport = (mimeType: "image/avif" | "image/webp"): boolean => {
  if (typeof document === "undefined") {
    return false;
  }

  const canvas = document.createElement("canvas");
  if (!canvas.getContext) {
    return false;
  }

  canvas.width = 1;
  canvas.height = 1;

  try {
    const dataUrl = canvas.toDataURL(mimeType);
    return dataUrl.startsWith(`data:${mimeType}`);
  } catch {
    return false;
  }
};

const detectIOS = (): boolean => {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  return (
    /iPhone|iPad|iPod/.test(userAgent) ||
    (userAgent.includes("Macintosh") && navigator.maxTouchPoints > 0)
  );
};

const detectTouchOrCoarsePointer = (): boolean => {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  const noHover = window.matchMedia("(hover: none)").matches;

  return hasTouch || coarsePointer || noHover;
};

export const useDeviceStore = defineStore("device", {
  state: (): DeviceState => ({
    isInitialized: false,
    isIOS: false,
    isTouchOrCoarse: false,
    isMobileViewport: false,
    supportsAvif: false,
    supportsWebp: false,
  }),
  getters: {
    isMobileOrTouch: (state): boolean => {
      return state.isTouchOrCoarse || state.isMobileViewport;
    },
  },
  actions: {
    initializeFromClient(force = false) {
      if (typeof window === "undefined") {
        return;
      }

      if (this.isInitialized && !force) {
        return;
      }

      this.isIOS = detectIOS();
      this.isTouchOrCoarse = detectTouchOrCoarsePointer();
      this.isMobileViewport = window.innerWidth < 768;
      this.supportsAvif = checkFormatSupport("image/avif");
      this.supportsWebp = checkFormatSupport("image/webp");
      this.isInitialized = true;
    },
    refreshViewportState() {
      if (typeof window === "undefined") {
        return;
      }

      this.isMobileViewport = window.innerWidth < 768;
      this.isTouchOrCoarse = detectTouchOrCoarsePointer();
      this.isIOS = detectIOS();
    },
  },
});
