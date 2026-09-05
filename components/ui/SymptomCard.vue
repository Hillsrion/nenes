<template>
  <!-- Text-only card (no image) -->
  <li
    v-if="!hasImage"
    class="w-90 h-130 flex p-8 relative bg-secondary-light justify-center flex-col"
  >
    <h3 class="relative z-1 leading-title text-primary text-2xl">
      {{ title }}
    </h3>
    <CardContent v-if="description" :content="description" class="mt-2" />
  </li>

  <!-- Polaroid card (with image) -->
  <li v-else class="symptom-polaroid">
    <img
      :src="image"
      :alt="title"
      width="360"
      height="480"
      loading="lazy"
      class="block w-full aspect-[3/4] object-cover"
    />
    <div class="symptom-polaroid__caption">
      <h3 class="text-primary uppercase font-semibold tracking-title-sm text-xs leading-snug">
        {{ title }}
      </h3>
      <p
        v-if="subtitle"
        class="text-primary/70 font-serif text-base leading-tight mt-0.5"
      >
        {{ subtitle }}
      </p>
    </div>
  </li>
</template>

<script setup lang="ts">
import CardContent from "~/components/ui/CardContent.vue";

const { image } = defineProps({
  title: {
    type: String,
    required: true,
  },
  subtitle: {
    type: String,
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
</script>

<style scoped>
.symptom-polaroid {
  background: #fff;
  box-shadow: 0 18px 36px rgb(42 82 194 / 16%);
  padding: 0.7rem 0.7rem 0;
  width: 22.5rem;
}

.symptom-polaroid__caption {
  padding: 0.75rem 0.3rem 1.1rem;
  text-align: center;
}
</style>
