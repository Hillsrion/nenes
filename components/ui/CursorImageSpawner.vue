<template>
  <div
    ref="containerRef"
    class="fixed top-0 left-0 w-screen h-screen pointer-events-none z-[9999] overflow-hidden"
  >
    <canvas
      ref="canvasRef"
      class="absolute top-0 left-0 w-full h-full"
    ></canvas>
  </div>
</template>

<script setup lang="ts">
import { ref, toRef } from "vue";
import { useAssetPreloader } from "../../composables/useAssetPreloader";
import { useDeviceStore } from "../../stores";
import { useCursorPointer } from "~/composables/cursor/useCursorPointer";
import { useCursorImageLoader } from "~/composables/cursor/useCursorImageLoader";
import { useCursorGrid } from "~/composables/cursor/useCursorGrid";
import { useCursorRenderer } from "~/composables/cursor/useCursorRenderer";
import { useCursorLifecycle } from "~/composables/cursor/useCursorLifecycle";

interface Props {
  images?: string[];
  disabled?: boolean;
  forceScale?: number;
}

const props = withDefaults(defineProps<Props>(), {
  images: () => [],
  disabled: false,
  forceScale: 1,
});

const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const canvasState = ref({ width: 0, height: 0 });
const isMobileOrTouch = ref(false);

const assetPreloader = useAssetPreloader();
const deviceStore = useDeviceStore();

const disabledRef = toRef(props, "disabled");
const forceScaleRef = toRef(props, "forceScale");
const imagesRef = toRef(props, "images");

const detectMobileOrTouch = (): boolean => {
  if (!deviceStore.isInitialized) {
    deviceStore.initializeFromClient();
  } else {
    deviceStore.refreshViewportState();
  }

  return deviceStore.isMobileOrTouch;
};

const { imageArray, isLoaded, loadImages, resetImages } = useCursorImageLoader({
  images: imagesRef,
});

const { grid, updateGridSettings } = useCursorGrid({
  canvasState,
  isMobileOrTouch,
});

const { mouse, target, startMouse, stopMouse, initializeMousePositionToCursor } =
  useCursorPointer({
    containerRef,
    canvasState,
    isMobileOrTouch,
    isDisabled: disabledRef,
  });

const {
  isActive,
  setupCanvas,
  startAnimation,
  stopAnimation,
  forceStopAnimation,
  disposeRenderer,
} = useCursorRenderer({
  containerRef,
  canvasRef,
  canvasState,
  grid,
  imageArray,
  isLoaded,
  isMobileOrTouch,
  isDisabled: disabledRef,
  forceScale: forceScaleRef,
  mouse,
  target,
  initializePointerToCursor: initializeMousePositionToCursor,
  onCanvasResize: updateGridSettings,
});

useCursorLifecycle({
  disabled: disabledRef,
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
});

// Expose methods
defineExpose({
  start: startAnimation,
  stop: stopAnimation,
  isActive: () => isActive.value,
  isLoaded: () => isLoaded.value,
});
</script>
