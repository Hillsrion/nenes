<template>
  <section class="flex items-center justify-center relative" ref="sectionRef">
    <div
      class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12"
    >
      <!-- Main content -->
      <div class="flex-1 lg:w-3/5">
        <div class="max-w-2xl">
          <p
            class="text-primary font-medium text-3xl md:text-4xl lg:text-5xl leading-[1.33] mb-8"
          >
            {{ title }}
          </p>
        </div>
      </div>

      <!-- Sidebar elements -->
      <div class="flex flex-col lg:w-1/4 gap-8 lg:gap-16">
        <div
          v-for="(element, index) in sidebarElements"
          :key="index"
          class="group"
        >
          <div class="flex flex-col gap-4">
            <!-- Content -->
            <div class="flex flex-col gap-4">
              <h3
                class="text-primary uppercase leading-[1.33] lg:text-base text-sm tracking-[.16rem]"
              >
                {{ element.title }}
              </h3>
              <p class="text-primary text-base lg:text-xl leading-7.5">
                {{ element.content }}
              </p>
              <div class="relative overflow-hidden mt-8">
                <img
                  :src="element.image"
                  :alt="element.title"
                  class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div
                  class="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
// Define the interface for sidebar elements
interface SidebarElement {
  title: string;
  content: string;
  image: string;
}

interface Props {
  sidebarElements: SidebarElement[];
  title?: string;
}

const props = withDefaults(defineProps<Props>(), {
  sidebarElements: () => [],
  title: () => "",
});
</script>
