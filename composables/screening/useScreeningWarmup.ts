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
}

export const useScreeningWarmup = ({
  sectionRef,
  stepsToPreload = [0, 1, 2],
}: UseScreeningWarmupOptions) => {
  const deviceStore = useDeviceStore();
  const { buildStepVideoUrl } = useR2VideoSource();
  const { preloadVideos } = useVideoPreloader({ resolveOnError: true });

  let hasTriggeredPreloadOnce = false;
  let observer: IntersectionObserver | null = null;

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
        });
      },
      { threshold: 0.25 }
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
