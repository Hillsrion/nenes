# Nénés - Breast Cancer Awareness Website

A French breast cancer awareness website built with Nuxt 4, focusing on education, self-examination guidance, and essential resources for breast cancer awareness and prevention.

## ✨ Features

- **Interactive UI Components**: Canvas-based cursor tracking effects with floating animations
- **Responsive Design**: Mobile-first approach with smooth scroll animations
- **French Content**: Culturally appropriate health education content
- **Performance Optimized**: Hardware-accelerated animations and efficient rendering
- **Accessibility Focused**: Screen reader support and keyboard navigation

### 🎨 CursorImageSpawner Component

A high-performance canvas-based image particle system that creates floating animations following cursor movement with distance-based scaling.

**Key Features:**

- 60fps canvas rendering with mouse tracking
- Distance-based image scaling (closer = larger)
- Responsive grid system with parallax effects
- Smooth fade in/out animations

**Basic Usage:**

```vue
<template>
  <CursorImageSpawner :images="['/images/illustrations/1.svg']" />
</template>
```

**Props:**

- `images` (string[]): Array of image URLs (default: illustrations 1-8)
- `disabled` (boolean): Disable effect for mobile (default: false)
- `forceScale` (number): Scaling multiplier (default: 1)

## 🚀 Quick Start

### Installation

```bash
# pnpm (recommended)
pnpm install

# npm
npm install

# yarn
yarn install

# bun
bun install
```

### Development

```bash
# Start development server
pnpm dev
# Open http://localhost:3000
```

### Production

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## 📁 Project Structure

```
components/
├── sections/        # Full-height page sections with animations
├── ui/             # Reusable UI components
│   └── CursorImageSpawner.vue  # Interactive cursor effects
└── layout/         # Layout components

composables/        # Vue 3 composables for animations & utilities
assets/            # CSS, images, and static assets
public/            # Static files served directly
```

## 🎯 Key Components

### Section Components

- **LoadingSection**: Animated loading screen with progress
- **StatisticsSection**: Interactive statistics with floating animations
- **SelfExaminationSection**: Step-by-step self-examination guide
- **SymptomsSection**: Visual symptom awareness cards
- **ResourcesSection**: Contact information and resources

### Animation System

- Intersection Observer-based scroll triggers
- GSAP-powered animations with ScrollTrigger
- Lenis smooth scrolling integration
- Hardware-accelerated CSS transforms

### 🎯 Composables

#### useCanvas

A Vue composable for managing HTML5 Canvas elements with automatic resizing, device pixel ratio handling, and proper cleanup.

**Features:**

- Automatic canvas resizing with DPR (device pixel ratio) support
- Context management and cleanup
- Responsive to container size changes
- Memory leak prevention

**Basic Usage:**

```typescript
import { useCanvas } from "~/composables/useCanvas";

export function useMyCanvas(container: Ref<HTMLElement | null>) {
  const { canvas, context, dispose } = useCanvas(container, {
    autoResize: true,
    dpr: Math.min(window.devicePixelRatio, 2),
    onResize: () => {
      // Handle resize if needed
    },
  });

  onUnmounted(() => {
    dispose();
  });

  return {
    canvas,
    context,
    draw: (ctx: CanvasRenderingContext2D) => {
      // Your drawing logic here
    },
  };
}
```

**API:**

- `canvas` - The HTMLCanvasElement reference
- `context` - The 2D rendering context
- `dispose()` - Cleanup function for event listeners
- `init(canvasElement)` - Initialize with a canvas element
- `resize()` - Manually trigger resize

## 🛠️ Tech Stack

- **Framework**: Nuxt 4 with Vue 3 Composition API
- **Language**: TypeScript with strict typing
- **Styling**: Tailwind CSS v4
- **Animation**: GSAP with ScrollTrigger
- **Performance**: Canvas API for complex effects

## 📝 Content Guidelines

- **Language**: French throughout the application
- **Medical Accuracy**: Content reviewed for medical precision
- **Cultural Sensitivity**: Appropriate tone for health education
- **Accessibility**: WCAG compliant design patterns

Check out the [Nuxt deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.
