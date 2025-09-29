// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: process.env.NODE_ENV === "development" },

  // Alias configuration for proper path resolution
  alias: {
    "~": process.cwd(),
    "@": process.cwd(),
  },

  // CSS configuration
  css: ["~/assets/css/main.css"],

  // Modules configuration
  modules: [
    "@hypernym/nuxt-gsap",
    "nuxt-split-type",
    "@nuxtjs/google-fonts",
    "@pinia/nuxt",
  ],

  // Google Fonts configuration
  googleFonts: {
    families: {
      "DM+Sans": [400, 500, 600, 700],
    },
    display: "swap",
    preload: true,
    useStylesheet: true,
  },

  // GSAP configuration
  gsap: {
    // GSAP will be available globally
    extraPlugins: {
      scrollTrigger: true,
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
