import { reactive, type Ref } from "vue";

export interface CursorGridSettings {
  imgSize: number;
  maxDistance: number;
  gap: number;
  step: number;
  cols: number;
  rows: number;
}

interface CursorCanvasState {
  width: number;
  height: number;
}

interface UseCursorGridOptions {
  canvasState: Ref<CursorCanvasState>;
  isMobileOrTouch: Ref<boolean>;
}

export const useCursorGrid = ({
  canvasState,
  isMobileOrTouch,
}: UseCursorGridOptions) => {
  const grid = reactive<CursorGridSettings>({
    imgSize: 65,
    maxDistance: 195,
    gap: 50,
    step: 60,
    cols: 0,
    rows: 0,
  });

  const updateGridSettings = () => {
    if (
      !canvasState.value.width ||
      !canvasState.value.height ||
      isMobileOrTouch.value
    ) {
      return;
    }

    if (canvasState.value.width >= 1024) {
      grid.imgSize = canvasState.value.height * 0.06;
      grid.maxDistance = canvasState.value.height * 0.2;
    } else {
      grid.imgSize = canvasState.value.height * 0.04;
      grid.maxDistance = canvasState.value.height * 0.15;
    }

    grid.gap = canvasState.value.height * 0.035;
    grid.step = grid.imgSize + grid.gap;
    grid.cols = Math.ceil(canvasState.value.width / (grid.imgSize + grid.gap));
    grid.rows = Math.ceil(canvasState.value.height / (grid.imgSize + grid.gap));
  };

  return {
    grid,
    updateGridSettings,
  };
};
