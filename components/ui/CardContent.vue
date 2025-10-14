<template>
  <p class="text-primary text-base lg:text-xl leading-normal">
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