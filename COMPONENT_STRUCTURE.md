# Nénés - Component Structure Documentation

This document outlines the component structure for the Nénés breast cancer awareness website built with Nuxt.js and Vue 3.

## 🏗️ Architecture Overview

The website follows a modular component architecture with:

- **Layout Components**: Handle overall page structure and scrolling behavior
- **Section Components**: Individual content sections with their own animations and logic
- **UI Components**: Reusable components used across sections
- **Pages**: Main page that orchestrates all sections

## 📁 Component Structure

```
components/
├── layout/
│   └── MainLayout.vue          # Main scrollable layout container
├── sections/
│   ├── LoadingSection.vue      # Loading screen with progress indicator
│   ├── StatisticsSection.vue   # Statistics display with floating images
│   ├── ContentSection.vue      # Flexible content section with animations
│   ├── SelfExaminationSection.vue # Step-by-step self-examination guide
│   ├── SymptomsSection.vue     # Symptoms awareness cards
│   └── ResourcesSection.vue    # Resources and contact information
└── ui/
    ├── Logo.vue               # Brand logo component
    └── ScrollIndicator.vue    # Animated scroll indicator
```

## 🎯 Component Details

### Layout Components

#### MainLayout.vue

- **Purpose**: Provides the main scrollable container for the entire page
- **Features**:
  - Full viewport height scrolling
  - Smooth scroll behavior
  - Scroll event handling for animations
- **Usage**: Wraps all page content

### Section Components

#### LoadingSection.vue

- **Purpose**: Animated loading screen with progress indicator
- **Features**:
  - Progress bar animation (0-100%)
  - Background color transition on completion
  - Scroll indicator appears when complete
- **State**: `isComplete` - tracks loading completion

#### StatisticsSection.vue

- **Purpose**: Display key statistics about breast cancer
- **Features**:
  - Animated floating image elements
  - Intersection Observer for scroll-triggered animations
  - Responsive grid layout
- **Content**: "Chaque année en France, le cancer du sein touche plus de 60000 femmes"

#### ContentSection.vue

- **Purpose**: Flexible content section for various text content
- **Features**:
  - Dynamic content elements array
  - Scroll-triggered animations with staggered timing
  - Optional sidebar layout
  - Customizable background gradients
- **Props**:
  - `contentElements`: Array of content objects with type, props, and content
  - `sidebarElements`: Optional sidebar content
  - `hasSidebar`: Boolean for sidebar layout
  - `backgroundGradient`: CSS gradient string

#### SelfExaminationSection.vue

- **Purpose**: Interactive step-by-step self-examination guide
- **Features**:
  - 5-step timeline with auto-advancing active state
  - Visual guide images
  - Pink gradient background
  - Responsive layout
- **Steps**: Visual inspection, circular palpation, underarm area, nipple check, repeat on other breast

#### SymptomsSection.vue

- **Purpose**: Educational content about breast cancer symptoms
- **Features**:
  - 4 symptom cards with staggered animations
  - Orange gradient background
  - Visual placeholder for main image
- **Symptoms**: Visual observation, skin changes, lumps, nipple changes

#### ResourcesSection.vue

- **Purpose**: Essential resources and contact information
- **Features**:
  - 4 resource cards with contact details
  - Blue-pink gradient background
  - Footer with copyright and credits
- **Resources**: Cancer Info hotline, Ruban Rose, Ligue contre le cancer, Santé publique France

### UI Components

#### Logo.vue

- **Purpose**: Consistent brand logo across all sections
- **Features**: Fixed dimensions (113x32px)
- **Usage**: Appears in the top center of most sections

#### ScrollIndicator.vue

- **Purpose**: Animated scroll prompt
- **Features**:
  - Bouncing arrow animation
  - Customizable text
  - Positioned at bottom center of sections
- **Props**: `text` (default: "scroll")

## 🎨 Design System

### Colors

- **Primary Gradient**: Various gradients per section (blue-purple, pink, orange, etc.)
- **Text**: White on colored backgrounds, dark gray on light backgrounds
- **Accent**: Pink/magenta for highlights and CTAs

### Typography

- **Font Family**: Inter, system fonts
- **Headings**: Bold, large (2-3rem)
- **Body Text**: Regular weight, good line height (1.5-1.6)
- **Accent Text**: Highlighted statistics and important information

### Animations

- **Scroll-triggered**: Intersection Observer for performance
- **Staggered**: Sequential animations with delays
- **Smooth**: CSS cubic-bezier easing functions
- **Loading**: Progress-based animations

### Layout

- **Responsive**: Mobile-first design with breakpoints at 768px
- **Full Height**: Each section takes full viewport height
- **Centered**: Max-width containers with horizontal centering
- **Grid/Flexbox**: Modern CSS layout techniques

## 🔧 Usage Examples

### Basic Section with Content

```vue
<ContentSection
  :content-elements="[
    {
      type: 'h2',
      props: { class: 'custom-title' },
      content: 'Your content here',
    },
  ]"
  background-gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
/>
```

### Section with Sidebar

```vue
<ContentSection
  :content-elements="mainContent"
  :sidebar-elements="sidebarContent"
  :has-sidebar="true"
  background-gradient="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)"
/>
```

### Custom Animation Timing

```vue
<div class="custom-element" :style="{ animationDelay: '0.5s' }">
  Content with delayed animation
</div>
```

## 🚀 Extending the Structure

### Adding New Sections

1. Create a new component in `components/sections/`
2. Follow the pattern of existing sections:
   - Use `ref` for Intersection Observer
   - Implement scroll-triggered animations
   - Include responsive design
   - Add appropriate gradient backgrounds
3. Import and use in `pages/index.vue`

### Modifying Animations

1. Adjust `animationDelay` in template styles
2. Modify `cubic-bezier` easing functions for different effects
3. Change `transition` durations for faster/slower animations

### Custom Content Elements

1. Extend the `contentElements` array structure in `ContentSection.vue`
2. Add new element types (beyond `h1`, `h2`, `p`)
3. Pass custom props for styling and behavior

## 📱 Responsive Considerations

- All components include mobile-first responsive design
- Breakpoints at 768px for tablet/mobile layouts
- Grid layouts collapse to single column on mobile
- Text sizes and spacing adjust appropriately
- Touch-friendly interactive elements

## 🎯 Performance Notes

- Intersection Observer used instead of scroll events for better performance
- RequestAnimationFrame for smooth animations
- CSS transforms for hardware-accelerated animations
- Optimized for 60fps scroll performance

This structure provides a solid foundation for the Nénés website while maintaining flexibility for future enhancements and content updates.
