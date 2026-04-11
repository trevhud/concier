# Concier Design System

## Overview

This design system is inspired by Aman's luxury hospitality aesthetic, emphasizing elegance, minimalism, and sophisticated user experiences. The system uses Tailwind CSS with custom configurations to create a cohesive, premium interface.

## Color Palette

### Primary Colors - Aman Stone
Our primary color palette uses warm, sophisticated stone tones:

```css
aman-stone-50:  #fafaf9  /* Lightest background */
aman-stone-100: #f5f5f4  /* Light background */
aman-stone-200: #e7e5e4  /* Borders, subtle elements */
aman-stone-300: #d6d3d1  /* Disabled states */
aman-stone-400: #a8a29e  /* Placeholder text */
aman-stone-500: #78716c  /* Secondary text */
aman-stone-600: #57534e  /* Primary text */
aman-stone-700: #44403c  /* Headings */
aman-stone-800: #292524  /* Dark text */
aman-stone-900: #1c1917  /* Darkest text */
```

### Accent Colors - Aman Gold
Used sparingly for highlights, focus states, and special interactive elements. **Note**: Gold should be reserved for accents only, not primary UI elements, to maintain elegance and ensure proper contrast:

```css
aman-gold-50:  #fffbeb  /* Light gold backgrounds */
aman-gold-100: #fef3c7  /* Subtle highlights */
aman-gold-200: #fde68a  /* Hover states */
aman-gold-300: #fcd34d  /* Active states */
aman-gold-400: #fbbf24  /* Focus rings */
aman-gold-500: #f59e0b  /* Primary gold */
aman-gold-600: #d97706  /* Hover gold */
aman-gold-700: #b45309  /* Pressed gold */
aman-gold-800: #92400e  /* Dark gold */
aman-gold-900: #78350f  /* Darkest gold */
```

## Typography

### Font Families

**Primary Font - Inter**
- Usage: Body text, UI elements, forms
- Weights: 300 (light), 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Purpose: Clean, modern readability

**Display Font - Playfair Display**
- Usage: Headings, titles, luxury emphasis
- Weights: 400 (regular), 500 (medium), 600 (semibold), 700 (bold)
- Purpose: Elegant, sophisticated hierarchy

### Typography Scale

```css
/* Headings */
text-5xl    /* 48px - Main page title */
text-4xl    /* 36px - Section headers */
text-3xl    /* 30px - Subsection headers */
text-2xl    /* 24px - Card titles */
text-xl     /* 20px - Large text */

/* Body Text */
text-lg     /* 18px - Large body text */
text-base   /* 16px - Default body text */
text-sm     /* 14px - Small text, captions */
text-xs     /* 12px - Fine print, labels */
```

### Typography Usage Guidelines

- **Headings**: Use `font-serif` (Playfair Display) with `font-light` or `font-normal`
- **Body Text**: Use `font-sans` (Inter) with appropriate weights
- **UI Elements**: Always use Inter for consistency
- **Color**: Primary text uses `text-aman-stone-800`, secondary uses `text-aman-stone-600`

## Component Patterns

### Chat Interface

**Container Structure**
```jsx
<div className="max-w-4xl mx-auto animate-slide-up">
  <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-aman-stone-200">
    {/* Content */}
  </div>
</div>
```

**Message Bubbles**
```jsx
/* User Messages - Elegant dark stone for sophistication */
className="bg-aman-stone-700 text-white rounded-2xl rounded-br-md px-4 py-3"

/* Bot Messages - Light stone for contrast */
className="bg-aman-stone-100 text-aman-stone-800 rounded-2xl rounded-bl-md px-4 py-3"
```

**Avatars**
```jsx
/* User Avatar - Matches message bubble */
className="w-10 h-10 rounded-full bg-aman-stone-700 text-white flex items-center justify-center"

/* Bot Avatar - Subtle neutral */
className="w-10 h-10 rounded-full bg-aman-stone-200 text-aman-stone-600 flex items-center justify-center"
```

### Form Elements

**Input Fields**
```jsx
className="w-full px-6 py-4 bg-aman-stone-50 border border-aman-stone-200 rounded-2xl 
          focus:outline-none focus:ring-2 focus:ring-aman-gold-400 focus:border-transparent 
          placeholder-aman-stone-400 text-aman-stone-800"
```

**Primary Buttons**
```jsx
/* Primary action buttons - sophisticated stone */
className="px-6 py-3 bg-aman-stone-700 hover:bg-aman-stone-800 text-white rounded-xl 
          transition-all duration-200 hover:scale-105 disabled:opacity-50"

/* Accent buttons - use gold sparingly for special actions */
className="px-6 py-3 bg-aman-gold-600 hover:bg-aman-gold-700 text-white rounded-xl 
          transition-all duration-200 hover:scale-105 disabled:opacity-50"
```

**Secondary Buttons**
```jsx
className="px-4 py-2 bg-aman-stone-100 hover:bg-aman-stone-200 text-aman-stone-700 
          rounded-full transition-all duration-200 hover:scale-105 border border-aman-stone-200"
```

### Cards and Containers

**Main Card Pattern**
```jsx
className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-aman-stone-200"
```

**Content Cards**
```jsx
className="bg-white rounded-2xl shadow-lg border border-aman-stone-200 p-6"
```

## Layout Principles

### Spacing System
- Use Tailwind's spacing scale: 2, 3, 4, 6, 8, 12, 16, 20, 24
- Generous whitespace is essential for luxury feel
- Consistent gap patterns: `gap-2`, `gap-3`, `gap-4` for related elements

### Border Radius
- **Small elements**: `rounded-xl` (12px)
- **Buttons**: `rounded-xl` (12px) or `rounded-2xl` (16px)
- **Cards**: `rounded-2xl` (16px) or `rounded-3xl` (24px)
- **Main containers**: `rounded-3xl` (24px)

### Shadows
- **Subtle**: `shadow-lg`
- **Prominent**: `shadow-2xl`
- **Interactive**: `shadow-xl` on hover

## Animation & Interactions

### Standard Animations

**Fade In** (for page load)
```css
@keyframes fadeIn {
  0% { opacity: 0 }
  100% { opacity: 1 }
}
.animate-fade-in { animation: fadeIn 0.8s ease-out }
```

**Slide Up** (for cards/components)
```css
@keyframes slideUp {
  0% { transform: translateY(20px); opacity: 0 }
  100% { transform: translateY(0); opacity: 1 }
}
.animate-slide-up { animation: slideUp 0.6s ease-out }
```

### Interaction Patterns

**Hover Effects**
- Scale: `hover:scale-105` for buttons and interactive elements
- Color transitions: `transition-all duration-200`
- Background changes: Lighten by one shade

**Focus States**
- Always use `focus:outline-none focus:ring-2 focus:ring-aman-gold-400`
- Ensure accessibility with visible focus indicators

**Loading States**
```jsx
<div className="animate-spin rounded-full h-5 w-5 border-2 border-aman-gold-400 border-t-transparent" />
```

## Iconography

### Icon Library
- Use Heroicons for consistency
- Sizes: `h-4 w-4`, `h-5 w-5`, `h-6 w-6`, `h-8 w-8`
- Colors match text color hierarchy

### Icon Usage
- **User actions**: Outline icons (24/outline)
- **System status**: Solid icons (24/solid)
- **Decorative**: Use sparingly, maintain elegance

## Best Practices

### Do's ✅
- Maintain generous whitespace
- Use stone colors for primary UI
- Use gold sparingly for highlights
- Implement smooth transitions
- Test contrast ratios for accessibility
- Use backdrop blur for depth
- Maintain consistent border radius

### Don'ts ❌
- Overuse bright colors
- Crowd elements together
- Use harsh shadows
- Skip animation/transition timing
- Use inconsistent spacing
- Mix font families inappropriately
- Forget disabled/loading states

## Implementation Notes

### Tailwind Configuration
The custom colors and animations are configured in `tailwind.config.js`:
- Custom color palette extends default Tailwind colors
- Font families are properly loaded via Google Fonts
- Animation keyframes are defined in the theme extension

### Dependencies
- `@tailwindcss/typography` for prose styling
- `@heroicons/react` for consistent iconography
- Google Fonts for Inter and Playfair Display

### Browser Support
All styles use modern CSS features with fallbacks:
- Backdrop filter with solid color fallbacks
- Custom properties with static fallbacks
- Flexbox and Grid with appropriate prefixes