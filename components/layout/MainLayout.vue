<template>
  <div class="w-full h-screen relative">
    <div
      ref="scrollContainer"
      class="w-full h-full overflow-y-auto"
      @scroll="handleScroll"
    >
      <slot />
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const scrollContainer = ref(null);
let ticking = false;

const handleScroll = () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      const scrollY = scrollContainer.value?.scrollTop || 0;
      // Emit scroll position for child components to use
      // This will be used for scroll-triggered animations
      ticking = false;
    });
    ticking = true;
  }
};

onMounted(() => {
  // Set up scroll container height
  if (scrollContainer.value) {
    scrollContainer.value.style.height = "100vh";
    scrollContainer.value.style.overflowY = "auto";
  }
});
</script>

<style scoped>
/* Component-specific styles only when necessary */
</style>
