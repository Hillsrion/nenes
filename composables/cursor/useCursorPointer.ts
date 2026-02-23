import { reactive, type Ref } from "vue";
import { clamp } from "~/utils/mathUtils";

interface CursorPoint {
  x: number;
  y: number;
  nX: number;
  nY: number;
}

interface CursorTarget {
  x: number;
  y: number;
}

interface CursorCanvasState {
  width: number;
  height: number;
}

interface UseCursorPointerOptions {
  containerRef: Ref<HTMLElement | null>;
  canvasState: Ref<CursorCanvasState>;
  isMobileOrTouch: Ref<boolean>;
  isDisabled: Ref<boolean>;
}

export const useCursorPointer = ({
  containerRef,
  canvasState,
  isMobileOrTouch,
  isDisabled,
}: UseCursorPointerOptions) => {
  const mouse = reactive<CursorPoint>({ x: 0, y: 0, nX: 0, nY: 0 });
  const target = reactive<CursorTarget>({ x: 0, y: 0 });

  const updateFromEvent = (event: MouseEvent) => {
    const rect = containerRef.value?.getBoundingClientRect();
    if (!rect) {
      return;
    }

    mouse.x = clamp(event.clientX - rect.left, 0, canvasState.value.width);
    mouse.y = clamp(event.clientY - rect.top, 0, canvasState.value.height);
    mouse.nX = (mouse.x / canvasState.value.width) * 2 - 1;
    mouse.nY = -(mouse.y / canvasState.value.height) * 2 + 1;
  };

  const onMouseMove = (event: MouseEvent) => {
    if (isDisabled.value || isMobileOrTouch.value) {
      return;
    }

    updateFromEvent(event);
  };

  const initializeMousePosition = () => {
    if (
      !canvasState.value.width ||
      !canvasState.value.height ||
      isMobileOrTouch.value
    ) {
      return;
    }

    mouse.x = canvasState.value.width / 2;
    mouse.y = canvasState.value.height / 2;
    mouse.nX = 0;
    mouse.nY = 0;
    target.x = mouse.x;
    target.y = mouse.y;
  };

  const initializeMousePositionToCursor = () => {
    if (isMobileOrTouch.value) {
      return;
    }

    const handleInitialMove = (event: MouseEvent) => {
      const rect = containerRef.value?.getBoundingClientRect();
      if (!rect) {
        initializeMousePosition();
        return;
      }

      updateFromEvent(event);
      target.x = mouse.x;
      target.y = mouse.y;

      window.removeEventListener("mousemove", handleInitialMove);
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    };

    window.addEventListener("mousemove", handleInitialMove, { passive: true });

    window.setTimeout(() => {
      window.removeEventListener("mousemove", handleInitialMove);
      if (!window.addEventListener) {
        return;
      }

      if (target.x === 0 && target.y === 0) {
        initializeMousePosition();
        window.addEventListener("mousemove", onMouseMove, { passive: true });
      }
    }, 50);
  };

  const startMouse = () => {
    window.addEventListener("mousemove", onMouseMove, { passive: true });
  };

  const stopMouse = () => {
    window.removeEventListener("mousemove", onMouseMove);
  };

  return {
    mouse,
    target,
    startMouse,
    stopMouse,
    initializeMousePosition,
    initializeMousePositionToCursor,
  };
};
