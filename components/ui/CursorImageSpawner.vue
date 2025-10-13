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
/**
 * CursorImageSpawner Component
 *
 * A canvas-based image particle system that creates floating images
 * that follow the cursor with distance-based scaling and parallax effects.
 */

// @ts-ignore - Nuxt auto-imports
import { ref, reactive, onMounted, onUnmounted, watch, type Ref } from "vue";
import { useCanvas } from "../../composables/useCanvas";
import { useAssetPreloader } from "../../composables/useAssetPreloader";
import { useAnimationsStore } from "../../stores";
import { clamp, modulo, lerp, wrap } from "../../utils/mathUtils";

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
const containerRef = ref<HTMLElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// State
const isActive = ref(false);
const isLoaded = ref(false);
const imageArray = ref<ImageItem[]>([]);

// Asset preloader
const assetPreloader = useAssetPreloader();

// Animations store
const animationsStore = useAnimationsStore();

// Device detection - disable on mobile/touch devices
const isMobileOrTouch = ref(false);

/**
 * Detect if device is mobile or touch-enabled
 */
const detectMobileOrTouch = (): boolean => {
  // Check for touch capability
  const hasTouch = "ontouchstart" in window || navigator.maxTouchPoints > 0;

  // Check for coarse pointer (typical of touch devices)
  const hasCoarsePointer = window.matchMedia("(pointer: coarse)").matches;

  // Check for no hover capability (typical of touch devices)
  const noHover = window.matchMedia("(hover: none)").matches;

  // Check screen width as fallback
  const smallScreen = window.innerWidth < 768;

  return hasTouch || hasCoarsePointer || noHover || smallScreen;
};

// Mouse tracking - will be initialized to center or current cursor position
const mouse = reactive({ x: 0, y: 0, nX: 0, nY: 0 });
const target = reactive({ x: 0, y: 0 });

// Canvas variables
let animationId: number | null = null;
let canvasDispose: (() => void) | null = null;
let canvasComposable: ReturnType<typeof useCanvas> | null = null;

// Canvas state
const canvasState = ref({ width: 0, height: 0 });

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
 * Handle window resize - re-detect device type
 */
const onResize = () => {
  const wasMobileOrTouch = isMobileOrTouch.value;
  isMobileOrTouch.value = detectMobileOrTouch();

  // If device type changed from non-touch to touch, stop animation
  if (!wasMobileOrTouch && isMobileOrTouch.value) {
    stopAnimation();
    stopMouse();
  }
  // If device type changed from touch to non-touch, start animation
  else if (
    wasMobileOrTouch &&
    !isMobileOrTouch.value &&
    !props.disabled &&
    isLoaded.value &&
    animationsStore.getSectionState("loading") === "isComplete"
  ) {
    startMouse();
    startAnimation(true);
  }
};

const onMouseMove = (event: MouseEvent) => {
  if (props.disabled || isMobileOrTouch.value) return;

  // Get mouse position relative to the canvas container
  const rect = containerRef.value?.getBoundingClientRect();
  if (!rect) return;

  mouse.x = clamp(event.clientX - rect.left, 0, canvasState.value.width);
  mouse.y = clamp(event.clientY - rect.top, 0, canvasState.value.height);
  mouse.nX = (mouse.x / canvasState.value.width) * 2 - 1;
  mouse.nY = -(mouse.y / canvasState.value.height) * 2 + 1;
};

/**
 * Initialize mouse position to center of canvas
 */
const initializeMousePosition = () => {
  // Initialize to center of canvas
  mouse.x = canvasState.value.width / 2;
  mouse.y = canvasState.value.height / 2;
  mouse.nX = 0;
  mouse.nY = 0;
  target.x = mouse.x;
  target.y = mouse.y;
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
    ratio: 1, // Default ratio, will be updated when image loads
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

  // Shuffle array for visual variety
  for (let i = expandedImages.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [expandedImages[i], expandedImages[j]] = [
      expandedImages[j],
      expandedImages[i],
    ];
  }

  // Load images (should be fast since asset preloader handles caching)
  const loadedImages: ImageItem[] = [];

  await new Promise<void>((resolve) => {
    let loadedCount = 0;

    expandedImages.forEach((imageData, index) => {
      const img = new Image();

      // Set crossOrigin for external assets if needed
      if (imageData.url.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }

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

      img.onerror = () => {
        console.warn(`Failed to load image: ${imageData.url}`);
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
  if (canvasState.value.width >= 1024) {
    grid.imgSize = canvasState.value.height * 0.075;
    grid.maxDistance = canvasState.value.height * 0.3;
  } else {
    grid.imgSize = canvasState.value.height * 0.05;
    grid.maxDistance = canvasState.value.height * 0.2;
  }

  grid.gap = canvasState.value.height * 0.06;
  grid.step = grid.imgSize + grid.gap;
  grid.cols = Math.ceil(canvasState.value.width / (grid.imgSize + grid.gap));
  grid.rows = Math.ceil(canvasState.value.height / (grid.imgSize + grid.gap));
};

/**
 * Setup canvas
 */
const setupCanvas = () => {
  if (!containerRef.value || !canvasRef.value) return;

  // Initialize canvas using the composable
  const canvasComp = useCanvas(containerRef, {
    autoResize: true,
    onResize: () => {
      // Update canvas state when canvas is resized
      canvasState.value = {
        width: canvasComp.state.value.width,
        height: canvasComp.state.value.height,
      };
      updateGridSettings();
    },
  });

  canvasComp.init(canvasRef.value);

  // Store the composable for use in animations
  canvasComposable = canvasComp;
  canvasDispose = canvasComp.dispose;

  // Update canvas state initially
  canvasState.value = {
    width: canvasComp.state.value.width,
    height: canvasComp.state.value.height,
  };
};

/**
 * Animation loop
 */
const animate = (timestamp: number) => {
  if (
    !canvasComposable?.context.value ||
    !canvasComposable?.canvas.value ||
    !isLoaded.value ||
    props.disabled ||
    isMobileOrTouch.value ||
    !canvasState.value.width ||
    !canvasState.value.height
  ) {
    animationId = requestAnimationFrame(animate);
    return;
  }

  const ctx = canvasComposable.context.value;
  const canvas = canvasComposable.canvas.value;

  // Clear canvas
  ctx.clearRect(0, 0, canvasState.value.width, canvasState.value.height);

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
        canvasState.value.width + grid.step,
        col * grid.step + timestamp * 0.1
      );

      const y = wrap(
        -grid.step - grid.gap,
        canvasState.value.height + grid.step,
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
 * @param initializePosition - Whether to initialize mouse position before starting
 */
const startAnimation = (initializePosition = false) => {
  if (
    isActive.value ||
    !canvasComposable?.context.value ||
    !canvasComposable?.canvas.value ||
    isMobileOrTouch.value
  )
    return;

  isActive.value = true;

  // Initialize mouse position to center before starting (if requested)
  if (initializePosition) {
    initializeMousePosition();
  }

  // Animate force scale from 0 to 1
  const startTime = performance.now();
  const duration = 800;

  const animateForceScale = (currentTime: number) => {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Ease cubic.out for smoother, natural fade-in
    const eased = 1 - Math.pow(1 - progress, 3);

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
  // Detect mobile/touch devices
  isMobileOrTouch.value = detectMobileOrTouch();

  // Wait for asset preloading to complete (if not already done)
  if (!assetPreloader.isComplete.value) {
    await assetPreloader.preloadAllAssets();
  }

  await loadImages();
  setupCanvas();

  // Only start mouse tracking on non-touch devices
  // Don't start animation yet - wait for loading section to complete
  if (!isMobileOrTouch.value) {
    startMouse();

    // If loading section is already complete, start animation immediately
    if (
      !props.disabled &&
      animationsStore.getSectionState("loading") === "isComplete"
    ) {
      // Initialize position and start animation
      startAnimation(true);
    }
  }

  // Listen for resize events to re-detect device type
  window.addEventListener("resize", onResize, { passive: true });
});

onUnmounted(() => {
  stopMouse();
  window.removeEventListener("resize", onResize);
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
  async (disabled) => {
    if (disabled || isMobileOrTouch.value) {
      stopAnimation();
    } else if (
      isLoaded.value &&
      animationsStore.getSectionState("loading") === "isComplete"
    ) {
      // Only start if loading section is complete
      startAnimation(true);
    } else if (assetPreloader.isComplete.value) {
      // If not loaded but assets are preloaded, load images
      await loadImages();
      // Don't start yet if loading is not complete
      if (animationsStore.getSectionState("loading") === "isComplete") {
        startAnimation(true);
      }
    }
  }
);

// Watch for loading section state changes
watch(
  () => animationsStore.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      !props.disabled &&
      !isMobileOrTouch.value &&
      isLoaded.value
    ) {
      // When loading section completes (including translate animation),
      // initialize mouse position and start animation
      startAnimation(true);
    }
  }
);

// Watch for entry cover scaling - stop animation when cover starts to grow
watch(
  () => animationsStore.getCoverScaling,
  (isScaling) => {
    if (isScaling && isActive.value) {
      stopAnimation();
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

