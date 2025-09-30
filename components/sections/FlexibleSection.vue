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

// GSAP ScrollTrigger for statistics section
let statisticsTrigger = null;

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
        onLeaveBack: () => {
          console.log("ScrollTrigger: onLeaveBack triggered");
          // Reset when scrolling back up
          resetStatisticsText();
        },
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
  const textSpans = sectionRef.value.querySelectorAll(".statistics-text span");
  $gsap.set(textSpans, { opacity: 1 });
};

// Fade out first two lines progressively
const fadeFirstTwoLines = (progress) => {
  const textSpans = sectionRef.value.querySelectorAll(".statistics-text span");
  const startFade = 0; // Start fading at 50%
  const fadeDuration = 0.15; // Fade over 30% of scroll progress

  // Only fade the first two lines
  textSpans.forEach((span, index) => {
    if (index < 2) {
      // First two lines only
      if (progress >= startFade) {
        const fadeProgress = Math.min(1, (progress - startFade) / fadeDuration);
        const opacity = Math.max(0.3, 1 - fadeProgress * 0.7); // Fade from 1 to 0.3
        $gsap.set(span, { opacity });
      } else {
        $gsap.set(span, { opacity: 1 });
      }
    } else {
      // Keep other lines at full opacity
      $gsap.set(span, { opacity: 1 });
    }
  });
};

// Reset statistics text to full opacity
const resetStatisticsText = () => {
  const textSpans = sectionRef.value.querySelectorAll(".statistics-text span");
  $gsap.set(textSpans, { opacity: 1 });
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
