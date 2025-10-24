<template>
  <section class="relative z-20 -mt-[30svh]">
    <div
      class="bg-secondary-light py-16 rounded-t-4xl h-full w-full"
      ref="containerRef"
    >
      <RevealingSectionHeader
        :title="selfExaminationHeader"
        :parent-section="containerRef"
      />
      <ExaminationSteps :steps="steps" :parent-section="containerRef" />
    </div>
  </section>
</template>

<script setup>
import RevealingSectionHeader from "~/components/ui/RevealingSectionHeader.vue";
import ExaminationSteps from "~/components/ui/ExaminationSteps.vue";
import { useContent } from "~/composables/useContent";
import { ref } from "vue";

const { selfExaminationHeader } = useContent();

const { steps } = defineProps({
  steps: {
    type: Array,
    required: true,
  },
});

const containerRef = ref(null);
</script>
