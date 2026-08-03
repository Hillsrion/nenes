<template>
  <div ref="globalContainer">
    <VueLenis root />

    <MainLayout ref="mainLayoutRef">
      <!-- Loading Section -->
      <LoadingSection v-show="!isLoadingComplete" />
      <div
        class="transition-transform duration-1000 ease-out"
        :class="{
          'translate-y-[100vh]':
            store.sections.loading?.state === 'idle' && !isLoadingComplete,
        }"
      >
        <Logo
          class="fixed top-8 left-1/2 -translate-x-1/2 z-150"
          :color="logoColor"
        />

        <!-- Unified Statistics and Content Section -->
        <EntrySection
          :statistics-text="statisticsText"
          :content-elements="mainContentElements"
        />
        <ScreeningSection
          :sidebar-elements="screeningContentElements"
          :title="screeningMainTitle"
        />
        <SymptomsSection :title="symptomsMainTitle" :cards="symptomsCards" />

        <BustSection />

        <SelfExaminationSection :steps="selfExaminationSteps" />

        <!-- Resources Section -->
        <ResourcesSection />
        <CursorImageSpawner :images="cursorImages" :disabled="isThreeDPreview" />
      </div>
    </MainLayout>
  </div>

  <ClientOnly>
    <div
      v-if="isThreeDPreview"
      class="fixed inset-0 z-[10000] overflow-hidden bg-[#fff5f8] text-primary"
    >
      <header
        class="absolute inset-x-0 top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-primary/10 bg-white/90 px-5 py-4 backdrop-blur md:px-8"
      >
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.2em] text-[#f472b6]">
            Test local · forme seule
          </p>
          <h1 class="text-lg font-bold md:text-xl">Reconstruction 3D depuis une photo</h1>
        </div>
        <div class="flex items-center gap-4 text-xs font-medium text-secondary md:text-sm">
          <span>115 110 sommets · 4,0 Mo · 40,5 s</span>
          <a
            href="/"
            class="rounded-full border border-primary/15 bg-white px-4 py-2 text-primary transition hover:border-primary/30"
          >
            Retour au site
          </a>
        </div>
      </header>

      <main class="h-full pt-20 md:pt-16">
        <ThreeBustViewer
          model-url="/models/bust-photo-test.glb"
          :auto-rotate="false"
          :enable-zoom="true"
        />
      </main>

      <div
        class="pointer-events-none absolute bottom-5 left-1/2 z-20 -translate-x-1/2 rounded-full border border-primary/10 bg-white/90 px-4 py-2 text-center text-xs font-medium text-primary shadow-sm backdrop-blur"
      >
        Glisser pour tourner · molette ou pincement pour zoomer
      </div>
    </div>
  </ClientOnly>
</template>

<script setup lang="ts">
import MainLayout from "~/components/layout/MainLayout.vue";
import LoadingSection from "~/components/sections/LoadingSection.vue";
import EntrySection from "~/components/sections/EntrySection.vue";
import ScreeningSection from "~/components/sections/ScreeningSection.vue";
import SelfExaminationSection from "~/components/sections/SelfExaminationSection.vue";
import SymptomsSection from "~/components/sections/SymptomsSection.vue";
import BustSection from "~/components/sections/BustSection.vue";
import ResourcesSection from "~/components/sections/ResourcesSection.vue";
import Logo from "~/components/ui/Logo.vue";
import CursorImageSpawner from "~/components/ui/CursorImageSpawner.vue";
import ThreeBustViewer from "~/components/ui/ThreeBustViewer.vue";
import { useAnimationsStore } from "~/stores";
import { useContent } from "~/composables/useContent";
import { useLenis } from "lenis/vue";

// Store
const store = useAnimationsStore();
const route = useRoute();
const isThreeDPreview = computed(() => route.query.preview3d === "photo");

// Lenis instance for scroll control
const lenis = useLenis();

// Content data from hook
const {
  mainContentElements,
  statisticsText,
  screeningContentElements,
  screeningMainTitle,
  symptomsMainTitle,
  symptomsCards,
  selfExaminationSteps,
  cursorImages,
} = useContent();

// Reactive state for loading completion
const isLoadingComplete = computed(
  () => store.sections.loading?.state === "isComplete"
);

// Prevent scroll during loading using useHead with Tailwind classes on both html and body
useHead({
  htmlAttrs: {
    class: computed(() =>
      !isThreeDPreview.value && !isLoadingComplete.value ? "overflow-hidden h-screen" : ""
    ),
  },
  bodyAttrs: {
    class: computed(() =>
      !isThreeDPreview.value && !isLoadingComplete.value ? "overflow-hidden" : ""
    ),
  },
  link: [
    // Preload critical illustrations that appear in loading sequence
    { rel: "preload", href: "/images/illustrations/1.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/2.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/3.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/4.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/5.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/6.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/7.svg", as: "image" },
    { rel: "preload", href: "/images/illustrations/8.svg", as: "image" },
    // DNS prefetch for external resources
    { rel: "dns-prefetch", href: "//fonts.googleapis.com" },
    { rel: "dns-prefetch", href: "//fonts.gstatic.com" },
  ],
});

const globalContainer = ref(null);
const mainLayoutRef = ref(null); // Ref to MainLayout component

// Computed logo color based on store state
const logoColor = computed(() => {
  return store.getLogoState ? "var(--color-primary)" : "var(--color-secondary)";
});

// Watch for loading completion
watch(
  () => store.sections.loading?.state,
  (newState) => {
    if (newState === "isAnimating") {
      setTimeout(() => {
        store.updateSectionState("loading", "isComplete");
      }, 1000);
    }
  },
  { immediate: true }
);

// Watch loading state and control Lenis scrolling
watch(
  () => store.sections.loading?.state,
  (newState) => {
    if (!lenis.value) return;

    if (newState === "isComplete") {
      // Re-enable scrolling after loading is complete
      lenis.value.start();
    }
  },
  { immediate: true }
);

onMounted(async () => {
  if (isThreeDPreview.value) return;

  scrollTo(0, 0);
  lenis.value.stop();
  // Matomo tracking code
  const config = useRuntimeConfig();
  const matomoUrl = config.public.matomoUrl;
  const siteId = config.public.siteId;

  if (process.client && matomoUrl && siteId) {
    var _paq = (window._paq = window._paq || []);
    _paq.push(["trackPageView"]);
    _paq.push(["enableLinkTracking"]);
    (function () {
      var u = matomoUrl + "/";
      _paq.push(["setTrackerUrl", u + "matomo.php"]);
      _paq.push(["setSiteId", siteId]);
      var d = document,
        g = d.createElement("script"),
        s = d.getElementsByTagName("script")[0];
      g.type = "text/javascript";
      g.async = true;
      g.src = u + "matomo.js";
      s.parentNode.insertBefore(g, s);
    })();
  }
});
</script>
