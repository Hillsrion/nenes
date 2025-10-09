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

        <!-- Image sequence container -->
        <div class="flex items-center justify-center flex-1 mx-8">
          <div ref="imageContainerRef" class="relative w-36 h-36 opacity-0">
            <img
              ref="currentImageRef"
              :src="currentImage.src"
              :alt="`Illustration ${currentImage.id}`"
              class="w-full h-full object-contain"
            />
          </div>
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
const imageContainerRef = ref(null);
const currentImageRef = ref(null);

// Image sequence state
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

// Computed property for current image
const currentImage = computed(
  () => imageSequence.value[currentImageIndex.value]
);

// Function to update image with GSAP bounce animation (2 turns through 8 images)
const updateImageSequence = (progressValue) => {
  // Calculate which image to show for 2 full cycles through 8 images
  // Progress 0-100% maps to 0-15 (16 positions), then mod 8 gives us 2 cycles
  const cyclePosition = Math.floor((progressValue / 100) * 16); // 0-15 range for 16 steps
  const imageIndex = cyclePosition % 8; // Modulo 8 gives us 2 full cycles: 0-7, 0-7

  if (imageIndex !== currentImageIndex.value && currentImageRef.value) {
    const previousIndex = currentImageIndex.value;
    currentImageIndex.value = imageIndex;

    // Create bounce animation with GSAP
    const tl = gsap.timeline();

    // Bounce out the current image and bounce in the new one simultaneously
    if (previousIndex !== imageIndex) {
      // Update image source immediately
      currentImageRef.value.src = currentImage.value.src;
      currentImageRef.value.alt = `Illustration ${currentImage.value.id}`;

      // Bounce out the old image while bouncing in the new one
      tl.to(currentImageRef.value, {
        scale: 1.2,
        duration: 0.3,
        ease: "power3.in",
      })
        // Immediately bounce in the new image
        .to(
          currentImageRef.value,
          {
            scale: 1,
            duration: 0.4,
            ease: "power3.out",
          },
          0 // Start at the same time as the bounce out
        );
    }
  }
};

onMounted(() => {
  // Initial setup
  gsap.set(
    [chargementTextRef.value, percentageTextRef.value, imageContainerRef.value],
    {
      opacity: 0,
    }
  );

  // Set initial image state
  if (currentImageRef.value) {
    gsap.set(currentImageRef.value, {
      scale: 1,
      opacity: 1,
    });
  }

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
    // Animate image container fade in
    .to(
      imageContainerRef.value,
      {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=0.6"
    )
    // Initial image is already visible, no need to animate it
    // Animate percentage text fade in (starts after progress begins)
    .to(
      percentageTextRef.value,
      {
        opacity: 1,
        duration: 0.8,
        ease: "power2.out",
      },
      "-=2.5"
    );
};

const startProgressCounter = () => {
  const duration = 2500; // 2.5 seconds - faster but still shows all images
  const steps = 25; // Enough steps to show all 8 images
  const increment = 100 / steps;
  let currentStep = 0;

  const interval = setInterval(() => {
    currentStep++;
    progress.value = Math.round(currentStep * increment);

    // Update image sequence based on progression
    updateImageSequence(progress.value);

    if (currentStep >= steps) {
      progress.value = 100;
      // store.updateSectionState("loading", "isAnimating");
      clearInterval(interval);
    }
  }, duration / steps);
};
</script>

<style scoped>
/* GSAP handles all animations now */
</style>