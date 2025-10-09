# Nénés - Setup Guide & Technologies

This guide covers the setup and technologies used in the Nénés breast cancer awareness website.

## 🚀 Technologies Used

### Core Framework

- **Nuxt 3** - Full-stack Vue framework
- **Vue 3** - Progressive JavaScript framework with Composition API
- **TypeScript** - Type-safe JavaScript

### Styling & UI

- **Tailwind CSS 4** - Utility-first CSS framework with custom color palette
- **Custom Color System** - Colors extracted from Figma design
- **Glass Morphism** - Modern backdrop-filter effects
- **Gradient Backgrounds** - Section-specific gradients

### Animation & Interactions

- **GSAP (GreenSock Animation Platform)** - Professional animations
  - `@hypernym/nuxt-gsap` - Nuxt module for GSAP integration
  - ScrollTrigger plugin for scroll-based animations
  - TextPlugin for advanced text animations
- **Lenis** - Smooth scroll library
  - `lenis` - Modern smooth scroll implementation
  - Custom composable for Vue 3 integration
- **Intersection Observer** - Performance-optimized scroll animations

### Text Effects (Future Implementation)

- **Split Type** - `nuxt-split-type` - Text splitting animations
- **Custom text animations** - Character, word, and line splitting

## 📦 Installation

```bash
# Install dependencies
pnpm install

# Development server
pnpm dev

# Build for production
pnpm build
```

## 🎨 Tailwind CSS Configuration

### Custom Colors

The Tailwind CSS configuration uses `@theme` directive for custom colors extracted from the Figma design:

```css
@theme {
  --color-nenes-blue-light: #667eea;
  --color-nenes-blue-dark: #764ba2;
  --color-nenes-pink-light: #f093fb;
  --color-nenes-pink-medium: #ff9ff3;
  --color-nenes-pink-dark: #f5576c;
  --color-nenes-pink-accent: #ff6b9d;
  --color-nenes-pink-deep: #c44569;
  --color-nenes-pink-purple: #f368e0;
  --color-nenes-orange-light: #ffecd2;
  --color-nenes-orange-dark: #fcb69f;
  --color-nenes-sky-light: #a8edea;
  --color-nenes-sky-dark: #fed6e3;
  --color-nenes-yellow: #ffd93d;
  --color-nenes-purple: #764ba2;
}
```

### Utility Classes

- **Glass Morphism**: `bg-white/10 backdrop-blur-md border-2 border-white/30`
- **Gradient Text**: `bg-gradient-to-r from-nenes-pink-light to-nenes-pink-dark bg-clip-text text-transparent`
- **Section Backgrounds**: `bg-gradient-to-br from-nenes-blue-light to-nenes-blue-dark`
- **Animations**: `opacity-0 translate-y-8 transition-all duration-700 ease-out` with `:class` bindings

## ⚡ Animation System

### GSAP Integration

```javascript
// Available globally in components
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export default {
  mounted() {
    // Scroll-triggered animations
    ScrollTrigger.create({
      trigger: this.$el,
      start: "top center",
      onEnter: () => this.animateIn(),
    });
  },
};
```

### Lenis Smooth Scroll

- **Package**: `lenis/vue` for Vue 3 integration
- **Composable**: `useLenis()` from lenis/vue package
- **Duration**: 1.2s (configurable)
- **Smooth**: Hardware-accelerated scrolling
- **Global Access**: Integrated with VueLenis component

### Intersection Observer Animations

- **Threshold**: 0.2-0.3 for optimal performance
- **Staggered Timing**: Sequential element animations
- **Cubic Bezier Easing**: Smooth, natural motion

## 🏗️ Component Architecture

### Layout Components

- `MainLayout.vue` - Scrollable container with Lenis integration

### Section Components

- `LoadingSection.vue` - Progress-based loading animation
- `StatisticsSection.vue` - Statistics with floating elements
- `ContentSection.vue` - Flexible content with dynamic elements
- `SelfExaminationSection.vue` - Interactive step-by-step guide
- `SymptomsSection.vue` - Educational symptom cards
- `ResourcesSection.vue` - Contact information and footer

### UI Components

- `Logo.vue` - Brand logo (113x32px)
- `ScrollIndicator.vue` - Animated scroll prompt

## 🎯 Design System

### Typography

- **Font**: Inter (with system font fallbacks)
- **Scale**: 2xl to 6xl for headings
- **Line Height**: 1.5-1.6 for readability
- **Letter Spacing**: 0.05em for headings

### Spacing

- **Container**: max-w-6xl with px-8 padding
- **Sections**: min-h-screen with py-16
- **Gaps**: 4-8 spacing units
- **Grid**: Responsive columns with auto-fit

### Colors

- **Gradients**: Section-specific background gradients
- **Text**: White on colored backgrounds, gray-800 on light
- **Accents**: nenes-yellow for highlights, nenes-pink-\* for CTAs
- **Glass**: rgba(255,255,255,0.1) with backdrop-blur

## 🚀 Performance Optimizations

### Animations

- **Hardware Acceleration**: CSS transforms and opacity
- **Intersection Observer**: Lazy-loaded animations
- **RequestAnimationFrame**: Smooth 60fps animations
- **Staggered Timing**: Prevents animation overload

### Images

- **Glass Morphism**: CSS-only effects without images
- **SVG Icons**: Scalable vector graphics
- **Placeholder Elements**: Semantic structure

### Bundle Size

- **Tree Shaking**: Unused code elimination
- **Dynamic Imports**: Component lazy loading
- **GSAP Plugins**: Only load required plugins

## 🔧 Development Workflow

### Adding New Sections

1. Create component in `components/sections/`
2. Use pure Tailwind utility classes (no @apply with custom CSS)
3. Implement Intersection Observer animations with `:class` bindings
4. Add to `pages/index.vue`

### Custom Animations

1. Use `@keyframes` in `assets/css/main.css`
2. Apply with Tailwind animation utilities
3. Configure GSAP for complex animations

### Color Usage

1. Use `nenes-*` color classes for brand colors
2. Apply gradients with `section-gradient-*` classes
3. Use semantic color names (primary, gray, etc.)

## 📱 Responsive Design

### Breakpoints

- **Mobile**: Default (up to 768px)
- **Tablet**: 768px+
- **Desktop**: 1024px+

### Layout Adaptations

- **Grid Collapse**: Single column on mobile
- **Logo Positioning**: Static on mobile, absolute on desktop
- **Text Scaling**: Responsive font sizes
- **Spacing**: Adjusted padding and margins

## 🔮 Future Enhancements

### Text Split Animations

- **Character splitting** for dynamic text reveals
- **Word animations** for emphasis
- **Line splitting** for paragraph animations

### Advanced GSAP

- **Scroll-triggered pinning** for sticky sections
- **Parallax effects** for depth
- **Custom easings** for brand-specific motion

### Performance

- **Image optimization** with WebP/AVIF
- **Code splitting** for faster loading
- **Service worker** for offline functionality

## 🛠️ Troubleshooting

### Common Issues

1. **Tailwind classes not working**: Check content paths in `tailwind.config.js` and `@theme` configuration in `assets/css/main.css`
2. **GSAP not loading**: Verify module configuration in `nuxt.config.ts`
3. **Lenis not smooth**: Check composable setup and CSS conflicts with smooth scroll behavior
4. **Animations not triggering**: Verify Intersection Observer setup and `:class` bindings

### Debug Mode

- **DevTools**: GSAP DevTools for animation debugging
- **Vue DevTools**: Component state inspection
- **Network Tab**: Asset loading verification

This setup provides a robust foundation for creating smooth, performant animations with modern web technologies while maintaining excellent developer experience and code maintainability.
