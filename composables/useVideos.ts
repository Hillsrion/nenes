import { nextTick, type Ref } from "vue";

type VideoTransitionPhase = "cover" | "reveal";

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
  transitionCallback?: (phase: VideoTransitionPhase) => Promise<void> | void;
  getVideoSource: (
    stepIndex: number,
    format: "mp4" | "webm",
    resolution: "desktop" | "mobile"
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

  let transitionVersion = 0;
  let disposed = false;

  const waitForVideoElementReady = (
    video: HTMLVideoElement,
    url: string
  ): Promise<void> => {
    const requestedUrl = new URL(url, window.location.href).href;
    const isRequestedVideoReady = () =>
      video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
      video.currentSrc === requestedUrl;

    if (isRequestedVideoReady()) return Promise.resolve();

    return new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        video.removeEventListener("loadeddata", onReady);
        video.removeEventListener("canplay", onReady);
        video.removeEventListener("error", finish);
        window.clearTimeout(timeoutId);
        resolve();
      };
      const onReady = () => {
        if (isRequestedVideoReady()) finish();
      };
      const timeoutId = window.setTimeout(finish, 3000);

      video.addEventListener("loadeddata", onReady);
      video.addEventListener("canplay", onReady);
      video.addEventListener("error", finish);
      onReady();
    });
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
        : options.getVideoSource(0, isIOS.value ? "mp4" : "webm", "desktop");

      if (firstVideoUrl) {
        actualVideoUrl.value = firstVideoUrl;
        loadVideo(firstVideoUrl).catch(() => { videoLoading.value = false; });
      }
    }
  });

  // Cleanup
  onUnmounted(() => {
    disposed = true;
    transitionVersion++;
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
      : options.getVideoSource(currentStepIndex.value, format, "desktop");
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
        : options.getVideoSource(index, format, "desktop");

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
      disposed
    )
      return;

    const videoUrl = currentVideoUrl.value;
    const version = ++transitionVersion;

    if (actualVideoUrl.value === videoUrl) {
      // A quick reverse step can return to the visible clip while another
      // transition is covering it; cancel that transition and uncover it.
      if (isTransitioning.value) {
        await transitionCallback?.("reveal");
        if (version === transitionVersion && !disposed) {
          isTransitioning.value = false;
        }
      }
      return;
    }

    // Set the initial source directly; only subsequent steps need a transition.
    if (!actualVideoUrl.value) {
      actualVideoUrl.value = videoUrl;
      return;
    }

    isTransitioning.value = true;

    // Fully cover the current video before changing its source.
    await transitionCallback?.("cover");

    if (version !== transitionVersion || disposed) return;

    // Load the video if not already loaded (this will happen while the overlay is opaque)
    if (!loadedVideos.value.has(videoUrl)) {
      videoLoading.value = true;
      try { await loadVideo(videoUrl); } catch { /* The visible video can retry the source. */ }
      videoLoading.value = false;
    }

    if (version !== transitionVersion || disposed) return;

    actualVideoUrl.value = videoUrl;
    await nextTick();

    const video = videoRef.value;
    if (video) {
      await waitForVideoElementReady(video, videoUrl);
      if (version !== transitionVersion || disposed) return;
      void video.play().catch(() => {});
    }

    // Reveal only after the new source is ready on the visible video element.
    await transitionCallback?.("reveal");
    if (version === transitionVersion && !disposed) {
      isTransitioning.value = false;
    }
  };

  // A newer scroll step supersedes an in-flight load, including reverse scroll.
  watch(currentStepIndex, () => { preloadUpcomingVideos(); });
  watch(currentVideoUrl, (newUrl, oldUrl) => {
    if (newUrl !== oldUrl) transitionToVideo();
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
