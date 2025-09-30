<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Statistics Section -->
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1" />
    <div
      class="relative h-[300svh] w-full min-h-screen bg-white transition-all duration-300 ease-out rounded-t-4xl"
      ref="whiteSectionRef"
      :class="{ 'rounded-t-4xl': !isLoadingComplete }"
    >
      <Logo
        class="fixed top-8 left-1/2 transform -translate-x-1/2"
        :color="
          isCoverFullyVisible
            ? 'var(--color-nenes-pink-light)'
            : 'var(--color-primary)'
        "
      />
      <div
        class="max-w-[42rem] h-[100svh] w-full px-8 sticky top-0 left-1/2 transform -translate-x-1/2 z-10 mx-auto flex flex-col justify-center"
      >
        <div
          ref="statisticsTextRef"
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative statistics-text"
        >
          <span
            v-for="(line, index) in statisticsText"
            :key="index"
            class="inline-block"
          >
            {{ line }}
          </span>
        </div>
      </div>

      <!-- Main Content Section (appears after statistics) -->
      <div class="max-w-6xl w-full mx-auto px-8 relative mt-32">
        <div class="mt-24">
          <div class="flex flex-col gap-8">
            <div
              v-for="(element, index) in contentElements"
              :key="index"
              class="opacity-0 translate-y-8 transition-all duration-700 ease-out"
              :class="{
                'opacity-100 translate-y-0 animate-slide-up': isVisible,
              }"
              :style="{ animationDelay: `${index * 0.2}s` }"
            >
              <component :is="element.type" v-bind="element.props">
                {{ element.content }}
              </component>
            </div>
          </div>
        </div>
      </div>
    </div>

    <ScrollIndicator
      text="scroll"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary"
    />
  </section>
</template>

<script setup>
import Logo from "~/components/ui/Logo.vue";
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";
import { onMounted, onUnmounted } from "vue";
// Use global GSAP instance (should be available through Nuxt GSAP module)
const { $gsap } = useNuxtApp();

const props = defineProps({
  backgroundGradient: {
    type: String,
    default: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  },

  // Statistics props
  statisticsText: {
    type: Array,
    default: () => [],
  },
  isLoadingComplete: {
    type: Boolean,
    default: false,
  },

  // Content props
  contentElements: {
    type: Array,
    default: () => [],
  },
});

const { sectionRef, isVisible } = useSectionVisibility(0.2);
const whiteSectionRef = ref(null);
const statisticsTextRef = ref(null);

// GSAP ScrollTrigger for statistics section
let statisticsTrigger = null;

// Animation state
const firstTwoLinesFaded = ref(false);
const lastLineCentered = ref(false);

// Computed properties for statistics section
const isCoverFullyVisible = ref(false);

// Initialize ScrollTrigger on mount
onMounted(() => {
  console.log("Component mounted, checking conditions...");
  console.log("sectionRef available:", !!sectionRef.value);
  console.log("statisticsText length:", props.statisticsText.length);

  if (sectionRef.value && props.statisticsText.length > 0) {
    // Initialize all text to full opacity first
    initializeStatisticsText();

    // Create ScrollTrigger for statistics text fade effect
    statisticsTrigger = $gsap.to(sectionRef.value, {
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top bottom", // Start shortly after scrolling begins
        end: "bottom bottom", // End before section leaves viewport
        markers: true,
        scrub: true, // Smooth scrubbing
        onUpdate: (self) => {
          console.log("ScrollTrigger progress:", self.progress);
          // Update based on scroll progress
          updateStatisticsOpacity(self.progress);
        },
      },
    });

    console.log("ScrollTrigger created:", !!statisticsTrigger);
  } else {
    console.log("Conditions not met for ScrollTrigger creation");
  }
});

// Initialize statistics text to full opacity
const initializeStatisticsText = () => {
  if (statisticsTextRef.value) {
    const textSpans = statisticsTextRef.value.children;
    $gsap.set(textSpans, { opacity: 1 });
  }
};

// Fade out first two lines progressively
const fadeFirstTwoLines = (progress) => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const startFade = 0;
  const fadeDuration = 0.15;
  const totalLines = textSpans.length;

  // Update last line position based on progress
  updateLastLinePosition(progress);

  // Only fade the first two lines
  Array.from(textSpans).forEach((span, index) => {
    if (index < 2) {
      // First two lines only
      if (progress >= startFade) {
        const fadeProgress = Math.min(1, (progress - startFade) / fadeDuration);
        const opacity = Math.max(0, 1 - fadeProgress); // Fade from 1 to 0
        $gsap.set(span, { opacity });

        // Track fade state for other animations
        if (fadeProgress >= 1) {
          firstTwoLinesFaded.value = true;
        } else if (fadeProgress < 0.5) {
          firstTwoLinesFaded.value = false;
        }
      } else {
        $gsap.set(span, { opacity: 1 });
        firstTwoLinesFaded.value = false;
      }
    } else if (index === totalLines - 1) {
      // Last line - position already handled by updateLastLinePosition
      // Keep at full opacity
      $gsap.set(span, { opacity: 1 });
    } else {
      // Keep other lines at full opacity
      $gsap.set(span, { opacity: 1 });
    }
  });
};

// Update last line position based on scroll progress
const updateLastLinePosition = (progress) => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const lastSpan = textSpans[textSpans.length - 1];

  if (lastSpan) {
    // Calculate Y position based on progress after fade is complete
    const startMoveProgress = 0.15; // Start moving after fade is complete
    const moveDuration = 0.15; // Move over 30% of progress

    if (progress >= startMoveProgress) {
      const moveProgress = Math.min(
        1,
        (progress - startMoveProgress) / moveDuration
      );
      const yOffset = -40 * moveProgress; // Move up to -40px

      $gsap.set(lastSpan, { y: yOffset });
      lastLineCentered.value = true;
    } else {
      // Keep at original position before movement starts
      $gsap.set(lastSpan, { y: 0 });
      lastLineCentered.value = false;
    }
  }
};

// Reset last line position (called when needed)
const resetLastLinePosition = () => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const lastSpan = textSpans[textSpans.length - 1];

  if (lastSpan) {
    // Reset centered state
    lastLineCentered.value = false;

    // Set last line back to original position immediately
    $gsap.set(lastSpan, { y: 0 });
  }
};

// Reset statistics text to full opacity and animation state
const resetStatisticsText = () => {
  if (statisticsTextRef.value) {
    const textSpans = statisticsTextRef.value.children;

    // Reset all text to full opacity
    $gsap.set(textSpans, { opacity: 1 });

    // Reset animation state
    firstTwoLinesFaded.value = false;
    lastLineCentered.value = false;
  }
};

// Update statistics opacity based on scroll progress
const updateStatisticsOpacity = (progress) => {
  fadeFirstTwoLines(progress);

  // Update cover visibility
  isCoverFullyVisible.value = progress > 0.5;
};

// Cleanup on unmount
onUnmounted(() => {
  if (statisticsTrigger) {
    statisticsTrigger.kill();
    statisticsTrigger = null;
  }
});
</script>

<style scoped>
@media (max-width: 768px) {
  .grid {
    @apply grid-cols-1 gap-8;
  }

  .absolute {
    @apply static transform-none mb-8;
  }

  .mx-auto {
    @apply mt-8;
  }
}
</style>
