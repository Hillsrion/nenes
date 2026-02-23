<template>
  <div class="relative w-full h-full">
    <img
      ref="currentImageRef"
      :src="currentImage.src"
      :alt="`Illustration ${currentImage.id}`"
      class="w-full h-full object-contain"
    />
  </div>
</template>

<script setup lang="ts">
import { gsap } from "gsap";

interface Props {
  progress: number;
}

const props = defineProps<Props>();

const currentImageRef = ref<HTMLImageElement | null>(null);
const currentImageIndex = ref(0);
const imageSequence = ref([
  { id: 1, src: "/images/illustrations/1.svg" },
  { id: 2, src: "/images/illustrations/2.svg" },
  { id: 3, src: "/images/illustrations/3.svg" },
  { id: 4, src: "/images/illustrations/4.svg" },
  { id: 5, src: "/images/illustrations/5.svg" },
  { id: 6, src: "/images/illustrations/6.svg" },
  { id: 7, src: "/images/illustrations/7.svg" },
  { id: 8, src: "/images/illustrations/8.svg" },
]);

const currentImage = computed(
  () => imageSequence.value[currentImageIndex.value]
);

const updateImageSequence = (progressValue: number) => {
  const cyclePosition = Math.floor((progressValue / 100) * 16);
  const imageIndex = cyclePosition % 8;

  if (imageIndex !== currentImageIndex.value && currentImageRef.value) {
    currentImageIndex.value = imageIndex;
    currentImageRef.value.src = currentImage.value.src;
    currentImageRef.value.alt = `Illustration ${currentImage.value.id}`;

    const bounceTl = gsap.timeline();
    bounceTl
      .to(currentImageRef.value, {
        scale: 1.2,
        duration: 0.3,
        ease: "power4.in",
      })
      .to(
        currentImageRef.value,
        {
          scale: 1,
          duration: 0.4,
          ease: "power4.out",
        },
        0
      );
  }
};

watch(
  () => props.progress,
  (newProgress) => {
    updateImageSequence(newProgress);
  }
);

onMounted(() => {
  gsap.set(currentImageRef.value, {
    scale: 1,
    opacity: 1,
  });
});
</script>

<style scoped>
/* Add any specific styles for the animator here if needed */
</style>
