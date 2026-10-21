<template>
  <!-- Text-only card (no image) -->
  <li
    v-if="!hasImage"
    class="w-full min-h-80 flex p-6 relative bg-secondary-light justify-center flex-col sm:p-8"
  >
    <h3 class="relative z-1 leading-title text-primary text-2xl">
      {{ title }}
    </h3>
    <CardContent v-if="description" :content="description" class="mt-2" />
  </li>

  <!-- Polaroid card (with image) -->
  <li v-else class="symptom-polaroid">
    <div class="symptom-polaroid__photo">
      <img
        :src="image"
        :alt="title"
        width="960"
        height="1280"
        loading="lazy"
        class="block w-full h-full object-cover"
      />
      <img
        v-if="illustration"
        :src="illustration"
        alt=""
        aria-hidden="true"
        width="720"
        height="960"
        loading="lazy"
        class="symptom-polaroid__illustration"
      />
    </div>
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
  illustration: {
    type: String,
    default: "",
  },
});

const hasImage = computed(() => !!image);
</script>

<style scoped>
.symptom-polaroid {
  background: #fff;
  box-shadow: 0 18px 36px rgb(42 82 194 / 16%);
  padding: 0.7rem 0.7rem 0;
  width: 100%;
}

.symptom-polaroid__caption {
  padding: 0.75rem 0.3rem 1.1rem;
  text-align: center;
}

.symptom-polaroid__photo {
  position: relative;
  aspect-ratio: 3 / 4;
  overflow: hidden;
}

.symptom-polaroid__illustration {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  filter: drop-shadow(0 1px 1px rgb(128 48 76 / 24%));
}
</style>
