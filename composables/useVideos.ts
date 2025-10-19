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
}

export function useVideos(options: UseVideosOptions) {
  const { steps, currentStepIndex, videoRef, overlayRef, transitionCallback } =
    options;

  // State management
  const loadedVideos = ref<Set<string>>(new Set());
  const videoLoading = ref(false);
  const actualVideoUrl = ref("");
  const isTransitioning = ref(false);

  // Device detection
  const isMobileOrTablet = ref(false);

  // Initialize mobile/tablet detection and first video
  onMounted(() => {
    const checkDevice = () => {
      isMobileOrTablet.value = window.innerWidth <= 768;
    };

    checkDevice();
    console.log(
      "📱 Device detected - isMobileOrTablet:",
      isMobileOrTablet.value
    );
    window.addEventListener("resize", checkDevice);

    // Initialize the first video URL after device is checked
    const firstStep = steps[0];
    console.log("🎬 First step:", firstStep);
    if (firstStep) {
      const firstVideoUrl = isMobileOrTablet.value
        ? firstStep.mobileUrl || firstStep.desktopUrl || firstStep.videoUrl
        : firstStep.desktopUrl || firstStep.videoUrl;

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

    // Check for responsive URLs first
    if (currentStep.mobileUrl || currentStep.desktopUrl) {
      return isMobileOrTablet.value
        ? currentStep.mobileUrl
        : currentStep.desktopUrl;
    }

    // Fall back to legacy videoUrl for backward compatibility
    return currentStep.videoUrl || "";
  });

  // Video loading method
  const loadVideo = async (url: string): Promise<void> => {
    if (!url || loadedVideos.value.has(url)) return;

    return new Promise((resolve) => {
      const video = document.createElement("video");
      video.preload = "metadata";

      const onLoadedData = () => {
        loadedVideos.value.add(url);
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("error", onError);
        resolve();
      };

      const onError = () => {
        video.removeEventListener("loadeddata", onLoadedData);
        video.removeEventListener("error", onError);
        console.warn(`Failed to preload video: ${url}`);
        resolve();
      };

      video.addEventListener("loadeddata", onLoadedData);
      video.addEventListener("error", onError);

      // Set the appropriate source based on device type
      if (url.includes("mobile") || url.includes("desktop")) {
        video.src = url;
      } else {
        // For legacy video URLs, we need to set the source attribute directly
        video.src = url;
      }
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

      const url = isMobileOrTablet.value
        ? step.mobileUrl || step.desktopUrl || step.videoUrl
        : step.desktopUrl || step.videoUrl;

      return url ? loadVideo(url) : Promise.resolve();
    });

    await Promise.allSettled(preloadPromises);
  };

  // Video transition function
  const transitionToVideo = async () => {
    if (!overlayRef.value || !videoRef.value || !currentVideoUrl.value) return;

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
          ? firstStep.mobileUrl || firstStep.desktopUrl || firstStep.videoUrl
          : firstStep.desktopUrl || firstStep.videoUrl;

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
