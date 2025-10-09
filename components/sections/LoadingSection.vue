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
            <Transition name="image-fade" mode="out-in">
              <img
                :key="currentImageIndex"
                :src="currentImage.src"
                :alt="`Illustration ${currentImage.id}`"
                class="w-full h-full object-contain"
              />
            </Transition>
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

// Track if we're currently transitioning to prevent conflicts
let isTransitioning = false;

// Function to update image with non-linear timing
const updateImageSequence = (progressValue) => {
  // Don't update if we're currently transitioning
  if (isTransitioning) return;

  // Calculate which image to show (0-7 range for 8 images)
  // Use direct linear progression for now to ensure all images show
  const imageIndex = Math.min(Math.floor((progressValue / 100) * 8), 7);

  if (imageIndex !== currentImageIndex.value) {
    isTransitioning = true;
    currentImageIndex.value = imageIndex;

    // Allow transition to complete before allowing next update
    setTimeout(() => {
      isTransitioning = false;
    }, 100); // Slightly longer than CSS transition (80ms)
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
/* Image transition animations - Fast scale effect */
.image-fade-enter-active,
.image-fade-leave-active {
  transition: transform 0.08s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.image-fade-enter-from {
  transform: scale(0.85) translateZ(0);
}

.image-fade-leave-to {
  transform: scale(1.05) translateZ(0);
}

.image-fade-enter-to,
.image-fade-leave-from {
  transform: scale(1) translateZ(0);
}
</style>