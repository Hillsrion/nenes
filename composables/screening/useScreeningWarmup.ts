import { type Ref } from "vue";
import { useDeviceStore } from "~/stores";
import {
  useR2VideoSource,
  type VideoFormat,
  type VideoResolution,
} from "~/composables/video/useR2VideoSource";
import { useVideoPreloader } from "~/composables/video/useVideoPreloader";

interface UseScreeningWarmupOptions {
  sectionRef: Ref<HTMLElement | null>;
  stepsToPreload?: number[];
  modelUrl?: Ref<string>;
  imageUrls?: string[];
  onModelWarm?: () => void;
}

export const useScreeningWarmup = ({
  sectionRef,
  stepsToPreload = [0, 1, 2],
  modelUrl,
  imageUrls = [],
  onModelWarm,
}: UseScreeningWarmupOptions) => {
  const deviceStore = useDeviceStore();
  const { buildStepVideoUrl } = useR2VideoSource();
  const { preloadVideos } = useVideoPreloader({ resolveOnError: true });

  let hasTriggeredPreloadOnce = false;
  let observer: IntersectionObserver | null = null;

  const preloadImages = () => {
    imageUrls.forEach((url) => {
      const image = new Image();
      image.src = url;
    });
  };

  const preloadModel = async () => {
    if (!modelUrl?.value) return;

    try {
      // Consume the response so the GLB is stored in the browser cache before
      // ThreeBustViewer mounts. The viewer can then parse the cached file when
      // the scroll sequence reaches the model.
      const response = await fetch(modelUrl.value, {
        cache: "force-cache",
        mode: "cors",
      });
      if (response.ok) await response.arrayBuffer();
    } catch {
      // The viewer has its own fallback; a warmup failure must not block it.
    } finally {
      onModelWarm?.();
    }
  };

  const setupScreeningPreloadObserver = () => {
    if (!sectionRef.value || hasTriggeredPreloadOnce) {
      return;
    }

    if (!deviceStore.isInitialized) {
      deviceStore.initializeFromClient();
    }

    observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting || hasTriggeredPreloadOnce) {
            return;
          }

          hasTriggeredPreloadOnce = true;
          observer?.disconnect();
          observer = null;

          const useMobile = window.innerWidth <= 768;
          const format: VideoFormat = deviceStore.isIOS ? "mp4" : "webm";
          const resolution: VideoResolution = useMobile ? "mobile" : "1080p";

          const urls = stepsToPreload
            .map((stepIndex) =>
              buildStepVideoUrl({
                stepIndex,
                format,
                resolution,
              })
            )
            .filter(Boolean);

          preloadVideos(urls);
          preloadImages();
          void preloadModel();
        });
      },
      // Start fetching while the previous section still fills the viewport.
      // This leaves enough time to parse the mono-view GLB before it animates in.
      { threshold: 0, rootMargin: "150% 0px 75%" }
    );

    observer.observe(sectionRef.value);
  };

  const cleanupWarmupObserver = () => {
    observer?.disconnect();
    observer = null;
  };

  return {
    setupScreeningPreloadObserver,
    cleanupWarmupObserver,
  };
};
