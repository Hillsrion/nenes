import { ref } from "vue";
import { useIntersectionObserver } from "@vueuse/core";

export function useSectionVisibility(threshold = 0.1) {
  const sectionRef = ref<HTMLElement | null>(null);
  const isVisible = ref(false);

  // Use VueUse's intersection observer for better performance
  useIntersectionObserver(
    sectionRef,
    ([{ isIntersecting }]) => {
      isVisible.value = isIntersecting;
    },
    {
      threshold,
      rootMargin: "0px 0px -10% 0px", // Trigger slightly before fully visible
    }
  );

  return {
    sectionRef,
    isVisible,
  };
}
