<template>
  <div ref="containerRef" class="cursor-image-spawner">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup lang="ts">
/**
 * CursorImageSpawner Component
 *
 * A canvas-based image particle system that creates floating images
 * that follow the cursor with distance-based scaling and parallax effects.
 */

// @ts-ignore - Nuxt auto-imports
import { ref, reactive, onMounted, onUnmounted, watch } from "vue";

interface ImageItem {
  img: HTMLImageElement;
  ratio: number;
  url?: string;
}

interface GridSettings {
  imgSize: number;
  maxDistance: number;
  gap: number;
  step: number;
  cols: number;
  rows: number;
}

interface Props {
  images?: string[];
  disabled?: boolean;
  forceScale?: number;
}

const props = withDefaults(defineProps<Props>(), {
  images: () => [
    "/images/illustrations/1.svg",
    "/images/illustrations/2.svg",
    "/images/illustrations/3.svg",
    "/images/illustrations/4.svg",
    "/images/illustrations/5.svg",
    "/images/illustrations/6.svg",
    "/images/illustrations/7.svg",
    "/images/illustrations/8.svg",
  ],
  disabled: false,
  forceScale: 1,
});

// Refs
const containerRef = ref<HTMLElement>();
const canvasRef = ref<HTMLCanvasElement>();

// State
const isActive = ref(false);
const isLoaded = ref(false);
const imageArray = ref<ImageItem[]>([]);

// Mouse tracking
const mouse = reactive({ x: 0, y: 0, nX: 0, nY: 0 });
const target = reactive({ x: 0, y: 0 });

// Canvas variables
let canvas: HTMLCanvasElement | null = null;
let ctx: CanvasRenderingContext2D | null = null;
let animationId: number | null = null;
let canvasDispose: (() => void) | null = null;

// Grid settings
const grid = reactive<GridSettings>({
  imgSize: 75,
  maxDistance: 250,
  gap: 50,
  step: 135,
  cols: 0,
  rows: 0,
});

// Force scale animation
const forceScaleState = reactive({ value: 0 });

/**
 * Utility: Clamp value between min and max
 */
const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

/**
 * Utility: Modulo operation that handles negative numbers
 */
const modulo = (value: number, modulus: number): number =>
  ((value % modulus) + modulus) % modulus;

/**
 * Utility: Linear interpolation
 */
const lerp = (start: number, end: number, factor: number): number =>
  start + (end - start) * factor;

/**
 * Utility: Wrap value within range
 */
const wrap = (min: number, max: number, value: number): number => {
  const range = max - min;
  return min + modulo(value - min, range);
};

const onMouseMove = (event: MouseEvent) => {
  if (props.disabled) return;

  mouse.x = clamp(event.clientX, 0, window.innerWidth);
  mouse.y = clamp(event.clientY, 0, window.innerHeight);
  mouse.nX = (mouse.x / window.innerWidth) * 2 - 1;
  mouse.nY = -(mouse.y / window.innerHeight) * 2 + 1;
};

/**
 * Start mouse tracking
 */
const startMouse = () => {
  window.addEventListener("mousemove", onMouseMove, { passive: true });
};

/**
 * Stop mouse tracking
 */
const stopMouse = () => {
  window.removeEventListener("mousemove", onMouseMove);
};

const loadImages = async (): Promise<void> => {
  // Create image categories with ratios
  const imageCategories = props.images.map((url, index) => ({
    id: `image${index}`,
    ratio: 600 / 600,
    url,
  }));

  // Create 6 instances of each image
  const expandedImages = imageCategories.flatMap((category) =>
    Array(6)
      .fill(null)
      .map((_, index) => ({
        url: category.url,
        ratio: category.ratio,
      }))
  );

  // Shuffle array
  for (let i = expandedImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [expandedImages[i], expandedImages[j]] = [
      expandedImages[j],
      expandedImages[i],
    ];
  }

  // Load images and store them
  let loadedCount = 0;
  const loadedImages: ImageItem[] = [];

  await new Promise<void>((resolve) => {
    expandedImages.forEach((imageData, index) => {
      const img = new Image();
      img.onload = () => {
        // Calculate actual ratio from loaded image
        const ratio = img.width / img.height;
        loadedImages[index] = {
          img,
          ratio,
          url: imageData.url,
        };
        loadedCount++;
        if (loadedCount === expandedImages.length) {
          resolve();
        }
      };
      img.src = imageData.url;
    });
  });

  // Store loaded images
  imageArray.value = loadedImages;
  isLoaded.value = true;
};

/**
 * Update grid settings
 */
const updateGridSettings = () => {
  // Responsive sizing
  if (window.innerWidth >= 1024) {
    grid.imgSize = window.innerHeight * 0.075;
    grid.maxDistance = window.innerHeight * 0.3;
  } else {
    grid.imgSize = window.innerHeight * 0.05;
    grid.maxDistance = window.innerHeight * 0.2;
  }

  grid.gap = window.innerHeight * 0.06;
  grid.step = grid.imgSize + grid.gap;
  grid.cols = Math.ceil(window.innerWidth / (grid.imgSize + grid.gap));
  grid.rows = Math.ceil(window.innerHeight / (grid.imgSize + grid.gap));
};

/**
 * Create canvas
 */
const createCanvas = (options: {
  wrapper: HTMLElement;
  canvas: HTMLCanvasElement;
  autoResize: boolean;
  onResizeCallback?: () => void;
}) => {
  let context: CanvasRenderingContext2D | null = null;
  let dpr = 0;
  let width = 0;
  let height = 0;

  const resize = () => {
    context = options.canvas.getContext("2d");
    if (!context) return;

    dpr = Math.min(window.devicePixelRatio, 2);
    width = options.wrapper.offsetWidth;
    height = options.wrapper.offsetHeight;
    options.canvas.width = width * dpr;
    options.canvas.height = height * dpr;
    options.canvas.style.width = `${width}px`;
    options.canvas.style.height = `${height}px`;
    context.scale(dpr, dpr);
    options.onResizeCallback?.();
  };

  if (options.autoResize) {
    window.addEventListener("resize", resize);
  }

  resize();

  return {
    canvas: options.canvas,
    wW: width,
    wH: height,
    getContext: () => context,
    dispose: () => {
      if (options.autoResize) {
        window.removeEventListener("resize", resize);
      }
    },
  };
};

/**
 * Setup canvas
 */
const setupCanvas = () => {
  if (!containerRef.value || !canvasRef.value) return;

  const canvasData = createCanvas({
    wrapper: containerRef.value,
    canvas: canvasRef.value,
    autoResize: true,
    onResizeCallback: updateGridSettings,
  });

  canvas = canvasData.canvas;
  ctx = canvasData.getContext();
  canvasDispose = canvasData.dispose;

  updateGridSettings();
};

/**
 * Animation loop
 */
const animate = (timestamp: number) => {
  if (!ctx || !canvas || !isLoaded.value || props.disabled) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  // Clear canvas
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

  // Smooth mouse interpolation
  target.x = lerp(target.x, mouse.x, 0.005);
  target.y = lerp(target.y, mouse.y, 0.005);

  // Draw images in grid
  for (let row = -1; row < grid.rows + 1; row++) {
    for (let col = -1; col < grid.cols + 1; col++) {
      const imageIndex = modulo(col * grid.cols + row, imageArray.value.length);
      const image = imageArray.value[imageIndex];

      if (!image) continue;

      const ratio = image.ratio;
      let width: number, height: number;

      // Calculate dimensions based on aspect ratio
      if (ratio > 1) {
        width = grid.imgSize;
        height = width / ratio;
      } else {
        height = grid.imgSize;
        width = height * ratio;
      }

      // Calculate position with parallax effect
      const x = wrap(
        -grid.step - grid.gap,
        window.innerWidth + grid.step,
        col * grid.step + timestamp * 0.1
      );

      const y = wrap(
        -grid.step - grid.gap,
        window.innerHeight + grid.step,
        row * grid.step - timestamp * 0.1
      );

      // Calculate center position
      const ye = (grid.imgSize - width) / 2;
      const Re = (grid.imgSize - height) / 2;
      const centerX = x + ye + grid.imgSize * 0.5;
      const centerY = y + Re + grid.imgSize * 0.5;

      // Calculate distance from cursor
      const distance = Math.sqrt(
        Math.pow(centerX - target.x, 2) + Math.pow(centerY - target.y, 2)
      );

      // Only draw if within max distance
      if (distance < grid.maxDistance) {
        // Calculate scale based on distance
        const normalizedDistance = distance / grid.maxDistance;
        const scale =
          Math.max(0, 4 - normalizedDistance * 4) *
          forceScaleState.value *
          props.forceScale;

        const scaledWidth = width * scale;
        const scaledHeight = height * scale;

        // Draw image
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

  animationId = requestAnimationFrame(animate);
};

/**
 * Start animation with force scale fade in
 */
const startAnimation = () => {
  if (isActive.value) return;

  isActive.value = true;

  // Animate force scale from 0 to 1
  const startTime = performance.now();
  const duration = 300;

  const animateForceScale = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease power2.inOut approximation
    const eased =
      progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

    forceScaleState.value = eased;

    if (progress < 1) {
      requestAnimationFrame(animateForceScale);
    }
  };

  requestAnimationFrame(animateForceScale);
  animationId = requestAnimationFrame(animate);
};

/**
 * Stop animation with force scale fade out
 */
const stopAnimation = () => {
  if (!isActive.value) return;

  // Animate force scale from current to 0
  const startValue = forceScaleState.value;
  const startTime = performance.now();
  const duration = 300;

  const animateForceScale = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease power2.out approximation
    const eased = 1 - Math.pow(1 - progress, 2);

    forceScaleState.value = startValue * (1 - eased);

    if (progress < 1) {
      requestAnimationFrame(animateForceScale);
    } else {
      isActive.value = false;
      if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }
    }
  };

  requestAnimationFrame(animateForceScale);
};

// Lifecycle
onMounted(async () => {
  await loadImages();
  setupCanvas();
  startMouse();

  if (!props.disabled) {
    startAnimation();
  }
});

onUnmounted(() => {
  stopMouse();
  if (animationId) {
    cancelAnimationFrame(animationId);
  }
  if (canvasDispose) {
    canvasDispose();
  }
});

// Watch for disabled prop changes
watch(
  () => props.disabled,
  (disabled) => {
    if (disabled) {
      stopAnimation();
    } else if (isLoaded.value) {
      startAnimation();
    }
  }
);

// Expose methods
defineExpose({
  start: startAnimation,
  stop: stopAnimation,
  isActive: () => isActive.value,
  isLoaded: () => isLoaded.value,
});
</script>

<style scoped>
.cursor-image-spawner {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 9999;
  overflow: hidden;
}

.cursor-image-spawner canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
}
</style>
