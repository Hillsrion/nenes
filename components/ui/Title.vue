<template>
  <h2
    ref="titleElement"
    class="font-medium text-primary lg:text-5xl xs:text-3xl text-2xl text-center origin-center leading-title"
  >
    {{ title }}
  </h2>
</template>

<script setup lang="ts">
interface Props {
  title: string;
}

const props = defineProps<Props>();

const titleElement = ref<HTMLElement>();

defineExpose({
  titleElement,
});
</script>
