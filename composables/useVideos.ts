import { ref, computed, onMounted, onUnmounted, watch, type Ref } from "vue";

interface Step {
  content: string;
  videoUrl?: string;
  mobileUrl?: string;
  desktopUrl?: string;
}

interface UseVideosOptions {
  steps: Step[];
  currentStepIndex: Ref<number>;
  videoRef: Ref<HTMLVideoElement | null>;
  overlayRef: Ref<HTMLDivElement | null>;
  transitionCallback?: (url: string) => void;
  getVideoSource: (
    stepIndex: number,
    format: "mp4" | "webm",
    resolution: "1080p" | "1440p" | "mobile"
  ) => string;
}

export function useVideos(options: UseVideosOptions) {
  const {
    steps,
    currentStepIndex,
    videoRef,
    overlayRef,
    transitionCallback,
    getVideoSource,
  } = options;

  // State management
  const loadedVideos = ref<Set<string>>(new Set());
  const videoLoading = ref(false);
  const actualVideoUrl = ref("");
  const isTransitioning = ref(false);

  // Device detection
  const isMobileOrTablet = ref(false);
  const isIOS = ref(false);
  const isLargeScreen = ref(false);

  // Debounce helper function
  const debounce = <T extends (...args: any[]) => void>(func: T, delay: number) => {
    let timeout: ReturnType<typeof setTimeout>;
    return (...args: Parameters<T>) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => func(...args), delay);
    };
  };

  // Initialize mobile/tablet detection and first video
  onMounted(() => {
    const checkDevice = () => {
      isMobileOrTablet.value = window.innerWidth <= 768;
      isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    checkDevice();
    window.addEventListener("resize", checkDevice);

    // Initialize the first video URL after device is checked
    const firstStep = steps[0];
    if (firstStep) {
      const firstVideoUrl = isMobileOrTablet.value
        ? options.getVideoSource(0, "mp4", "mobile")
        : options.getVideoSource(0, isIOS.value ? "mp4" : "webm", "1080p");

      if (firstVideoUrl) {
        actualVideoUrl.value = firstVideoUrl;
        loadVideo(firstVideoUrl);
      }
    }
  });

  // Cleanup
  onUnmounted(() => {
    loadedVideos.value.clear();
    videoLoading.value = false;
    actualVideoUrl.value = "";
    isTransitioning.value = false;
  });

  // Current video URL based on current step and device type
  const currentVideoUrl = computed(() => {
    const currentStep = steps[currentStepIndex.value];
    if (!currentStep) return "";

    const format = isIOS.value ? "mp4" : "webm";
    return isMobileOrTablet.value
      ? options.getVideoSource(currentStepIndex.value, format, "mobile")
      : options.getVideoSource(currentStepIndex.value, format, "1080p");
  });

  // Video loading method
  const loadVideo = async (url: string): Promise<void> => {
    if (!url) {
      return Promise.resolve();
    }
    if (loadedVideos.value.has(url)) {
      return Promise.resolve();
    }

    videoLoading.value = true;

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto"; // Ensure full video data is preloaded
      video.playsInline = true; // Essential for iOS autoplay
      video.muted = true; // Safe for iOS policies even if we don't autoplay during preload

      let settled = false;
      const settle = () => {
        if (settled) return;
        settled = true;
        loadedVideos.value.add(url);
        video.removeEventListener("canplaythrough", onCanPlayThrough);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
        clearTimeout(timeoutId);
        videoLoading.value = false; // Reset loading state
      };

      const onCanPlayThrough = () => {
        settle();
        resolve();
      };

      const onLoadedData = () => {
        settle();
        resolve();
      };

      const onCanPlay = () => {
        settle();
        resolve();
      };

      const onError = () => {
        video.removeEventListener("canplaythrough", onCanPlayThrough);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("canplay", onCanPlay);
        video.removeEventListener("error", onError);
        clearTimeout(timeoutId);
        videoLoading.value = false; // Reset loading state on error
        reject(new Error(`Failed to load video: ${url}`));
      };

      video.addEventListener("canplaythrough", onCanPlayThrough);
      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("canplay", onCanPlay);
      video.addEventListener("error", onError);

      // No need to check for "mobile" or "desktop" in url directly.
      // The getVideoSource function already handles the resolution and format.
      video.src = url;
      video.load(); // Explicitly trigger loading

      // Timeout fallback to avoid spinner lock on stubborn platforms
      const timeoutId = window.setTimeout(() => {
        settle();
        resolve();
      }, 6000);
    });
  };

  // Preload upcoming videos for better performance
  const preloadUpcomingVideos = async () => {
    const currentIndex = currentStepIndex.value;
    const upcomingIndices = [
      currentIndex + 1,
      currentIndex + 2,
      currentIndex + 3,
      currentIndex + 4,
      Math.max(0, currentIndex - 1),
      Math.max(0, currentIndex - 2),
    ].filter(
      (index) => index >= 0 && index < steps.length && index !== currentIndex
    );

    const preloadPromises = upcomingIndices.map((index) => {
      const step = steps[index];
      if (!step) return Promise.resolve();

      const format = isIOS.value ? "mp4" : "webm";
      const url = isMobileOrTablet.value
        ? options.getVideoSource(index, format, "mobile")
        : options.getVideoSource(index, format, "1080p");

      if (!url) return Promise.resolve();

      if (loadedVideos.value.has(url)) {
        return Promise.resolve();
      }

      return loadVideo(url);
    });

    await Promise.allSettled(preloadPromises);
  };

  // Video transition function
  const transitionToVideo = async () => {
    if (
      !overlayRef.value ||
      !videoRef.value ||
      !currentVideoUrl.value ||
      isTransitioning.value
    )
      return;

    const videoUrl = currentVideoUrl.value;

    // Set transitioning flag
    isTransitioning.value = true;

    // Call the transition callback (fade in overlay)
    if (transitionCallback) {
      transitionCallback(videoUrl);
    }

    // Wait for a short duration for the overlay to be fully opaque (e.g., 300ms, matching the tl.to duration)
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Load the video if not already loaded (this will happen while the overlay is opaque)
    if (!loadedVideos.value.has(videoUrl)) {
      videoLoading.value = true;
      await loadVideo(videoUrl);
      videoLoading.value = false;
    }

    // Update actualVideoUrl while the overlay is opaque
    actualVideoUrl.value = videoUrl;

    // Reset transitioning flag after full transition completes (after overlay fades out)
    setTimeout(() => {
      isTransitioning.value = false;
    }, 800);
  };

  // Watch for current step index changes and trigger video load/preload
  const debouncedTransitionToVideo = debounce(transitionToVideo, 100);

  watch(currentStepIndex, (newIndex) => {
    // Preload videos around this step for better performance immediately
    preloadUpcomingVideos();

    // If the video for the new step is different from the currently playing one, transition to it.
    // This check prevents unnecessary transitions if scrolling back to the same video or if the video is already correct.
    const newVideoUrl = isMobileOrTablet.value
      ? options.getVideoSource(newIndex, isIOS.value ? "mp4" : "webm", "mobile")
      : options.getVideoSource(newIndex, isIOS.value ? "mp4" : "webm", "1080p");
    if (newVideoUrl && actualVideoUrl.value !== newVideoUrl) {
      debouncedTransitionToVideo();
    }
  });

  // Watch for video URL changes and trigger transition
  watch(currentVideoUrl, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl && !isTransitioning.value) {
      transitionToVideo();
    }
  });

  return {
    // State
    loadedVideos,
    videoLoading,
    actualVideoUrl,
    isTransitioning,
    isMobileOrTablet,
    isLargeScreen,

    // Methods
    loadVideo,
    preloadUpcomingVideos,
    transitionToVideo,

    // Computed
    currentVideoUrl,
  };
}
