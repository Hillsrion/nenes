<script setup lang="ts">
import CardContent from "./CardContent.vue";

interface Props {
  stepNumber: string;
  description: string;
}

defineProps<Props>();
</script>

<script lang="ts">
import type { DefineComponent } from "vue";

const ExaminationCard: DefineComponent<{}, {}, any> = {
  name: "ExaminationCard",
};

export default ExaminationCard;
</script>

<template>
  <div class="bg-secondary-light flex flex-col justify-center p-8 w-90">
    <p class="text-primary font-serif font-normal text-serif-size/7.5 mb-5">
      {{ Number(stepNumber) < 10 ? `0${stepNumber}` : stepNumber }}
    </p>
    <CardContent :content="description" />
  </div>
</template>