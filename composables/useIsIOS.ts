import { computed } from "vue";

export function useIsIOS() {
  const isIOS = computed(() => {
    return (
      navigator.userAgent.includes("iPhone") ||
      navigator.userAgent.includes("iPad")
    );
  });

  return {
    isIOS,
  };
}
