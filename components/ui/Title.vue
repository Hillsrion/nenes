<template>
  <h2
    ref="titleElement"
    class="font-medium text-primary lg:text-5xl/16 text-3xl/16 text-center origin-center"
  >
    {{ title }}
  </h2>
</template>

<script setup lang="ts">
import { ref } from "vue";

interface Props {
  title: string;
}

const props = defineProps<Props>();

const titleElement = ref<HTMLElement>();

defineExpose({
  titleElement,
});
</script>