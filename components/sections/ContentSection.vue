<template>
  <section
    class="min-h-screen flex items-center py-16 relative"
    ref="sectionRef"
  >
    <div class="max-w-6xl w-full mx-auto px-8 relative">
      <Logo class="absolute top-8 left-1/2 -translate-x-1/2 z-10" />

      <div class="mt-24 grid grid-cols-3 gap-y-12 auto-rows-auto">
        <div
          v-for="(element, index) in contentElements"
          :key="index"
          :ref="(el) => setTextRef(el, index)"
          :class="[
            index % 2 === 0
              ? 'col-span-1 text-left'
              : 'col-start-2 col-span-2 text-right',
          ]"
        >
          <component :is="element.type" v-bind="element.props">
            {{ element.content }}
          </component>
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
</script>