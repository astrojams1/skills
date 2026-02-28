---
name: design-system
description: >-
  Apply the Architectural Minimalist design system to web projects. Features
  warm organic colors (sage, terracotta, stone), sharp geometry (rounded-none),
  DM Sans and Tenor Sans typography, and full light/dark mode support with
  Tailwind CSS. Use when styling a web project or when the user mentions design
  systems, theming, or visual styling.
---

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

Define the full color palette as CSS custom properties on `:root` for light mode and inside a `.dark` class for dark mode.

```css
:root {
  /* Background & Surfaces */
  --c-bg: #F9F8F6;            /* Warm off-white (main background) */
  --c-surface: #FFFFFF;        /* Pure white (cards, inputs, elevated elements) */
  --c-secondary: #EBE9E4;     /* Warm grey (secondary backgrounds, toggle track) */
  --c-secondary-hover: #DDD9D2;

  /* Primary — Sage Green */
  --c-primary: #7C9082;
  --c-primary-hover: #627367;

  /* Accent — Terracotta */
  --c-accent: #C67D63;
  --c-accent-hover: #A8654F;

  /* Borders */
  --c-border: #D4D4D4;

  /* Text */
  --c-text-main: #2D2D2D;     /* Headings, body text */
  --c-text-muted: #666666;    /* Labels, secondary text */
  --c-text-light: #9CA3AF;    /* Hints, suffixes, placeholders */
}

.dark {
  /* Background & Surfaces */
  --c-bg: #1A1918;             /* Warm charcoal */
  --c-surface: #2A2928;        /* Lighter charcoal (inputs, cards) */
  --c-secondary: #2A2928;     /* Matches surface for cohesion */
  --c-secondary-hover: #353432;

  /* Primary — Sage Green (slightly lighter for contrast) */
  --c-primary: #8CA092;
  --c-primary-hover: #7C9082;

  /* Accent — Terracotta (unchanged between themes) */
  --c-accent: #C67D63;
  --c-accent-hover: #B56D53;

  /* Borders */
  --c-border: #3E3C3A;        /* Dark earth */

  /* Text */
  --c-text-main: #ECEBE9;     /* Alabaster */
  --c-text-muted: #A6A5A2;    /* Warm stone */
  --c-text-light: #8A8986;
}
```

Apply to `body`: `margin: 0; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; background-color: var(--c-bg); color: var(--c-text-main); transition: background-color 0.3s ease, color 0.3s ease;`

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
        background: 'var(--c-bg)',
        surface: 'var(--c-surface)',
        primary: 'var(--c-primary)',
        primaryHover: 'var(--c-primary-hover)',
        accent: 'var(--c-accent)',
        accentHover: 'var(--c-accent-hover)',
        secondary: 'var(--c-secondary)',
        secondaryHover: 'var(--c-secondary-hover)',
        border: 'var(--c-border)',
        text: {
          main: 'var(--c-text-main)',
          muted: 'var(--c-text-muted)',
          light: 'var(--c-text-light)',
        },
      },
      fontFamily: {
        sans: ['"DM Sans"', 'sans-serif'],
        header: ['"Tenor Sans"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
```

## Step 4: Apply Typography

### Page Titles

Use Tenor Sans at a larger size for the main page title:

```
font-family: 'Tenor Sans'  → font-header
font-size: 26px             → text-[26px]
font-weight: 500            → font-medium
line-height: tight          → leading-tight
color: text-main            → text-text-main
margin-bottom: 0.5rem       → mb-2
```

### Section Headings

Use Tenor Sans for all collapsible section headings. Apply uppercase and letter-spacing for an architectural "technical drawing" feel:

```
font-family: 'Tenor Sans'  → font-header
font-size: 15px             → text-[15px]
text-transform: uppercase   → uppercase
letter-spacing: 0.1em       → tracking-[0.1em]
color: text-main            → text-text-main
```

Active/open sections change color to primary: `text-primary`.

### Body Text

Use DM Sans for all body text, inputs, descriptions, and general UI:

```
font-family: 'DM Sans'     → font-sans (default)
font-size: 14px–16px        → text-sm to text-base
color: text-main            → text-text-main
```

### Micro-Labels (Input Labels, Field Labels)

A distinctive pattern of this design system. All input/field labels use this exact style:

```
font-size: 11px             → text-[11px]
font-weight: bold           → font-bold
text-transform: uppercase   → uppercase
letter-spacing: 0.15em      → tracking-[0.15em]
color: text-muted           → text-text-muted
margin-bottom: 0.375rem     → mb-1.5
display: block              → block
```

Combined Tailwind class: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5 block`

### Helper Text

For tips, descriptions below inputs, and secondary information:

```
font-size: 12px             → text-[12px]
color: text-muted           → text-text-muted
margin-top: 0.5rem          → mt-2
line-height: relaxed        → leading-relaxed
```

## Step 5: Style Components

### Buttons

All buttons share a common base: `inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed`

Variant-specific styles (appended to the base):

| Variant | Classes |
|---------|---------|
| **Primary** | `bg-primary text-white hover:bg-primaryHover shadow-sm px-6 py-2.5 text-base rounded-none` |
| **Secondary** | `bg-surface border border-border text-text-main hover:bg-secondaryHover shadow-sm px-6 py-2.5 text-base rounded-none` |
| **Accent** (CTA) | `bg-accent text-white hover:bg-accentHover shadow-sm px-6 py-2.5 text-base rounded-none` |
| **Ghost** | `bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 text-base rounded-none` |
| **Icon** (exception) | `p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent` |

### Inputs

All text inputs, number inputs, selects, and textareas use sharp corners, a subtle border, and a primary-colored focus ring:

```html
<input class="w-full px-3 py-2 bg-surface border border-border rounded-none text-base text-text-main shadow-sm
  placeholder-text-light
  focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary
  transition-all duration-200" />
```

**Number input with unit suffix:**

Wrap the input in a relative container and position the suffix absolutely:

```html
<div class="relative">
  <input type="number" class="w-full font-mono text-base py-2 pr-8 ..." />
  <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none select-none">
    in
  </span>
</div>
```

Number inputs use `font-mono` for tabular alignment of digits.

### Toggle Groups (Segmented Controls)

A segmented control where the active item is elevated on a surface background:

```html
<div class="flex bg-secondary/50 rounded-none p-1 gap-1 border border-border">
  <!-- Active option -->
  <button class="flex-1 py-2 px-3 text-[14px] font-medium transition-all duration-200
    bg-surface text-text-main shadow-sm border border-black/5">
    Active
  </button>
  <!-- Inactive option -->
  <button class="flex-1 py-2 px-3 text-[14px] font-medium transition-all duration-200
    text-text-muted hover:text-text-main hover:bg-surface/50 border border-transparent">
    Inactive
  </button>
</div>
```

### Sliders (Range Inputs)

Style range inputs with the terracotta accent thumb. Include WebKit and Mozilla vendor styles:

```css
input[type=range] { -webkit-appearance: none; appearance: none; background: transparent; cursor: pointer; width: 100%; }
input[type=range]::-webkit-slider-runnable-track { height: 2px; background: var(--c-border); border-radius: 1px; }
input[type=range]::-moz-range-track { height: 2px; background: var(--c-border); border-radius: 1px; }
input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none; appearance: none; height: 16px; width: 16px;
  background-color: var(--c-accent); border-radius: 50%; margin-top: -7px;
  border: 2px solid var(--c-surface); /* Uses surface color, not white — adapts to dark mode */
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}
input[type=range]::-moz-range-thumb {
  border: 2px solid var(--c-surface); height: 16px; width: 16px;
  background-color: var(--c-accent); border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}
input[type=range]::-webkit-slider-thumb:hover,
input[type=range]::-moz-range-thumb:hover { transform: scale(1.1); background-color: var(--c-accent-hover); }
input[type=range]:focus { outline: none; }
input[type=range]:focus::-webkit-slider-thumb { box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3); }
input[type=range]:focus::-moz-range-thumb { box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3); }
```

### Cards and Containers

Cards use sharp corners, a surface background, and thin borders:

```html
<div class="bg-surface border border-border rounded-none p-4">
  <!-- Card content -->
</div>
```

### Computed Value Display

For read-only calculated values or summary stats:

```html
<div class="p-3 bg-secondary/30 rounded border border-border">
  <div class="flex justify-between items-center">
    <span class="text-xs font-bold text-text-muted uppercase tracking-wider">Label</span>
    <span class="font-mono font-medium text-text-main">42.5"</span>
  </div>
</div>
```

### Control Input (Combined Input + Slider)

The signature compound control of this design system. A labeled number input paired with a synchronized range slider, optional unit suffix, tip text, and an optional action button:

```html
<div class="mb-5 group">
  <!-- Label row with optional action -->
  <div class="flex justify-between items-baseline mb-1">
    <label class="text-[11px] font-bold text-text-muted uppercase tracking-[0.15em] group-hover:text-primary transition-colors cursor-help">
      Field Label
    </label>
    <!-- Optional action button -->
    <button class="text-accent hover:text-accentHover text-[10px] font-bold uppercase tracking-widest px-1.5 py-1 rounded-sm hover:bg-accent/5 transition-colors">
      Action
    </button>
  </div>

  <!-- Number input with suffix -->
  <div class="mb-3 relative">
    <input type="number" class="w-full font-mono text-base py-2 pr-8 px-3 bg-surface border border-border rounded-none text-text-main shadow-sm
      focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary transition-all duration-200" />
    <span class="absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm pointer-events-none select-none">in</span>
  </div>

  <!-- Synchronized slider -->
  <div class="mb-2">
    <input type="range" class="w-full cursor-pointer accent-accent h-6" />
  </div>

  <!-- Optional tip text -->
  <p class="text-sm text-text-light leading-snug mt-2 min-h-[48px]">
    Helpful tip or guidance text here.
  </p>
</div>
```

Interaction: the label changes from `text-text-muted` to `text-primary` on group hover, providing a subtle focus cue.

## Step 6: Layout Patterns

### Sidebar

Collapsible sidebar with slide animation:

```html
<!-- Open state: w-[400px] translate-x-0 -->
<!-- Closed state: w-0 -translate-x-full opacity-0 -->
<aside class="w-[400px] translate-x-0 bg-background border-r border-border
  transition-all duration-300 ease-in-out flex flex-col h-full overflow-hidden
  shadow-2xl z-20 relative">

  <!-- Header -->
  <div class="flex-col items-stretch gap-4 p-8 border-none">
    <div class="flex justify-between items-start">
      <h1 class="text-[26px] font-header font-medium text-text-main leading-tight mb-2">
        Page Title
      </h1>
      <div class="flex gap-1">
        <!-- Icon buttons go here -->
      </div>
    </div>
  </div>

  <!-- Scrollable content -->
  <div class="flex-1 overflow-y-auto p-8 pt-4 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
    <!-- Sections go here -->
  </div>
</aside>
```

### Collapsible Sections (Accordions)

Use Tenor Sans headers with chevron rotation and smooth grid-row animation:

```html
<div class="border-b border-border last:border-0">
  <button class="w-full flex items-center justify-between py-5 px-1 group focus:outline-none select-none">
    <!-- Title changes to text-primary when open -->
    <span class="font-header text-[15px] uppercase tracking-[0.1em] text-text-main transition-colors group-hover:text-primary">
      Section Title
    </span>
    <!-- Chevron rotates 180deg when open -->
    <svg class="w-5 h-5 text-text-muted transition-transform duration-200 rotate-180 text-primary">
      <!-- ChevronDown icon -->
    </svg>
  </button>

  <!-- Animate open/closed with grid rows -->
  <!-- Open: grid-rows-[1fr] opacity-100 pb-6 -->
  <!-- Closed: grid-rows-[0fr] opacity-0 -->
  <div class="grid transition-all duration-300 ease-in-out grid-rows-[1fr] opacity-100 pb-6">
    <div class="overflow-hidden min-h-0">
      <!-- Section content -->
    </div>
  </div>
</div>
```

### Floating Controls (Bottom Bar)

For sticky bottom controls or toolbars:

```html
<div class="bg-surface/95 backdrop-blur border-t border-border p-6 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)] z-10">
  <div class="max-w-2xl mx-auto">
    <!-- Controls, sliders, etc. -->
  </div>
</div>
```

## Step 7: Global Styles

### Selection Color

Apply a warm accent tint to text selection:

```html
<div class="selection:bg-accent/20">
  <!-- All content -->
</div>
```

### Custom Scrollbars

Use thin scrollbars that blend with the border color:

```
scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent
```

(Requires `tailwind-scrollbar` plugin or equivalent CSS.)

### Theme Transition

All color transitions should use `transition-colors duration-300` to ensure smooth light/dark mode switching.

## Step 8: Dark Mode Toggle

Implement dark mode by toggling a `dark` class on the `<html>` or `<body>` element. All colors will automatically update through the CSS custom properties defined in Step 2.

```js
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

## Checklist

After applying the design system, verify:

- [ ] DM Sans is loading and applied as the default body font
- [ ] Tenor Sans is loading and applied to page titles and section headings
- [ ] All standard buttons and inputs use `rounded-none` (sharp corners)
- [ ] Icon-only buttons use `rounded-full`
- [ ] Micro-labels use the exact style: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Helper text uses: `text-[12px] text-text-muted mt-2 leading-relaxed`
- [ ] Light mode background is warm off-white (#F9F8F6), not pure white
- [ ] Dark mode background is warm charcoal (#1A1918), not pure black
- [ ] Terracotta accent (#C67D63) is consistent across both light and dark modes
- [ ] Slider thumb border uses `var(--c-surface)`, not hardcoded white
- [ ] Number inputs use `font-mono` for digit alignment
- [ ] Borders are thin (1px) and used to define layout structure
- [ ] Shadows are used sparingly: sidebar `shadow-2xl`, active toggles `shadow-sm`, floating bar custom shadow
- [ ] Buttons have focus rings (`focus:ring-2 focus:ring-primary/50`) and disabled states (`disabled:opacity-50`)
- [ ] Labels transition to `text-primary` on hover within their control group
- [ ] Theme switching transitions smoothly with `transition-colors duration-300`
- [ ] Text selection uses `selection:bg-accent/20`
- [ ] No cool blues, saturated primaries, or default Tailwind colors leak through
