<template>
  <li class="w-90 h-130 flex p-8 relative" :class="classes">
    <h3 class="relative z-1 leading-title" :class="titleClasses">
      {{ title }}
    </h3>
    <CardContent v-if="description" :content="description" class="mt-2" />
    <img
      v-if="hasImage"
      :src="image"
      :alt="title"
      width="360"
      height="520"
      loading="lazy"
      class="size-full object-contain absolute inset-0"
    />
  </li>
</template>

<script setup lang="ts">
import CardContent from "~/components/ui/CardContent.vue";
import { computed } from "vue";

const { image } = defineProps({
  title: {
    type: String,
    required: true,
  },
  description: {
    type: String,
  },
  image: {
    type: String,
    required: true,
  },
});

const hasImage = computed(() => !!image);

const classes = computed(() => {
  return {
    "bg-secondary-light justify-center flex-col": !hasImage.value,
    "items-end": hasImage.value,
  };
});

const titleClasses = computed(() => {
  return {
    "text-primary text-2xl": !hasImage.value,
    "text-secondary uppercase font-semibold tracking-title-sm text-shadow-title text-base":
      hasImage.value,
  };
});
</script>