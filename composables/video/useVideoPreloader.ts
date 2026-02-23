import { useMediaStore } from "~/stores";

interface UseVideoPreloaderOptions {
  timeoutMs?: number;
  resolveOnError?: boolean;
}

export const useVideoPreloader = (
  options: UseVideoPreloaderOptions = {}
) => {
  const { timeoutMs = 6000, resolveOnError = false } = options;
  const mediaStore = useMediaStore();

  const preloadVideo = async (url: string): Promise<void> => {
    if (!url) {
      return;
    }

    if (mediaStore.isVideoLoaded(url)) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto";
      video.playsInline = true;
      video.muted = true;

      let settled = false;
      let timeoutId: number | null = null;

      const cleanup = () => {
        video.removeEventListener("canplaythrough", onReady);
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", onError);

        if (timeoutId !== null) {
          window.clearTimeout(timeoutId);
        }
      };

      const settle = (callback: () => void) => {
        if (settled) {
          return;
        }

        settled = true;
        cleanup();
        callback();
      };

      const onReady = () => {
        settle(() => {
          mediaStore.markVideoLoaded(url);
          resolve();
        });
      };

      const onError = () => {
        settle(() => {
          if (resolveOnError) {
            resolve();
            return;
          }

          reject(new Error(`Failed to preload video: ${url}`));
        });
      };

      video.addEventListener("canplaythrough", onReady);
      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
      video.addEventListener("error", onError);

      video.src = url;
      video.load();

      timeoutId = window.setTimeout(() => {
        settle(() => {
          mediaStore.markVideoLoaded(url);
          resolve();
        });
      }, timeoutMs);
    });
  };

  const preloadVideos = async (urls: string[]): Promise<void> => {
    await Promise.allSettled(urls.map((url) => preloadVideo(url)));
  };

  return {
    preloadVideo,
    preloadVideos,
  };
};
