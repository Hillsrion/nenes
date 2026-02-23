export function useIsIOS() {
  const isIOS = ref(false);

  onMounted(() => {
    const userAgent = navigator.userAgent || "";
    // Detect iPhone/iPad/iPod, and newer iPads reporting as Macintosh with touch
    isIOS.value =
      /iPhone|iPad|iPod/.test(userAgent) ||
      (userAgent.includes("Macintosh") && navigator.maxTouchPoints > 0);
  });

  return {
    isIOS,
  };
}
