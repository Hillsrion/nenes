<template>
  <section class="py-16 h-[400svh] relative z-20 -mt-[25svh]" ref="sectionRef">
    <div class="bg-secondary-light rounded-t-4xl h-full w-full">
      <RevealingSectionHeader :title="selfExaminationHeader" />
    </div>
  </section>
</template>

<script setup>
import RevealingSectionHeader from "~/components/ui/RevealingSectionHeader.vue";
import { useContent } from "~/composables/useContent";

const { selfExaminationHeader } = useContent();
</script>
