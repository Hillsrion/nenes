<template>
  <section class="min-h-screen flex items-center relative" ref="sectionRef">
    <!-- Statistics Section -->
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1" />
    <div
      class="relative h-full w-full min-h-screen bg-white transition-all duration-300 ease-out rounded-t-4xl"
      :class="{ 'rounded-t-4xl': !isLoadingComplete }"
    >
      <Logo
        class="absolute top-8 left-1/2 transform -translate-x-1/2"
        :color="
          isCoverFullyVisible
            ? 'var(--color-nenes-pink-light)'
            : 'var(--color-primary)'
        "
      />
      <div
        class="max-w-[42rem] w-full px-8 absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10 mx-auto flex flex-col items-center"
      >
        <div
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative"
        >
          <span
            v-for="(line, index) in statisticsText"
            :key="index"
            class="inline-block transition-opacity duration-500 ease-out"
            :class="{ 'opacity-30': scrollProgress > (index + 1) * 0.3 }"
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

// Scroll progress for statistics section
const scrollProgress = ref(0);

const { y } = useScroll(window);

watch(y, (newY) => {
  const windowHeight = window.innerHeight;
  const documentHeight = document.documentElement.scrollHeight;
  const maxScroll = documentHeight - windowHeight;
  scrollProgress.value = Math.min(newY / maxScroll, 1);
});

// Computed properties for statistics section
const isCoverFullyVisible = computed(() => {
  return scrollProgress.value > 0.5;
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
