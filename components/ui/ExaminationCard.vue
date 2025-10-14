<template>
  <div class="bg-secondary-light flex flex-col justify-center p-8 w-90">
    <p class="text-primary font-serif font-normal text-serif-size/7.5 mb-5">
      {{ Number(stepNumber) < 10 ? `0${stepNumber}` : stepNumber }}
    </p>
    <CardContent :content="description" />
  </div>
</template>

<script setup lang="ts">
import CardContent from "~/components/ui/CardContent.vue";

defineProps({
  stepNumber: {
    type: String,
    required: true,
  },
  description: {
    type: String,
    required: true,
  },
});
</script>