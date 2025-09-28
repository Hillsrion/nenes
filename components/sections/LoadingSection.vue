<template>
  <section
    class="min-h-screen flex items-center justify-center relative transition-colors duration-1000"
    :class="
      isComplete
        ? 'bg-gradient-to-br from-nenes-blue-light to-nenes-blue-dark'
        : 'bg-gradient-to-br from-gray-50 to-gray-100'
    "
  >
    <div class="max-w-2xl w-full px-8 text-center">
      <Logo class="mb-16" />

      <div class="mb-12">
        <h1 class="text-2xl font-bold tracking-[0.2em] mb-8 text-gray-800">
          CHARGEMENT
        </h1>
        <div class="flex items-center justify-center gap-4 mb-12">
          <div class="w-48 h-1 bg-black/10 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-300"
              :class="
                isComplete
                  ? 'bg-gradient-to-r from-nenes-pink-accent to-nenes-pink-deep'
                  : 'bg-gradient-to-r from-nenes-pink-light to-nenes-pink-dark'
              "
              :style="{ width: `${progress}%` }"
            ></div>
          </div>
          <span class="text-xl font-semibold text-gray-800 min-w-[3rem]"
            >{{ progress }}%</span
          >
        </div>
      </div>

      <ScrollIndicator
        v-if="isComplete"
        text="scroll"
        class="opacity-0 animate-fade-in"
        style="animation-delay: 2s; animation-fill-mode: forwards"
      />
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from "vue";
import Logo from "~/components/ui/Logo.vue";
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";

const progress = ref(0);
const isComplete = ref(false);

onMounted(() => {
  // Simulate loading progress
  const interval = setInterval(() => {
    progress.value += Math.random() * 15;
    if (progress.value >= 100) {
      progress.value = 100;
      isComplete.value = true;
      clearInterval(interval);
    }
  }, 200);
});
</script>

<style scoped>
/* Component-specific styles only when necessary */
</style>
