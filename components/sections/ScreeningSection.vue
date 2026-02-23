<template>
  <div class="lg:h-[150svh] relative">
    <section
      class="flex h-screen items-center justify-center bg-white transition-all duration-300 ease-out sticky top-0 z-30"
      :class="{ 'rounded-t-4xl': !isAtTop }"
      ref="sectionRef"
    >
      <div
        class="container mx-auto px-4 flex flex-col lg:flex-row gap-8 xl:gap-12 origin-top h-[100svh] py-2 sm:py-14 lg:py-27"
        ref="containerRef"
      >
        <!-- Main content -->
        <div class="flex-1 lg:w-3/5">
          <div class="max-w-2xl">
            <p
              :ref="setTitleRef"
              class="text-primary font-medium text-2xl xs:text-3xl md:text-4xl lg:text-5xl leading-title mb-8"
            >
              {{ title }}
            </p>
          </div>
        </div>

        <!-- Sidebar elements -->
        <div ref="sidebarRef" class="flex flex-col lg:w-1/4 gap-8 lg:gap-16">
          <div
            v-for="(element, index) in sidebarElements"
            :key="index"
            class="group"
          >
            <div class="flex flex-col gap-4">
              <!-- Content -->
              <div class="flex flex-col gap-4">
                <h3
                  class="text-primary uppercase leading-title lg:text-base text-sm tracking-title-sm"
                >
                  {{ element.title }}
                </h3>
                <p class="text-primary text-base lg:text-xl leading-7.5">
                  {{ element.content }}
                </p>
                <div class="relative overflow-hidden mt-8">
                  <picture :ref="(el) => setLastImageRef(el, index)">
                    <!-- Mobile (<=767px) -->
                    <source
                      type="image/avif"
                      media="(max-width: 767px)"
                      :srcset="element.image.replace('.jpg', '_mobile.avif')"
                      sizes="100vw"
                    />
                    <source
                      type="image/webp"
                      media="(max-width: 767px)"
                      :srcset="element.image.replace('.jpg', '_mobile.webp')"
                      sizes="100vw"
                    />
                    <!-- Tablet (768-820px) - using regular -->
                    <source
                      type="image/avif"
                      media="(min-width: 768px) and (max-width: 820px)"
                      :srcset="element.image.replace('.jpg', '_regular.avif')"
                      sizes="100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 768px) and (max-width: 820px)"
                      :srcset="element.image.replace('.jpg', '_regular.webp')"
                      sizes="100vw"
                    />
                    <!-- Medium tablet (821-1024px) -->
                    <source
                      type="image/avif"
                      media="(min-width: 821px) and (max-width: 1024px)"
                      :srcset="element.image.replace('.jpg', '_tablet.avif')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 821px) and (max-width: 1024px)"
                      :srcset="element.image.replace('.jpg', '_tablet.webp')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <!-- Desktop (>1024px) - using regular -->
                    <source
                      type="image/avif"
                      media="(min-width: 1025px)"
                      :srcset="element.image.replace('.jpg', '_regular.avif')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <source
                      type="image/webp"
                      media="(min-width: 1025px)"
                      :srcset="element.image.replace('.jpg', '_regular.webp')"
                      sizes="(min-width: 1024px) 25vw, 100vw"
                    />
                    <img
                      :src="element.image.replace('.jpg', '_regular.webp')"
                      :alt="element.title"
                      loading="lazy"
                      class="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      width="312"
                      height="468"
                    />
                  </picture>
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
  </div>
</template>

<script setup lang="ts">
import type { ComponentPublicInstance } from "vue";
import { useAnimationsStore } from "../../stores";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { gsap } from "gsap";
import { useScreeningTitleAnimation } from "~/composables/screening/useScreeningTitleAnimation";
import { useScreeningSidebarAnimation } from "~/composables/screening/useScreeningSidebarAnimation";
import { useScreeningFadeOut } from "~/composables/screening/useScreeningFadeOut";
import { useScreeningWarmup } from "~/composables/screening/useScreeningWarmup";

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

const store = useAnimationsStore();
let logoScrollTrigger: ScrollTrigger | null = null;
let topScrollTrigger: ScrollTrigger | null = null;
let mm: gsap.MatchMedia | null = null;

const sectionRef = ref<HTMLElement | null>(null);
const sidebarRef = ref<HTMLElement | null>(null);
const containerRef = ref<HTMLElement | null>(null);
const titleRef = ref<HTMLElement | null>(null);
const lastImageRef = ref<HTMLImageElement | null>(null);

const isAtTop = ref(false);
const textRefs = ref<HTMLElement[]>([]);

const setTextRef = (
  el: Element | ComponentPublicInstance | null,
  index: number
) => {
  if (el && el instanceof HTMLElement) {
    textRefs.value[index] = el;
  }
};

const setLastImageRef = (el: Element | null, index: number) => {
  if (el instanceof HTMLElement && index === props.sidebarElements.length - 1) {
    lastImageRef.value = el.querySelector("img") as HTMLImageElement | null;
  }
};

const setTitleRef = (el: Element | ComponentPublicInstance | null) => {
  if (el) {
    titleRef.value = el as HTMLElement;
    setTextRef(el, 0);
  }
};

const { initializeTitleAnimation, cleanupTitleAnimation } =
  useScreeningTitleAnimation({
    sectionRef,
    textRefs,
  });

const { initializeSidebarAnimation, cleanupSidebarAnimation } =
  useScreeningSidebarAnimation({
    sidebarRef,
    sectionRef,
    titleRef,
    lastImageRef,
    containerRef,
  });

const { initializeFadeOutAnimation, cleanupFadeOutAnimation } =
  useScreeningFadeOut({
    containerRef,
    sidebarRef,
    sectionRef,
  });

const { setupScreeningPreloadObserver, cleanupWarmupObserver } =
  useScreeningWarmup({
    sectionRef,
  });

const initializeLogoColorChangeAnimation = () => {
  if (!sectionRef.value?.parentElement) {
    return;
  }

  logoScrollTrigger = ScrollTrigger.create({
    trigger: sectionRef.value.parentElement,
    start: "top top+100px",
    end: "bottom bottom",
    onEnter: () => {
      store.updateLogoColor(true);
    },
    onLeaveBack: () => {
      store.updateLogoColor(false);
    },
    onEnterBack: () => {
      store.updateLogoColor(true);
    },
  });
};

const initializeTopTracking = () => {
  if (!sectionRef.value) {
    return;
  }

  topScrollTrigger = ScrollTrigger.create({
    trigger: sectionRef.value,
    start: "top top",
    end: "bottom top",
    onEnter: () => {
      isAtTop.value = true;
    },
    onLeaveBack: () => {
      isAtTop.value = false;
    },
  });
};

watch(
  () => store.getSectionState("loading"),
  (loadingState) => {
    if (
      loadingState === "isComplete" &&
      sectionRef.value &&
      sectionRef.value.parentElement
    ) {
      nextTick(() => {
        setTimeout(() => {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Always initialize these animations (all screen sizes)
              initializeLogoColorChangeAnimation();
              initializeTitleAnimation();
              initializeTopTracking();

              mm = gsap.matchMedia();
              mm.add("(min-width: 1024px)", () => {
                initializeSidebarAnimation();
                initializeFadeOutAnimation();
              });
              ScrollTrigger.refresh();

              setupScreeningPreloadObserver();
            });
          });
        }, 50);
      });
    }
  }
);

onUnmounted(() => {
  mm?.revert();
  cleanupTitleAnimation();
  cleanupSidebarAnimation();
  cleanupFadeOutAnimation();
  cleanupWarmupObserver();
  logoScrollTrigger?.kill();
  topScrollTrigger?.kill();
});
</script>

<style scoped>
.selection-highlight {
  position: relative;
  display: inline-block;
}

.selection-highlight .selection-svg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: calc(100% + 30px);
  height: 160%;
  opacity: 0;
  pointer-events: none;
  z-index: 0;
  transition: opacity 0.6s ease 0.3s;
}

.selection-highlight.revealed .selection-svg {
  opacity: 1;
}

.selection-highlight .split-word {
  position: relative;
  z-index: 1;
}
</style>
