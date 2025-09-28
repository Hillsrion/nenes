// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: true },

  // Alias configuration for proper path resolution
  alias: {
    "~": process.cwd(),
    "@": process.cwd(),
  },

  // CSS configuration
  css: ["~/assets/css/main.css"],

  // Modules configuration
  modules: ["@hypernym/nuxt-gsap", "nuxt3-lenis", "nuxt-split-type"],

  // GSAP configuration
  gsap: {
    // GSAP will be available globally
    extraPlugins: {
      ScrollTrigger: true,
      TextPlugin: true,
    },
  },

  // Lenis smooth scroll configuration
  lenis: {
    // Smooth scroll options
    duration: 1.2,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smooth: true,
  },

  // PostCSS configuration for Tailwind CSS
  postcss: {
    plugins: {
      "@tailwindcss/postcss": {},
      autoprefixer: {},
    },
  },

  // Build configuration
  build: {
    transpile: ["gsap"],
  },
});
