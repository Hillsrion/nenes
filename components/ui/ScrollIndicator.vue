<template>
  <div class="flex flex-col items-center gap-2 text-gray-700">
    <div class="text-base font-normal tracking-wider">{{ text }}</div>
    <div class="opacity-70">
      <svg class="w-[99px] h-8" viewBox="0 0 99 32" fill="none">
        <path
          d="M4.5 4.5L49.5 27.5L94.5 4.5"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      </svg>
    </div>
  </div>
</template>

<script setup>
defineProps({
  text: {
    type: String,
    default: "scroll",
  },
});
</script>

<style scoped>
/* Component-specific styles only when necessary */
</style>
