<template>
  <p class="text-primary text-base lg:text-xl leading-normal mt-2">
    {{ content }}
  </p>
</template>

<script setup lang="ts">
defineProps({
  content: {
    type: String,
    required: true,
  },
});
</script>