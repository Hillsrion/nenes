<template>
  <section
    ref="loadingSectionRef"
    class="min-h-screen w-full overflow-hidden bg-primary fixed inset-0 -z-10"
  >
    <!-- Blue background section -->
    <div
      ref="blueSectionRef"
      class="absolute inset-0 flex items-center justify-center"
    >
      <!-- Logo in blue section -->
      <div
        ref="logoBlueRef"
        class="absolute top-8 left-1/2 transform -translate-x-1/2"
      >
        <Logo
          color="var(--color-nenes-pink-light)"
          class="w-[113px] h-[32px]"
        />
      </div>

      <!-- Loading text and percentage -->
      <div class="flex items-center justify-between w-full max-w-4xl px-16">
        <!-- CHARGEMENT text -->
        <div
          ref="chargementTextRef"
          class="text-nenes-pink-light font-medium text-[24px] tracking-[3.84px] uppercase opacity-0"
        >
          CHARGEMENT
        </div>

        <!-- Percentage text -->
        <div
          ref="percentageTextRef"
          class="text-nenes-pink-light font-medium text-[24px] tracking-[3.84px] uppercase opacity-0 min-w-[80px] text-right"
        >
          {{ progress }}%
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { gsap } from "gsap";
import Logo from "~/components/ui/Logo.vue";
import { useAnimationsStore } from "~/stores";

const progress = ref(0);
const isComplete = ref(false);

// Store
const store = useAnimationsStore();

// Refs for GSAP animations
const loadingSectionRef = ref(null);
const blueSectionRef = ref(null);
const logoBlueRef = ref(null);
const chargementTextRef = ref(null);
const percentageTextRef = ref(null);

onMounted(() => {
  // Initial setup
  gsap.set([chargementTextRef.value, percentageTextRef.value], {
    opacity: 0,
  });

  // Start loading animation
  startLoadingSequence();

  // Start progress counter
  startProgressCounter();
});

const startLoadingSequence = () => {
  const tl = gsap.timeline();

  // Animate logo in blue section
  tl.to(
    chargementTextRef.value,
    {
      opacity: 1,
      duration: 0.8,
      ease: "power2.out",
    },
    "-=0.6"
  )
    // Animate percentage text fade in (starts after progress begins)
    .to(
      percentageTextRef.value,
      {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=2.5"
    )
};

const startProgressCounter = () => {
  const duration = 3000; // 3 seconds
  const steps = 60; // Update every 50ms
  const increment = 100 / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    progress.value = Math.round(currentStep * increment);
    if (currentStep >= steps) {
      progress.value = 100;
      store.updateSectionState("loading", "isComplete");
      clearInterval(interval);
    }
  }, duration / steps);
};
</script>

<style scoped>
/* Additional custom styles if needed */
.section-element {
  opacity: 0;
  transform: translateY(30px);
  transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.section-element.animate-in {
  opacity: 1;
  transform: translateY(0);
}
</style>