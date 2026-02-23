import { reactive, ref, type Ref } from "vue";
import { useCanvas } from "~/composables/useCanvas";
import { lerp, modulo, wrap } from "~/utils/mathUtils";
import type { CursorGridSettings } from "~/composables/cursor/useCursorGrid";
import type { CursorImageItem } from "~/composables/cursor/useCursorImageLoader";

interface CursorCanvasState {
  width: number;
  height: number;
}

interface UseCursorRendererOptions {
  containerRef: Ref<HTMLElement | null>;
  canvasRef: Ref<HTMLCanvasElement | null>;
  canvasState: Ref<CursorCanvasState>;
  grid: CursorGridSettings;
  imageArray: Ref<CursorImageItem[]>;
  isLoaded: Ref<boolean>;
  isMobileOrTouch: Ref<boolean>;
  isDisabled: Ref<boolean>;
  forceScale: Ref<number>;
  mouse: { x: number; y: number };
  target: { x: number; y: number };
  initializePointerToCursor: () => void;
  onCanvasResize?: () => void;
}

export const useCursorRenderer = ({
  containerRef,
  canvasRef,
  canvasState,
  grid,
  imageArray,
  isLoaded,
  isMobileOrTouch,
  isDisabled,
  forceScale,
  mouse,
  target,
  initializePointerToCursor,
  onCanvasResize,
}: UseCursorRendererOptions) => {
  const isActive = ref(false);
  const forceScaleState = reactive({ value: 0 });

  let animationId: number | null = null;
  let canvasDispose: (() => void) | null = null;
  let canvasComposable: ReturnType<typeof useCanvas> | null = null;

  const setupCanvas = () => {
    if (!containerRef.value || !canvasRef.value || isMobileOrTouch.value) {
      return;
    }

    const canvasComp = useCanvas(containerRef, {
      autoResize: true,
      onResize: () => {
        canvasState.value = {
          width: canvasComp.state.value.width,
          height: canvasComp.state.value.height,
        };
        onCanvasResize?.();
      },
    });

    canvasComp.init(canvasRef.value);
    canvasComposable = canvasComp;
    canvasDispose = canvasComp.dispose;

    canvasState.value = {
      width: canvasComp.state.value.width,
      height: canvasComp.state.value.height,
    };
  };

  const clearCanvas = () => {
    if (
      canvasComposable?.context.value &&
      canvasState.value.width &&
      canvasState.value.height
    ) {
      canvasComposable.context.value.clearRect(
        0,
        0,
        canvasState.value.width,
        canvasState.value.height
      );
    }
  };

  const animate = (timestamp: number) => {
    if (
      !canvasComposable?.context.value ||
      !canvasComposable?.canvas.value ||
      !isLoaded.value ||
      isDisabled.value ||
      isMobileOrTouch.value ||
      !canvasState.value.width ||
      !canvasState.value.height
    ) {
      animationId = window.requestAnimationFrame(animate);
      return;
    }

    const ctx = canvasComposable.context.value;
    ctx.clearRect(0, 0, canvasState.value.width, canvasState.value.height);

    target.x = lerp(target.x, mouse.x, 0.15);
    target.y = lerp(target.y, mouse.y, 0.15);

    if (imageArray.value.length > 0) {
      for (let row = -1; row < grid.rows + 1; row += 1) {
        for (let col = -1; col < grid.cols + 1; col += 1) {
          const imageIndex = modulo(
            col * grid.cols + row,
            imageArray.value.length
          );
          const image = imageArray.value[imageIndex];
          if (!image) {
            continue;
          }

          const ratio = image.ratio;
          let width: number;
          let height: number;

          if (ratio > 1) {
            width = grid.imgSize;
            height = width / ratio;
          } else {
            height = grid.imgSize;
            width = height * ratio;
          }

          const x = wrap(
            -grid.step - grid.gap,
            canvasState.value.width + grid.step,
            col * grid.step + timestamp * 0.06
          );

          const y = wrap(
            -grid.step - grid.gap,
            canvasState.value.height + grid.step,
            row * grid.step - timestamp * 0.06
          );

          const xOffset = (grid.imgSize - width) / 2;
          const yOffset = (grid.imgSize - height) / 2;
          const centerX = x + xOffset + grid.imgSize * 0.5;
          const centerY = y + yOffset + grid.imgSize * 0.5;

          const distance = Math.sqrt(
            Math.pow(centerX - target.x, 2) + Math.pow(centerY - target.y, 2)
          );

          if (distance < grid.maxDistance) {
            const normalizedDistance = distance / grid.maxDistance;
            const scale =
              Math.max(0, 4 - normalizedDistance * 4) *
              forceScaleState.value *
              forceScale.value;

            const scaledWidth = width * scale;
            const scaledHeight = height * scale;

            ctx.drawImage(
              image.img,
              x + (grid.imgSize - scaledWidth) / 2,
              y + (grid.imgSize - scaledHeight) / 2,
              scaledWidth,
              scaledHeight
            );
          }
        }
      }
    }

    animationId = window.requestAnimationFrame(animate);
  };

  const startAnimation = (initializePosition = false) => {
    if (
      isActive.value ||
      !canvasComposable?.context.value ||
      !canvasComposable?.canvas.value ||
      isMobileOrTouch.value ||
      !isLoaded.value
    ) {
      return;
    }

    isActive.value = true;

    if (initializePosition) {
      initializePointerToCursor();
    }

    const startTime = performance.now();
    const duration = 800;

    const animateForceScale = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      forceScaleState.value = eased;
      if (progress < 1) {
        window.requestAnimationFrame(animateForceScale);
      }
    };

    window.requestAnimationFrame(animateForceScale);
    animationId = window.requestAnimationFrame(animate);
  };

  const stopAnimation = () => {
    if (!isActive.value) {
      return;
    }

    const startValue = forceScaleState.value;
    const startTime = performance.now();
    const duration = 300;

    const animateForceScale = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);

      forceScaleState.value = startValue * (1 - eased);

      if (progress < 1) {
        window.requestAnimationFrame(animateForceScale);
        return;
      }

      isActive.value = false;
      if (animationId) {
        window.cancelAnimationFrame(animationId);
        animationId = null;
      }
    };

    window.requestAnimationFrame(animateForceScale);
  };

  const forceStopAnimation = () => {
    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }

    isActive.value = false;
    forceScaleState.value = 0;
    clearCanvas();
  };

  const disposeRenderer = () => {
    if (animationId) {
      window.cancelAnimationFrame(animationId);
      animationId = null;
    }

    canvasDispose?.();
    canvasDispose = null;
    canvasComposable = null;
    isActive.value = false;
    forceScaleState.value = 0;
  };

  return {
    isActive,
    setupCanvas,
    clearCanvas,
    startAnimation,
    stopAnimation,
    forceStopAnimation,
    disposeRenderer,
  };
};
