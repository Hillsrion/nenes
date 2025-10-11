<template>
  <section class="flex items-center justify-center relative" ref="sectionRef">
    <div class="absolute -top-2 left-0 w-full h-16 bg-primary -z-1" />
    <div
      class="relative h-full w-full min-h-screen bg-white transition-all duration-300 ease-out place-content-center"
      :class="{ 'rounded-t-4xl': !isLoadingComplete }"
    >
      <Logo
        class="absolute top-8 left-1/2 transform -translate-x-1/2"
        :color="
          isCoverFullyVisible
            ? 'var(--color-secondary)'
            : 'var(--color-primary)'
        "
      />
      <div
        class="max-w-[42rem] w-full px-8 relative z-10 mx-auto flex flex-col items-center"
      >
        <div
          class="text-3xl lg:text-5xl leading-snug font-medium text-center text-primary relative"
        >
          <span
            class="inline-block transition-opacity duration-500 ease-out"
            :class="{ 'opacity-30': scrollProgress > 0.2 }"
          >
            Chaque année en France,
          </span>
          <span
            class="inline-block transition-opacity duration-500 ease-out"
            :class="{ 'opacity-30': scrollProgress > 0.5 }"
          >
            le cancer du sein touche
          </span>
          <span class="inline-block"> plus de 60000 femmes. </span>
        </div>
      </div>
    </div>
    <ScrollIndicator
      text="scroll"
      class="absolute bottom-10 left-1/2 -translate-x-1/2 text-primary"
    />
  </section>
</template>

<script setup>
import ScrollIndicator from "~/components/ui/ScrollIndicator.vue";
import Logo from "~/components/ui/Logo.vue";

const scrollProgress = ref(0);
</script>