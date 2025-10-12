<template>
  <div class="bg-secondary-light flex flex-col justify-center p-8">
    <p class="text-primary font-normal text-[2rem]/7.5 mb-5">
      {{ stepNumber }}
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