<template>
  <div
    v-if="isVisible"
    class="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex flex-col items-center gap-2 text-white"
  >
    <div class="text-lg font-normal tracking-wider font-serif opacity-80">
      {{ text }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";
import { useLenis } from "~/composables/useLenis";

const props = defineProps({
  text: {
    type: String,
    default: "Faites défiler",
  },
  scrollThreshold: {
    type: Number,
    default: 0.3, // 30% scroll threshold
  },
});

const isVisible = ref(true);
const { lenis } = useLenis();

const checkScrollPosition = () => {
  // Get the ContentSection element
  const contentSection = document.querySelector("[data-content-section]");
  if (!contentSection) return;

  const rect = contentSection.getBoundingClientRect();
  const windowHeight = window.innerHeight;

  // Calculate if we've scrolled past the threshold of the ContentSection
  const scrolledPercentage = Math.abs(rect.top) / (rect.height - windowHeight);

  // Show indicator if we haven't scrolled past the threshold of the section
  isVisible.value = scrolledPercentage < props.scrollThreshold;
};

onMounted(() => {
  if (lenis.value) {
    // Use Lenis scroll event instead of native scroll event
    lenis.value.on("scroll", ({ scroll, progress }) => {
      // Use requestAnimationFrame for smooth updates
      requestAnimationFrame(checkScrollPosition);
    });
  }

  // Initial check
  checkScrollPosition();
});

onUnmounted(() => {
  // Lenis cleanup is handled by the useLenis composable
});
</script>