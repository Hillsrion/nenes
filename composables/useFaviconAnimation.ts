export const useFaviconAnimation = () => {
  const currentFaviconIndex = ref(0);
  const animationInterval = ref<NodeJS.Timeout | null>(null);
  const isAnimating = ref(false);

  // Favicon animation settings - much gentler than loading animation
  const FRAME_DURATION = 2000; // 2 seconds per frame (gentle pace)

  // Array of favicon URLs (using PNG illustrations as favicons)
  const faviconUrls = [
    "/images/illustrations/1.png",
    "/images/illustrations/2.png",
    "/images/illustrations/3.png",
    "/images/illustrations/4.png",
    "/images/illustrations/5.png",
    "/images/illustrations/6.png",
    "/images/illustrations/7.png",
    "/images/illustrations/8.png",
  ];

  // Update the favicon URL in the document
  const updateFavicon = () => {
    const faviconLink = document.querySelector(
      'link[rel="icon"]'
    ) as HTMLLinkElement;
    if (faviconLink) {
      faviconLink.href = faviconUrls[currentFaviconIndex.value];
    }
  };

  // Start gentle favicon animation
  const startAnimation = () => {
    if (isAnimating.value) return;

    isAnimating.value = true;

    animationInterval.value = setInterval(() => {
      // Move to next favicon (gentle cycle through all 8)
      currentFaviconIndex.value =
        (currentFaviconIndex.value + 1) % faviconUrls.length;

      // Update favicon URL
      updateFavicon();
    }, FRAME_DURATION);
  };

  // Stop favicon animation
  const stopAnimation = () => {
    if (animationInterval.value) {
      clearInterval(animationInterval.value);
      animationInterval.value = null;
    }
    isAnimating.value = false;
  };

  // Initialize everything
  const init = async () => {
    // Set initial favicon
    updateFavicon();

    // Start gentle animation
    startAnimation();
  };

  // Cleanup on unmount
  onUnmounted(() => {
    stopAnimation();
  });

  return {
    init,
    startAnimation,
    stopAnimation,
    isAnimating,
    currentFaviconIndex,
  };
};
