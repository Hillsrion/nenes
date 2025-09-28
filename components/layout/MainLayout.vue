<template>
  <div class="w-full h-screen relative">
    <div
      ref="scrollContainer"
      class="w-full h-full overflow-y-auto"
      data-lenis-prevent
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useLenis } from "@/composables/useLenis";

const scrollContainer = ref(null);
const { lenis, scrollTo } = useLenis();

const handleScroll = () => {
  // Lenis handles the smooth scrolling, so we don't need manual scroll handling
  // But we can still emit scroll events for GSAP ScrollTrigger if needed
  const scrollY = scrollContainer.value?.scrollTop || 0;
  // Emit scroll position for child components to use
  // This will be used for scroll-triggered animations
};

onMounted(() => {
  // Set up scroll container height
  if (scrollContainer.value) {
    scrollContainer.value.style.height = "100vh";
    scrollContainer.value.style.overflowY = "auto";
  }

  // Expose scrollTo function globally for programmatic scrolling
  if (process.client) {
    window.scrollTo = scrollTo;
  }
});

// Expose scrollTo function for programmatic scrolling from child components
defineExpose({
  scrollTo,
});
</script>

<style scoped>
/* Component-specific styles only when necessary */
</style>
