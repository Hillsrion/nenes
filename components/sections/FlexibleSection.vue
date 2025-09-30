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

// GSAP ScrollTriggers for statistics section
let fadeTrigger = null;
let positionTrigger = null;
let coverTrigger = null;

// Animation state
const firstTwoLinesFaded = ref(false);
const lastLineCentered = ref(false);

// Computed properties for statistics section
const isCoverFullyVisible = ref(false);

// Initialize ScrollTriggers on mount
onMounted(() => {
  console.log("Component mounted, checking conditions...");
  console.log("sectionRef available:", !!sectionRef.value);
  console.log("statisticsText length:", props.statisticsText.length);

  if (sectionRef.value && props.statisticsText.length > 0) {
    // Initialize all text to full opacity first
    initializeStatisticsText();

    // Create separate ScrollTriggers for each animation
    createFadeTrigger();
    createPositionTrigger();
    createCoverTrigger();

    console.log("ScrollTriggers created");
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

// Create separate ScrollTrigger for fading first two lines
const createFadeTrigger = () => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const firstTwoLines = Array.from(textSpans).slice(0, 2); // Only first two lines

  fadeTrigger = $gsap.to(firstTwoLines, {
    opacity: 0,
    duration: 1,
    ease: "none",
    scrollTrigger: {
      trigger: sectionRef.value,
      start: "top bottom", // Start immediately when scrolling begins
      end: "top 20%", // End when section is well into viewport
      scrub: 0.5, // Smooth scrubbing with slight delay
      onUpdate: (self) => {
        // Track fade state
        firstTwoLinesFaded.value = self.progress > 0.8;
      },
    },
  });
};

// Create separate ScrollTrigger for last line position
const createPositionTrigger = () => {
  if (!statisticsTextRef.value) return;

  const textSpans = statisticsTextRef.value.children;
  const lastSpan = textSpans[textSpans.length - 1];

  if (lastSpan) {
    // Calculate the center position dynamically
    const calculateCenterY = () => {
      if (!statisticsTextRef.value || !lastSpan) return 0;

      const parentHeight = statisticsTextRef.value.offsetHeight;
      const lineHeight = lastSpan.offsetHeight;
      const centerY = (parentHeight - lineHeight) / 2;

      return -centerY; // Negative because we're moving up
    };

    positionTrigger = $gsap.to(lastSpan, {
      y: calculateCenterY, // Animate to the calculated center position
      duration: 1,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top 20%", // Start right after fade animation
        end: "top 10%", // End shortly after
        scrub: 0.5, // Smooth scrubbing
        onUpdate: (self) => {
          const moveProgress = self.progress;
          lastLineCentered.value = moveProgress > 0.8;
        },
      },
    });
  }
};

// Create separate ScrollTrigger for cover visibility
const createCoverTrigger = () => {
  coverTrigger = $gsap.to(
    {},
    {
      duration: 1,
      ease: "none",
      scrollTrigger: {
        trigger: sectionRef.value,
        start: "top 10%", // Start right after position animation
        end: "bottom 80%", // End before section leaves viewport
        scrub: 0.3, // Faster scrubbing for visibility change
        onUpdate: (self) => {
          isCoverFullyVisible.value = self.progress > 0.2;
        },
      },
    }
  );
};

// Cleanup on unmount
onUnmounted(() => {
  if (fadeTrigger) {
    fadeTrigger.kill();
    fadeTrigger = null;
  }
  if (positionTrigger) {
    positionTrigger.kill();
    positionTrigger = null;
  }
  if (coverTrigger) {
    coverTrigger.kill();
    coverTrigger = null;
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
