import { ref, onMounted, onUnmounted } from "vue";

interface CanvasOptions {
  autoResize?: boolean;
  dpr?: number;
  onResize?: () => void;
}

interface CanvasState {
  canvas: HTMLCanvasElement | null;
  context: CanvasRenderingContext2D | null;
  width: number;
  height: number;
  dpr: number;
}

/**
 * useCanvas Composable
 *
 * A Vue composable for managing HTML5 Canvas elements with automatic resizing,
 * device pixel ratio handling, and proper cleanup.
 *
 * @param container - Reference to the container element
 * @param options - Configuration options
 * @returns Canvas state and control functions
 */
export function useCanvas(
  container: Ref<HTMLElement | null>,
  options: CanvasOptions = {}
) {
  const {
    autoResize = true,
    dpr = Math.min(window.devicePixelRatio, 2),
    onResize,
  } = options;

  const canvas = ref<HTMLCanvasElement | null>(null);
  const context = ref<CanvasRenderingContext2D | null>(null);
  const state = ref<CanvasState>({
    canvas: null,
    context: null,
    width: 0,
    height: 0,
    dpr,
  });

  const resize = () => {
    if (!container.value || !canvas.value) return;

    const ctx = canvas.value.getContext("2d");
    if (!ctx) return;

    const rect = container.value.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    // Set actual canvas size in memory (scaled for DPR)
    canvas.value.width = width * state.value.dpr;
    canvas.value.height = height * state.value.dpr;

    // Set display size (CSS pixels)
    canvas.value.style.width = `${width}px`;
    canvas.value.style.height = `${height}px`;

    // Scale the drawing context so everything draws at the correct size
    ctx.scale(state.value.dpr, state.value.dpr);

    // Update state
    state.value = {
      canvas: canvas.value,
      context: ctx,
      width,
      height,
      dpr: state.value.dpr,
    };

    context.value = ctx;
    onResize?.();
  };

  const init = (canvasElement: HTMLCanvasElement) => {
    canvas.value = canvasElement;

    if (autoResize) {
      window.addEventListener("resize", resize);
    }

    resize();
  };

  const dispose = () => {
    if (autoResize) {
      window.removeEventListener("resize", resize);
    }
  };

  onMounted(() => {
    if (canvas.value) {
      init(canvas.value);
    }
  });

  onUnmounted(() => {
    dispose();
  });

  return {
    canvas: readonly(canvas),
    context: readonly(context),
    state: readonly(state),
    init,
    resize,
    dispose,
  };
}
