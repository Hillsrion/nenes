<template>
  <section class="py-16 h-[400svh] relative z-20 -mt-[25svh]">
    <div
      class="bg-secondary-light rounded-t-4xl h-full w-full"
      ref="containerRef"
    >
      <RevealingSectionHeader
        :title="selfExaminationHeader"
        :parent-section="containerRef"
      />
    </div>
  </section>
</template>

<script setup>
import RevealingSectionHeader from "~/components/ui/RevealingSectionHeader.vue";
import { useContent } from "~/composables/useContent";
import { ref } from "vue";

const { selfExaminationHeader } = useContent();

const containerRef = ref(null);
</script>
