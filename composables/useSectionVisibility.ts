import { ref } from "vue";
import { useIntersectionObserver } from "@vueuse/core";

export function useSectionVisibility(threshold = 0.2) {
  const sectionRef = ref<HTMLElement | null>(null);
  const isVisible = ref(false);

  const { stop } = useIntersectionObserver(
    sectionRef,
    ([{ isIntersecting }]) => {
      isVisible.value = isIntersecting;
    },
    {
      threshold,
    }
  );

  return {
    sectionRef,
    isVisible,
    stop,
  };
}
