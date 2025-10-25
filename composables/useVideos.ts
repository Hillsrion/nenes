import { ref, computed, onMounted, onUnmounted, watch, Ref } from "vue";

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

  // Initialize mobile/tablet detection and first video
  onMounted(() => {
    const checkDevice = () => {
      isMobileOrTablet.value = window.innerWidth <= 768;
      isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
    };

    checkDevice();
    console.log(
      "📱 Device detected - isMobileOrTablet:",
      isMobileOrTablet.value,
      "isIOS:",
      isIOS.value
    );
    window.addEventListener("resize", checkDevice);

    // Initialize the first video URL after device is checked
    const firstStep = steps[0];
    console.log("🎬 First step:", firstStep);
    if (firstStep) {
      const firstVideoUrl = isMobileOrTablet.value
        ? options.getVideoSource("mp4", "mobile") // Use the passed getVideoSource for mobile
        : options.getVideoSource(isIOS.value ? "mp4" : "webm", "1080p"); // Use the passed getVideoSource for desktop (default 1080p)

      console.log("🎥 First video URL:", firstVideoUrl);
      if (firstVideoUrl) {
        actualVideoUrl.value = firstVideoUrl;
        console.log("✅ Set actualVideoUrl to:", actualVideoUrl.value);
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
      ? options.getVideoSource(format, "mobile")
      : options.getVideoSource(format, "1080p");
  });

  // Video loading method
  const loadVideo = async (url: string): Promise<void> => {
    if (!url || loadedVideos.value.has(url)) {
      return Promise.resolve();
    }

    console.log(`[useVideos] 🔄 Attempting to load video: ${url}`);
    videoLoading.value = true;
    console.log(`[useVideos] ⏳ videoLoading: ${videoLoading.value}`);

    return new Promise((resolve, reject) => {
      const video = document.createElement("video");
      video.preload = "auto"; // Ensure full video data is preloaded
      video.playsInline = true; // Essential for iOS autoplay

      const onCanPlayThrough = () => {
        console.log(`[useVideos] 🎉 Video canplaythrough: ${url}`);
        loadedVideos.value.add(url);
        video.removeEventListener("canplaythrough", onCanPlayThrough);
        video.removeEventListener("error", onError);
        videoLoading.value = false; // Reset loading state
        console.log(`[useVideos] ✅ videoLoading: ${videoLoading.value}`);
        resolve();
      };

      const onError = (e: Event) => {
        console.error(`[useVideos] ❌ Video error loading ${url}:`, e);
        video.removeEventListener("canplaythrough", onCanPlayThrough);
        video.removeEventListener("error", onError);
        videoLoading.value = false; // Reset loading state on error
        console.log(
          `[useVideos] ✅ videoLoading (on error): ${videoLoading.value}`
        );
        reject(new Error(`Failed to load video: ${url}`));
      };

      video.addEventListener("canplaythrough", onCanPlayThrough);
      video.addEventListener("error", onError);

      // No need to check for "mobile" or "desktop" in url directly.
      // The getVideoSource function already handles the resolution and format.
      video.src = url;
      video.load(); // Explicitly trigger loading
    });
  };

  // Preload upcoming videos for better performance
  const preloadUpcomingVideos = async () => {
    const currentIndex = currentStepIndex.value;
    const upcomingIndices = [
      currentIndex + 1,
      currentIndex + 2,
      Math.max(0, currentIndex - 1),
    ].filter(
      (index) => index >= 0 && index < steps.length && index !== currentIndex
    );

    const preloadPromises = upcomingIndices.map((index) => {
      const step = steps[index];
      if (!step) return Promise.resolve();

      const format = isIOS.value ? "mp4" : "webm";
      const mobileVideoUrl = options.getVideoSource(format, "mobile");
      const desktopVideoUrl = options.getVideoSource(format, "1080p");

      const url = isMobileOrTablet.value ? mobileVideoUrl : desktopVideoUrl;

      return url ? loadVideo(url) : Promise.resolve();
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
    console.log("🔄 Starting transition to:", videoUrl);

    // Load the video if not already loaded
    if (!loadedVideos.value.has(videoUrl)) {
      videoLoading.value = true;
      await loadVideo(videoUrl);
      videoLoading.value = false;
    }

    // Call the transition callback BEFORE updating video URL
    // This allows the fade-in to happen before the video changes
    if (transitionCallback) {
      transitionCallback(videoUrl);
    }

    // Wait for fade-in to complete before updating video URL
    setTimeout(() => {
      actualVideoUrl.value = videoUrl;
      console.log("✅ Video URL updated to:", videoUrl);
    }, 300);

    // Reset transitioning flag after full transition completes
    setTimeout(() => {
      isTransitioning.value = false;
      console.log("✓ Transition complete, ready for next video");
    }, 800);

    // Preload upcoming videos after the current transition
    setTimeout(() => {
      preloadUpcomingVideos();
    }, 1000);
  };

  // Watch for video URL changes and trigger transition
  watch(currentVideoUrl, (newUrl, oldUrl) => {
    console.log("🎬 currentVideoUrl changed from:", oldUrl, "to:", newUrl);
    console.log("🔒 isTransitioning:", isTransitioning.value);
    if (newUrl !== oldUrl && !isTransitioning.value) {
      console.log("▶️ Triggering transition...");
      transitionToVideo();
    } else if (isTransitioning.value) {
      console.log("⏸️ Transition blocked - already transitioning");
    }
  });

  // Preload the first video when current step changes to 0
  watch(currentStepIndex, (newIndex) => {
    if (newIndex === 0) {
      const firstStep = steps[0];
      if (firstStep) {
        const firstVideoUrl = isMobileOrTablet.value
          ? options.getVideoSource("mp4", "mobile") // Use the passed getVideoSource for mobile
          : options.getVideoSource(isIOS.value ? "mp4" : "webm", "1080p"); // Use the passed getVideoSource for desktop (default 1080p)

        if (firstVideoUrl) {
          loadVideo(firstVideoUrl).then(() => {
            actualVideoUrl.value = firstVideoUrl;
          });
        }
      }
    }
  });

  return {
    // State
    loadedVideos,
    videoLoading,
    actualVideoUrl,
    isTransitioning,
    isMobileOrTablet,

    // Methods
    loadVideo,
    preloadUpcomingVideos,
    transitionToVideo,

    // Computed
    currentVideoUrl,
  };
}
