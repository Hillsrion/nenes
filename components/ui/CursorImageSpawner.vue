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
 *
 * Performance Optimization:
 * - Images are only loaded on non-touch devices where the effect is used
 * - On mobile/touch devices, no images are preloaded to save bandwidth
 * - Canvas setup and animations are completely disabled on touch devices
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

// Function to check AVIF support
const checkAvifSupport = (): boolean => {
  const canvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return false;
  canvas.width = canvas.height = 1;
  const avifData =
    "data:image/avif;base64,AAAAHGZ0eXBhYXZpZjhpZjBvbWlmbGEAAAAAHGhlYWRlciNpZmFzAAAAAAhtZGF0AAAAABpgaXZmaA==";
  return canvas.toDataURL(avifData).indexOf("image/avif") === 5;
};

const avifSupported = checkAvifSupport();

// Function to check WebP support
const checkWebPSupport = (): boolean => {
  const canvas =
    typeof document !== "undefined" ? document.createElement("canvas") : null;
  if (!canvas) return false;
  canvas.width = canvas.height = 1;
  const webpData =
    "data:image/webp;base64,UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAQAAAPwBAAA=";
  return canvas.toDataURL(webpData).indexOf("image/webp") === 5;
};

const webpSupported = checkWebPSupport();

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
  images: () => [],
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
  imgSize: 65,
  maxDistance: 195,
  gap: 50,
  step: 60,
  cols: 0,
  rows: 0,
});

// Force scale animation
const forceScaleState = reactive({ value: 0 });

/**
 * Handle window resize - re-detect device type
 */
const onResize = async () => {
  const wasMobileOrTouch = isMobileOrTouch.value;
  isMobileOrTouch.value = detectMobileOrTouch();

  // If device type changed from non-touch to touch, stop animation and cleanup
  if (!wasMobileOrTouch && isMobileOrTouch.value) {
    stopAnimation();
    stopMouse();
    // Reset loaded state since images won't be used on touch devices
    isLoaded.value = false;
    imageArray.value = [];
  }
  // If device type changed from touch to non-touch, load images and start animation
  else if (
    wasMobileOrTouch &&
    !isMobileOrTouch.value &&
    !props.disabled &&
    animationsStore.getSectionState("loading") === "isComplete"
  ) {
    // Load images for desktop interaction
    await loadImages();
    setupCanvas();
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
  // Only initialize if we have valid canvas dimensions and not on mobile/touch
  if (
    !canvasState.value.width ||
    !canvasState.value.height ||
    isMobileOrTouch.value
  ) {
    return;
  }

  // Initialize to center of canvas
  mouse.x = canvasState.value.width / 2;
  mouse.y = canvasState.value.height / 2;
  mouse.nX = 0;
  mouse.nY = 0;
  target.x = mouse.x;
  target.y = mouse.y;
};

/**
 * Initialize mouse position to actual cursor position
 */
const initializeMousePositionToCursor = () => {
  // Don't initialize cursor position on mobile/touch devices
  if (isMobileOrTouch.value) {
    return;
  }

  // Get the actual cursor position by listening to the next mousemove
  const handleInitialMove = (event: MouseEvent) => {
    const rect = containerRef.value?.getBoundingClientRect();
    if (!rect) {
      // Fallback to center if container not ready
      initializeMousePosition();
      return;
    }

    mouse.x = clamp(event.clientX - rect.left, 0, canvasState.value.width);
    mouse.y = clamp(event.clientY - rect.top, 0, canvasState.value.height);
    mouse.nX = (mouse.x / canvasState.value.width) * 2 - 1;
    mouse.nY = -(mouse.y / canvasState.value.height) * 2 + 1;
    target.x = mouse.x;
    target.y = mouse.y;

    // Remove this one-time listener and add the regular listener
    window.removeEventListener("mousemove", handleInitialMove);
    window.addEventListener("mousemove", onMouseMove, { passive: true });
  };

  // Add a one-time listener to capture the current cursor position
  window.addEventListener("mousemove", handleInitialMove, { passive: true });

  // Also check if cursor is over the document at this moment
  // This is a fallback to capture the position even if no mousemove event fires
  setTimeout(() => {
    window.removeEventListener("mousemove", handleInitialMove);
    if (!window.addEventListener) return;

    // If we haven't gotten a position yet, initialize to center
    if (target.x === 0 && target.y === 0) {
      initializeMousePosition();
      window.addEventListener("mousemove", onMouseMove, { passive: true });
    }
  }, 50);
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

  const expandedImages = imageCategories.map((category) => ({
    url: category.url,
    ratio: category.ratio,
  }));

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

      // Use AVIF if supported, otherwise WebP if supported, otherwise fallback to JPG
      if (avifSupported) {
        img.src = imageData.url.replace(".webp", ".avif");
      } else if (webpSupported) {
        img.src = imageData.url;
      } else {
        img.src = imageData.url.replace(".webp", ".jpg");
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
  // Only update grid settings if we have valid canvas dimensions and not on mobile/touch
  if (
    !canvasState.value.width ||
    !canvasState.value.height ||
    isMobileOrTouch.value
  ) {
    return;
  }

  // Responsive sizing - reduced ratios for smaller grid
  if (canvasState.value.width >= 1024) {
    grid.imgSize = canvasState.value.height * 0.06; // Increased from 0.045
    grid.maxDistance = canvasState.value.height * 0.2; // Adjusted for larger size
  } else {
    grid.imgSize = canvasState.value.height * 0.04; // Increased from 0.03
    grid.maxDistance = canvasState.value.height * 0.15; // Adjusted for larger size
  }

  grid.gap = canvasState.value.height * 0.035;
  grid.step = grid.imgSize + grid.gap;
  grid.cols = Math.ceil(canvasState.value.width / (grid.imgSize + grid.gap));
  grid.rows = Math.ceil(canvasState.value.height / (grid.imgSize + grid.gap));
};

/**
 * Setup canvas
 */
const setupCanvas = () => {
  if (!containerRef.value || !canvasRef.value || isMobileOrTouch.value) return;

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
  target.x = lerp(target.x, mouse.x, 0.15);
  target.y = lerp(target.y, mouse.y, 0.15);

  // Draw images in grid only if we have images loaded
  if (imageArray.value.length > 0) {
    for (let row = -1; row < grid.rows + 1; row++) {
      for (let col = -1; col < grid.cols + 1; col++) {
        const imageIndex = modulo(
          col * grid.cols + row,
          imageArray.value.length
        );
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
          col * grid.step + timestamp * 0.08
        );

        const y = wrap(
          -grid.step - grid.gap,
          canvasState.value.height + grid.step,
          row * grid.step - timestamp * 0.08
        );

        // Calculate center position
        const xOffset = (grid.imgSize - width) / 2;
        const yOffset = (grid.imgSize - height) / 2;
        const centerX = x + xOffset + grid.imgSize * 0.5;
        const centerY = y + yOffset + grid.imgSize * 0.5;

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
    isMobileOrTouch.value ||
    !isLoaded.value
  )
    return;

  isActive.value = true;

  // Initialize mouse position to cursor position before starting (if requested)
  if (initializePosition) {
    initializeMousePositionToCursor();
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

  // Only load images and setup canvas on non-touch devices
  // since cursor images are only used for the desktop interaction effect
  if (!isMobileOrTouch.value) {
    await loadImages();
    setupCanvas();

    // Only start mouse tracking on non-touch devices
    // Don't start animation yet - wait for loading section to complete
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
    } else if (assetPreloader.isComplete.value && !isMobileOrTouch.value) {
      // If not loaded but assets are preloaded and not on mobile/touch, load images
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
  async (loadingState) => {
    if (
      loadingState === "isComplete" &&
      !props.disabled &&
      !isMobileOrTouch.value
    ) {
      // When loading section completes (including translate animation),
      // load images if not already loaded and start animation
      if (!isLoaded.value) {
        await loadImages();
        setupCanvas();
      }
      startMouse();
      startAnimation(true);
    }
  }
);

// Watch for entry cover scaling - stop animation when cover starts to grow, restart when scrolling back
watch(
  () => animationsStore.getCoverScaling,
  async (isScaling) => {
    if (isScaling && isActive.value) {
      // Cover is growing - stop the animation
      stopAnimation();
    } else if (
      !isScaling &&
      !isActive.value &&
      !props.disabled &&
      !isMobileOrTouch.value &&
      animationsStore.getSectionState("loading") === "isComplete"
    ) {
      // Cover is no longer scaling (scrolled back) - restart the animation
      // Load images if not already loaded
      if (!isLoaded.value) {
        await loadImages();
        setupCanvas();
      }
      startMouse();
      startAnimation(false); // Don't reinitialize position, use current cursor position
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

