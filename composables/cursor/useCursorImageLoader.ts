import type { Ref } from "vue";
import { useDeviceStore } from "~/stores";

export interface CursorImageItem {
  img: HTMLImageElement;
  ratio: number;
  url?: string;
}

interface UseCursorImageLoaderOptions {
  images: Ref<string[]>;
}

export const useCursorImageLoader = ({ images }: UseCursorImageLoaderOptions) => {
  const deviceStore = useDeviceStore();
  const imageArray = ref<CursorImageItem[]>([]);
  const isLoaded = ref(false);

  const resolveImageUrl = (url: string): string => {
    if (deviceStore.supportsAvif) {
      return url.replace(".webp", ".avif");
    }

    if (deviceStore.supportsWebp) {
      return url;
    }

    return url.replace(".webp", ".jpg");
  };

  const loadImages = async (): Promise<void> => {
    if (!deviceStore.isInitialized) {
      deviceStore.initializeFromClient();
    }

    const expandedImages = images.value.map((url, index) => ({
      id: `image${index}`,
      url,
      ratio: 1,
    }));

    for (let i = expandedImages.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [expandedImages[i], expandedImages[j]] = [
        expandedImages[j],
        expandedImages[i],
      ];
    }

    if (expandedImages.length === 0) {
      isLoaded.value = true;
      imageArray.value = [];
      return;
    }

    const loadedImages: CursorImageItem[] = [];

    await new Promise<void>((resolve) => {
      let loadedCount = 0;

      expandedImages.forEach((imageData, index) => {
        const img = new Image();

        if (imageData.url.startsWith("http")) {
          img.crossOrigin = "anonymous";
        }

        img.src = resolveImageUrl(imageData.url);

        img.onload = () => {
          const ratio = img.width / img.height;
          loadedImages[index] = {
            img,
            ratio,
            url: imageData.url,
          };

          loadedCount += 1;
          if (loadedCount === expandedImages.length) {
            resolve();
          }
        };

        img.onerror = () => {
          loadedCount += 1;
          if (loadedCount === expandedImages.length) {
            resolve();
          }
        };
      });
    });

    imageArray.value = loadedImages;
    isLoaded.value = true;
  };

  const resetImages = () => {
    imageArray.value = [];
    isLoaded.value = false;
  };

  return {
    imageArray,
    isLoaded,
    loadImages,
    resetImages,
  };
};
