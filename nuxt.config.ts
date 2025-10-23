// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  app: {
    head: {
      title: "Nénés",
      link: [
        {
          rel: "icon",
          type: "image/svg+xml",
          href: "/favicon/favicon.svg",
        },
        { rel: "icon", type: "image/png", href: "/favicon/favicon.png" },
      ],
      meta: [
        {
          name: "description",
          content: "Un projet pour la prévention du cancer du sein",
        },
        { property: "og:title", content: "Nénés" },
        {
          property: "og:description",
          content: "Un projet pour la prévention du cancer du sein",
        },
        { property: "og:image", content: "/images/og-image.jpg" },
        { property: "og:image:type", content: "image/jpeg" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: "/images/og-image.jpg" },
      ],
    },
  },
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
    "lenis/nuxt",
  ],

  typescript: {
    tsConfig: {
      compilerOptions: {
        resolveJsonModule: true,
      },
      include: ["imageSizes.d.ts"],
    },
  },

  // Google Fonts configuration
  googleFonts: {
    families: {
      "DM+Sans": [400, 500, 600, 700],
      "Dawning+of+a+New+Day": [400],
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
    autoImport: true,
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

  // Nitro configuration for prerendering and resource optimization
  nitro: {
    // Use netlify preset for proper asset deployment
    preset: "netlify",
    // Prerender configuration for better performance
    prerender: {
      // Preload critical assets that appear in the loading sequence
      routes: ["/"],
    },
    // Optimize resource loading
    experimental: {
      wasm: true,
    },
  },

  // Vite configuration for resource hints and optimization
  vite: {
    build: {
      rollupOptions: {
        output: {
          // Ensure assets are properly named and cached
          assetFileNames: (assetInfo) => {
            const info = assetInfo.name!.split(".");
            const ext = info[info.length - 1];
            if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext)) {
              return `_nuxt/images/[name]-[hash][extname]`;
            } else if (/css/i.test(ext)) {
              return `_nuxt/[name]-[hash][extname]`;
            } else if (/woff2?|ttf|eot|otf/i.test(ext)) {
              return `_nuxt/fonts/[name]-[hash][extname]`;
            }
            return `_nuxt/[name]-[hash][extname]`;
          },
        },
      },
    },
    // Optimize dependencies
    optimizeDeps: {
      include: ["gsap", "gsap/ScrollTrigger"],
    },
  },

  // Runtime configuration for asset optimization and Cloudflare Stream
  runtimeConfig: {
    public: {
      // Critical assets that should be preloaded
      criticalAssets: [
        "/images/illustrations/1.svg",
        "/images/illustrations/2.svg",
        "/images/illustrations/3.svg",
        "/images/illustrations/4.svg",
        "/images/illustrations/5.svg",
        "/images/illustrations/6.svg",
        "/images/illustrations/7.svg",
        "/images/illustrations/8.svg",
      ],
      // Cloudflare Stream configuration (if using Stream)
      cloudflareStream: {
        customerCode:
          process.env.NUXT_PUBLIC_CLOUDFLARE_STREAM_CUSTOMER_CODE || "",
        accountId: process.env.NUXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID || "",
      },
      // Cloudflare R2 configuration (if using R2 for video hosting)
      r2: {
        publicUrl: process.env.NUXT_PUBLIC_R2_PUBLIC_URL || "",
      },
    },
  },
});
