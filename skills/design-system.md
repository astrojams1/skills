# Skill: Apply the Architectural Minimalist Design System

## Overview

Apply the **Architectural Minimalist** design system to the current project. This design system combines a warm, organic color palette with sharp, architectural geometry. It feels like a professional tool for interior designers — precise, structured, yet inviting.

Reference implementation: https://pinch-pleat-simulator-731832823064.us-west1.run.app/

## Core Principles

1. **Sharp geometry everywhere.** Use `rounded-none` (0px border radius) on all standard buttons, inputs, cards, and containers. The only exception is icon-only buttons, which use `rounded-full`.
2. **Borders define structure, not shadows.** Use thin 1px borders (`border border-border`) to create a precise grid-like layout. Shadows are used sparingly and only for depth on overlaying elements (e.g., sidebars, floating controls).
3. **Warm organic palette.** All colors are rooted in nature — sage green, terracotta, stone, parchment. No cool blues or saturated primaries. Both light and dark modes maintain warm undertones.
4. **High information density** with clear hierarchical separation. Pack content tightly but use typography scale, weight, and uppercase micro-labels to maintain readability.

## Step 1: Install Fonts

Add DM Sans (body) and Tenor Sans (headers) from Google Fonts.

In `<head>` or via CSS `@import`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Tenor+Sans&display=swap" rel="stylesheet">
```

## Step 2: Configure CSS Custom Properties

Define the full color palette as CSS custom properties on `:root` for light mode and inside a `.dark` class (or `@media (prefers-color-scheme: dark)`) for dark mode.

```css
:root {
  --c-background: #F9F8F6;
  --c-surface: #FFFFFF;
  --c-primary: #7C9082;
  --c-primary-hover: #627367;
  --c-accent: #C67D63;
  --c-accent-hover: #A8654F;
  --c-secondary: #EBE9E4;
  --c-border: #D4D4D4;
  --c-text-main: #2D2D2D;
  --c-text-muted: #666666;
}

.dark {
  --c-background: #1A1918;
  --c-surface: #2A2928;
  --c-primary: #8CA092;
  --c-primary-hover: #7A9184;
  --c-accent: #C67D63;
  --c-accent-hover: #D4907A;
  --c-secondary: #3A3938;
  --c-border: #4A4948;
  --c-text-main: #ECEBE9;
  --c-text-muted: #A6A5A2;
}
```

Add smooth theme transitions on the body and main layout containers:

```css
body {
  background-color: var(--c-background);
  color: var(--c-text-main);
  transition: background-color 300ms ease-in-out, color 300ms ease-in-out;
}
```

## Step 3: Configure Tailwind CSS

Extend the Tailwind config to map CSS custom properties into Tailwind utilities. If the project does not use Tailwind, implement equivalent CSS classes manually.

```js
// tailwind.config.js
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--c-background)',
        surface: 'var(--c-surface)',
        primary: {
          DEFAULT: 'var(--c-primary)',
          hover: 'var(--c-primary-hover)',
        },
        accent: {
          DEFAULT: 'var(--c-accent)',
          hover: 'var(--c-accent-hover)',
        },
        secondary: 'var(--c-secondary)',
        border: 'var(--c-border)',
        text: {
          main: 'var(--c-text-main)',
          muted: 'var(--c-text-muted)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        header: ['"Tenor Sans"', 'sans-serif'],
      },
      borderRadius: {
        none: '0px',
      },
    },
  },
  plugins: [],
}
```

## Step 4: Apply Typography

### Headings

Use Tenor Sans for all section headings and page titles. Apply uppercase and letter-spacing for an architectural "technical drawing" feel:

```
font-family: 'Tenor Sans', sans-serif    → font-header
font-size: 15px                           → text-[15px]
text-transform: uppercase                 → uppercase
letter-spacing: 0.1em                     → tracking-[0.1em]
color: var(--c-text-main)                → text-text-main
```

### Body Text

Use DM Sans for all body text, inputs, descriptions, and general UI:

```
font-family: 'DM Sans', sans-serif       → font-sans (default)
font-size: 14px                           → text-sm
color: var(--c-text-main)                → text-text-main
```

### Micro-Labels (Input Labels, Field Labels)

A distinctive pattern of this design system. All input/field labels use this exact style:

```
font-size: 11px                           → text-[11px]
font-weight: bold                         → font-bold
text-transform: uppercase                 → uppercase
letter-spacing: 0.15em                    → tracking-[0.15em]
color: var(--c-text-muted)               → text-text-muted
```

Combined Tailwind class: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`

## Step 5: Style Components

### Buttons

**Primary Button:**
```html
<button class="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-none text-sm font-medium transition-colors duration-200">
  Save Changes
</button>
```

**Secondary Button:**
```html
<button class="bg-surface border border-border hover:bg-secondary/50 text-text-main px-4 py-2 rounded-none text-sm font-medium transition-colors duration-200">
  Cancel
</button>
```

**Accent Button (Call-to-Action):**
```html
<button class="bg-accent hover:bg-accent-hover text-white px-4 py-2 rounded-none text-sm font-medium transition-colors duration-200">
  Get Started
</button>
```

**Icon Button (Exception — uses rounded-full):**
```html
<button class="p-2 rounded-full hover:bg-secondary/50 text-text-muted transition-colors duration-200">
  <svg>...</svg>
</button>
```

### Inputs

All text inputs, selects, and textareas use sharp corners, a subtle border, and a primary-colored focus ring:

```html
<div>
  <label class="text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1 block">
    Field Label
  </label>
  <input class="w-full bg-surface border border-border px-3 py-2 rounded-none text-sm text-text-main focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-colors duration-200" />
</div>
```

### Toggle Groups (Segmented Controls)

A segmented control where the active item is elevated on a surface background:

```html
<div class="bg-secondary/50 border border-border p-1 flex rounded-none">
  <button class="bg-surface text-text-main shadow-sm border border-black/5 px-3 py-1.5 text-sm font-medium">
    Active
  </button>
  <button class="text-text-muted hover:text-text-main px-3 py-1.5 text-sm font-medium transition-colors duration-200">
    Inactive
  </button>
</div>
```

### Sliders (Range Inputs)

Style range inputs with the terracotta accent thumb:

```css
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 2px;
  background: var(--c-border);
  outline: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--c-accent);
  border: 2px solid white;
  cursor: pointer;
  transition: transform 200ms ease-in-out;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
}
```

### Cards and Containers

Cards use sharp corners, a surface background, and thin borders:

```html
<div class="bg-surface border border-border rounded-none p-4">
  <!-- Card content -->
</div>
```

## Step 6: Layout Patterns

### Sidebar

If the application has a sidebar, use this pattern:

```html
<aside class="w-[400px] bg-background border-r border-border shadow-2xl h-screen overflow-y-auto">
  <!-- Sidebar content -->
</aside>
```

### Collapsible Sections (Accordions)

Use Tenor Sans headers with smooth grid-row animation:

```html
<div class="border-b border-border">
  <button class="w-full flex justify-between items-center py-3 px-4">
    <span class="font-header text-[15px] uppercase tracking-[0.1em] text-text-main">
      Section Title
    </span>
    <svg class="transition-transform duration-200" ...><!-- Chevron --></svg>
  </button>
  <div class="grid transition-[grid-template-rows] duration-300 ease-in-out"
       style="grid-template-rows: 0fr;">
    <div class="overflow-hidden">
      <div class="p-4">
        <!-- Section content -->
      </div>
    </div>
  </div>
</div>
```

When expanded, set `grid-template-rows: 1fr`.

### Floating Controls (Bottom Bar)

For sticky bottom controls or toolbars:

```html
<div class="fixed bottom-0 left-0 right-0 bg-surface/95 backdrop-blur border-t border-border shadow-lg px-4 py-3">
  <!-- Controls -->
</div>
```

## Step 7: Dark Mode Toggle

Implement dark mode by toggling a `dark` class on the `<html>` or `<body>` element. All colors will automatically update through the CSS custom properties defined in Step 2.

```js
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

## Checklist

After applying the design system, verify:

- [ ] DM Sans is loading and applied as the default body font
- [ ] Tenor Sans is loading and applied to all section headings
- [ ] All standard buttons and inputs use `rounded-none` (sharp corners)
- [ ] Icon-only buttons use `rounded-full`
- [ ] Micro-labels use the exact style: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Light mode uses warm off-white background (#F9F8F6), not pure white
- [ ] Dark mode uses warm charcoal (#1A1918), not pure black
- [ ] Terracotta accent (#C67D63) is consistent across both light and dark modes
- [ ] Borders are thin (1px) and used to define layout structure
- [ ] Shadows are used sparingly (only sidebar `shadow-2xl`, active toggles `shadow-sm`, floating controls `shadow-lg`)
- [ ] Theme switching transitions smoothly with `transition-colors duration-300`
- [ ] No cool blues, saturated primaries, or default Tailwind colors leak through
