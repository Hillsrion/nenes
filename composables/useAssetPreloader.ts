/**
 * Asset Preloader Composable
 *
 * Preloads critical assets before they are needed in animations
 * to prevent loading delays and ensure smooth user experience.
 */

import { useRuntimeConfig } from "nuxt/app";
import { ref, readonly } from "vue";

interface AssetPreloaderOptions {
  onProgress?: (loaded: number, total: number) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export const useAssetPreloader = (options: AssetPreloaderOptions = {}) => {
  const { onProgress, onComplete, onError } = options;

  // Get critical assets from runtime config
  const config = useRuntimeConfig();
  const criticalAssets = config.public.criticalAssets as string[];

  const loadedAssets = ref(0);
  const totalAssets = ref(criticalAssets.length);
  const isComplete = ref(false);

  /**
   * Preload a single asset
   */
  const preloadAsset = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if asset is already cached
      if (sessionStorage.getItem(`preloaded:${src}`)) {
        resolve();
        return;
      }

      const img = new Image();

      img.onload = () => {
        // Mark as preloaded in session storage
        sessionStorage.setItem(`preloaded:${src}`, "true");
        resolve();
      };

      img.onerror = () => {
        const error = new Error(`Failed to preload asset: ${src}`);
        reject(error);
      };

      // Set crossOrigin for external assets if needed
      if (src.startsWith("http")) {
        img.crossOrigin = "anonymous";
      }

      img.src = src;
    });
  };

  /**
   * Preload all critical assets
   */
  const preloadAllAssets = async (): Promise<void> => {
    if (isComplete.value) return;

    try {
      const preloadPromises = criticalAssets.map(async (asset) => {
        await preloadAsset(asset);
        loadedAssets.value++;

        // Report progress
        if (onProgress) {
          onProgress(loadedAssets.value, totalAssets.value);
        }
      });

      await Promise.all(preloadPromises);

      isComplete.value = true;

      if (onComplete) {
        onComplete();
      }
    } catch (error) {
      if (onError && error instanceof Error) {
        onError(error);
      } else {
        console.error("Asset preloading failed:", error);
      }
    }
  };

  /**
   * Check if an asset is already preloaded
   */
  const isAssetPreloaded = (src: string): boolean => {
    return !!sessionStorage.getItem(`preloaded:${src}`);
  };

  /**
   * Get preloading progress as percentage
   */
  const getProgress = (): number => {
    if (totalAssets.value === 0) return 100;
    return Math.round((loadedAssets.value / totalAssets.value) * 100);
  };

  return {
    preloadAllAssets,
    isAssetPreloaded,
    getProgress,
    isComplete: readonly(isComplete),
    loadedAssets: readonly(loadedAssets),
    totalAssets: readonly(totalAssets),
  };
};
