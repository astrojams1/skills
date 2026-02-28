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

Apply the **Architectural Minimalist** design system to the current project. Warm organic palette, sharp architectural geometry, precise yet inviting.

Reference implementation: https://pinch-pleat-simulator-731832823064.us-west1.run.app/

## Core Principles

1. **Sharp geometry everywhere.** `rounded-none` on all buttons, inputs, cards, containers. Exception: icon-only buttons use `rounded-full`.
2. **Borders define structure, not shadows.** Thin 1px borders (`border border-border`). Shadows only on overlaying elements (sidebar, floating controls).
3. **Warm organic palette.** Sage green, terracotta, stone, parchment. No cool blues or saturated primaries. Both themes maintain warm undertones.
4. **High information density** with clear hierarchy via typography scale, weight, and uppercase micro-labels.

## Step 1: Install Fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Tenor+Sans&display=swap" rel="stylesheet">
```

## Step 2: Color Palette (CSS Custom Properties)

```css
:root {
  --c-bg: #F9F8F6;  --c-surface: #FFFFFF;
  --c-secondary: #EBE9E4;  --c-secondary-hover: #DDD9D2;
  --c-primary: #7C9082;  --c-primary-hover: #627367;
  --c-accent: #C67D63;  --c-accent-hover: #A8654F;
  --c-border: #D4D4D4;
  --c-text-main: #2D2D2D;  --c-text-muted: #666666;  --c-text-light: #9CA3AF;
}

.dark {
  --c-bg: #1A1918;  --c-surface: #2A2928;
  --c-secondary: #2A2928;  --c-secondary-hover: #353432;
  --c-primary: #8CA092;  --c-primary-hover: #7C9082;
  --c-accent: #C67D63;  --c-accent-hover: #B56D53;
  --c-border: #3E3C3A;
  --c-text-main: #ECEBE9;  --c-text-muted: #A6A5A2;  --c-text-light: #8A8986;
}
```

Apply to `body`: `margin: 0; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; background-color: var(--c-bg); color: var(--c-text-main); transition: background-color 0.3s ease, color 0.3s ease;`

## Step 3: Tailwind CSS Config

```js
export default {
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: 'var(--c-bg)', surface: 'var(--c-surface)',
        primary: 'var(--c-primary)', primaryHover: 'var(--c-primary-hover)',
        accent: 'var(--c-accent)', accentHover: 'var(--c-accent-hover)',
        secondary: 'var(--c-secondary)', secondaryHover: 'var(--c-secondary-hover)',
        border: 'var(--c-border)',
        text: { main: 'var(--c-text-main)', muted: 'var(--c-text-muted)', light: 'var(--c-text-light)' },
      },
      fontFamily: { sans: ['"DM Sans"', 'sans-serif'], header: ['"Tenor Sans"', 'sans-serif'] },
    },
  },
}
```

## Step 4: Typography

| Role | Tailwind Classes |
|------|-----------------|
| **Page title** | `text-[26px] font-header font-medium text-text-main leading-tight mb-2` |
| **Section heading** | `font-header text-[15px] uppercase tracking-[0.1em] text-text-main` (active: `text-primary`) |
| **Body text** | `font-sans text-sm to text-base text-text-main` |
| **Micro-label** | `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5 block` |
| **Helper text** | `text-[12px] text-text-muted mt-2 leading-relaxed` |

## Step 5: Components

| Component | Key Classes | Details |
|-----------|-------------|---------|
| **Primary btn** | `bg-primary text-white hover:bg-primaryHover shadow-sm px-6 py-2.5 rounded-none` | |
| **Secondary btn** | `bg-surface border border-border hover:bg-secondaryHover shadow-sm px-6 py-2.5 rounded-none` | |
| **Accent btn** | `bg-accent text-white hover:bg-accentHover shadow-sm px-6 py-2.5 rounded-none` | |
| **Ghost btn** | `bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 rounded-none` | |
| **Icon btn** | `p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover` | Only exception to rounded-none |
| **Input** | `bg-surface border border-border rounded-none shadow-sm focus:ring-1 focus:ring-primary` | Number inputs add `font-mono` + suffix badge |
| **Toggle group** | `bg-secondary/50 p-1 gap-1 border border-border` | Active: `bg-surface shadow-sm border-black/5` |
| **Slider** | 2px track (`--c-border`), 16px circular thumb (`--c-accent`), border `var(--c-surface)` | Hover: `scale(1.1)` |
| **Card** | `bg-surface border border-border rounded-none p-4` | |
| **Computed value** | `bg-secondary/30 border border-border p-3` | Label + `font-mono` value |

All buttons share base: `inline-flex items-center justify-center font-medium transition-all duration-200 focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed`

**Signature component — Control Input:** A labeled number input + synced range slider + optional suffix/tip/action. Labels transition to `text-primary` on group hover.

See [references/components.md](references/components.md) for full HTML/CSS patterns for every component.

## Step 6: Layout

| Pattern | Key Details |
|---------|-------------|
| **Sidebar** | `w-[400px] bg-background border-r shadow-2xl`, slide animation via `translate-x-0` / `-translate-x-full` |
| **Accordion** | Grid-row animation (`grid-rows-[1fr]`/`[0fr]`), chevron `rotate-180`, title to `text-primary` when open |
| **Floating bar** | `bg-surface/95 backdrop-blur border-t shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)]` |

See [references/layout.md](references/layout.md) for full HTML patterns and global styles.

## Step 7: Global Styles

- **Selection:** `selection:bg-accent/20` on outermost container
- **Scrollbars:** `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent`
- **Theme transition:** `transition-colors duration-300` on all color-changing elements
- **Dark mode:** Toggle `dark` class on `<html>` — all colors update via CSS custom properties

## Checklist

- [ ] DM Sans (body) and Tenor Sans (headings) are loading
- [ ] All buttons/inputs use `rounded-none`; icon buttons use `rounded-full`
- [ ] Micro-labels: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Light bg is #F9F8F6 (warm off-white), dark bg is #1A1918 (warm charcoal)
- [ ] Terracotta accent #C67D63 is consistent across both themes
- [ ] Slider thumb border uses `var(--c-surface)`, not hardcoded white
- [ ] Number inputs use `font-mono`
- [ ] Borders are 1px; shadows only on sidebar/toggles/floating bar
- [ ] Buttons have focus rings and disabled states
- [ ] Labels hover to `text-primary`; selection uses `selection:bg-accent/20`
- [ ] Theme switches smoothly; no cool blues or default Tailwind colors leak through
