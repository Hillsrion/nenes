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
  modules: ["@hypernym/nuxt-gsap", "nuxt-split-type"],

  // GSAP configuration
  gsap: {
    // GSAP will be available globally
    extraPlugins: {
      scrollTrigger: true,
      textPlugin: true,
    },
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
