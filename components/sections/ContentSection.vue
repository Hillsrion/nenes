<template>
  <section
    class="min-h-screen flex items-center py-16 relative"
    :class="getBackgroundGradient"
    ref="sectionRef"
  >
    <div class="max-w-6xl w-full mx-auto px-8 relative">
      <Logo class="absolute top-8 left-1/2 -translate-x-1/2 z-10" />

      <div
        class="mt-24"
        :class="
          hasSidebar
            ? 'grid grid-cols-1 lg:grid-cols-3 gap-16'
            : 'grid grid-cols-1'
        "
      >
        <div class="flex flex-col gap-8">
          <div
            v-for="(element, index) in contentElements"
            :key="index"
            class="opacity-0 translate-y-8 transition-all duration-700 ease-out"
            :class="{ 'opacity-100 translate-y-0 animate-slide-up': isVisible }"
            :style="{ animationDelay: `${index * 0.2}s` }"
          >
            <component :is="element.type" v-bind="element.props">
              {{ element.content }}
            </component>
          </div>
        </div>

        <div class="flex flex-col gap-8" v-if="hasSidebar">
          <div
            v-for="(sidebarElement, index) in sidebarElements"
            :key="`sidebar-${index}`"
            class="opacity-0 translate-x-8 transition-all duration-700 ease-out"
            :class="{
              'opacity-100 translate-x-0 animate-slide-in-right': isVisible,
            }"
            :style="{
              animationDelay: `${(index + contentElements.length) * 0.2}s`,
            }"
          >
            <component :is="sidebarElement.type" v-bind="sidebarElement.props">
              {{ sidebarElement.content }}
            </component>
          </div>
        </div>
      </div>

      <ScrollIndicator
        v-if="showScrollIndicator"
        text="scroll"
        class="absolute bottom-8 left-1/2 -translate-x-1/2"
      />
    </div>
  </section>
</template>

<script setup>
import Logo from "~/components/ui/Logo.vue";
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import { useSectionVisibility } from "~/composables/useSectionVisibility";

const props = defineProps({
  contentElements: {
    type: Array,
    default: () => [],
  },
  sidebarElements: {
    type: Array,
    default: () => [],
  },
  hasSidebar: {
    type: Boolean,
    default: false,
  },
  showScrollIndicator: {
    type: Boolean,
    default: true,
  },
  backgroundGradient: {
    type: String,
    default: "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)",
  },
});

const { sectionRef, isVisible } = useSectionVisibility(0.2);

const getBackgroundGradient = computed(() => {
  const gradientMap = {
    "linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)": "bg-gray-50",
    "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)":
      "bg-gradient-to-br from-nenes-pink-light to-nenes-pink-dark",
    "linear-gradient(135deg, #667eea 0%, #764ba2 100%)":
      "bg-gradient-to-br from-nenes-blue-light to-nenes-blue-dark",
    "linear-gradient(135deg, #ff9ff3 0%, #f368e0 100%)":
      "bg-gradient-to-br from-nenes-pink-medium to-nenes-pink-purple",
    "linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)":
      "bg-gradient-to-br from-nenes-orange-light to-nenes-orange-dark",
    "linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)":
      "bg-gradient-to-br from-nenes-sky-light to-nenes-sky-dark",
  };
  return gradientMap[props.backgroundGradient] || "bg-gray-50";
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
