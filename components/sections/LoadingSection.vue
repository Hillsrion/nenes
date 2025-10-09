<template>
  <section
    ref="loadingSectionRef"
    class="min-h-screen w-full overflow-hidden bg-primary fixed inset-0 -z-10"
  >
    <!-- Blue background section -->
    <div
      ref="blueSectionRef"
      class="absolute inset-0 flex items-center justify-center flex-col gap-8"
    >
      <!-- Logo in blue section -->
      <div ref="logoBlueRef" class="absolute top-8 left-1/2 -translate-x-1/2">
        <Logo color="var(--color-nenes-pink-light)" class="w-[113px] h-8" />
      </div>

      <!-- Absolutely positioned CHARGEMENT text to the left -->
      <div
        class="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 sm:block hidden"
      >
        <div
          ref="chargementTextRef"
          class="text-nenes-pink-light font-medium lg:text-2xl text-xl tracking-[3.84px] uppercase opacity-0 lg:-translate-x-72 md:-translate-x-60 -translate-x-50"
        >
          CHARGEMENT
        </div>
      </div>

      <!-- Absolutely positioned image in center -->
      <div
        class="sm:absolute left-1/2 top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div
          ref="imageContainerRef"
          class="relative lg:size-36 md:size-30 sm:size-28 size-36 opacity-0"
        >
          <img
            ref="currentImageRef"
            :src="currentImage.src"
            :alt="`Illustration ${currentImage.id}`"
            class="w-full h-full object-contain"
          />
        </div>
      </div>

      <!-- Absolutely positioned percentage text to the right -->
      <div
        class="sm:absolute left-1/2 top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2"
      >
        <div
          ref="percentageTextRef"
          class="text-nenes-pink-light font-medium lg:text-2xl text-xl tracking-[3.84px] uppercase opacity-0 min-w-[80px] text-right lg:translate-x-72 md:translate-x-60 sm:translate-x-50"
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

// Master timeline for coordinated loading sequence
let masterTimeline = null;

const startLoadingSequence = () => {
  // Create master timeline for the entire loading sequence
  masterTimeline = gsap.timeline();

  // Add initial image setup
  masterTimeline.set(currentImageRef.value, {
    scale: 1,
    opacity: 1,
  });

  // Set all elements to visible immediately (no opacity animations)
  masterTimeline.set(
    [chargementTextRef.value, imageContainerRef.value, percentageTextRef.value],
    {
      opacity: 1,
    }
  );

  // Start the progress counter immediately
  masterTimeline.add(startProgressCounter());
};

// Function to update image with GSAP bounce animation (2 turns through 8 images)
const updateImageSequence = (progressValue) => {
  // Calculate which image to show for 2 full cycles through 8 images
  const cyclePosition = Math.floor((progressValue / 100) * 16); // 0-15 range for 16 steps
  const imageIndex = cyclePosition % 8; // Modulo 8 gives us 2 full cycles: 0-7, 0-7

  if (imageIndex !== currentImageIndex.value && currentImageRef.value) {
    const previousIndex = currentImageIndex.value;
    currentImageIndex.value = imageIndex;

    // Update image source immediately
    currentImageRef.value.src = currentImage.value.src;
    currentImageRef.value.alt = `Illustration ${currentImage.value.id}`;

    // Create bounce animation with GSAP
    const bounceTl = gsap.timeline();

    // Bounce out and in simultaneously
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
        0 // Start at the same time
      );
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

  // Start the coordinated loading sequence
  startLoadingSequence();
});

const startProgressCounter = () => {
  const duration = 2500; // 2.5 seconds total

  // Use GSAP to animate progress from 0 to 100
  return gsap.to(
    { progress: 0 },
    {
      progress: 100,
      duration: duration / 1000, // Convert to seconds
      ease: "none", // Linear progression
      onUpdate: function () {
        // Update progress value
        progress.value = Math.round(this.targets()[0].progress);

        // Update image sequence based on progression
        updateImageSequence(progress.value);
      },
      onComplete: function () {
        progress.value = 100;
        store.updateSectionState("loading", "isAnimating");
      },
    }
  );
};
</script>

<style scoped>
/* GSAP handles all animations now */
</style>