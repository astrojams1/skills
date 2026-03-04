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

1. **Sharp geometry everywhere.** `rounded-none` on all buttons, inputs, cards, containers. Exception: icon-only buttons use `rounded-full`. Strip all `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` (except icon buttons) from the entire project.
2. **Borders define structure, not shadows.** Thin 1px borders (`border border-border`). Shadows only on overlaying elements (sidebar, floating controls). Remove all `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl` from cards, sections, and containers.
3. **Warm organic palette.** Sage green, terracotta, stone, parchment. No cool blues or saturated primaries. Both themes maintain warm undertones.
4. **Warm neutrals dominate.** Background (`#F9F8F6`) and surface (`#FFFFFF`) should cover 85%+ of the visible area. Primary (sage) and accent (terracotta) are for buttons, links, active states, slider thumbs, and micro-accents only — never as large background fills for headers, banners, hero sections, or cards.
5. **High information density** with clear hierarchy via typography scale, weight, and uppercase micro-labels.

## Anti-patterns — Never Do These

- **Never use primary/accent as a header or banner background.** Headers use `bg-background` or `bg-surface` with a `border-b border-border`, not a colored fill.
- **Never leave default framework colors.** Replace all Tailwind blue (`blue-500`, `indigo-600`, etc.), gray (`gray-*`), and other cool-toned defaults with the design system tokens.
- **Never mix rounded and sharp corners.** Every element must use `rounded-none` (except icon-only buttons which use `rounded-full`). If the project uses a component library with rounded defaults, override them globally.
- **Never use drop shadows for structure.** Cards, panels, and sections are bordered, not shadowed. Shadows are reserved exclusively for overlaying elements (sidebar overlay, floating control bar, active toggle).
- **Never use `bg-primary` or `bg-accent` on containers, sections, or page regions.** These colors are strictly for interactive elements (buttons, links, active indicators, slider thumbs).
- **Never skip the CSS custom properties.** Even if Tailwind classes are used, the `:root` / `.dark` variables must be defined so that all theme colors resolve correctly.

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

Apply to `body`: `margin: 0; font-family: 'DM Sans', sans-serif; -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; background-color: var(--c-bg); color: var(--c-text-main); transition: background-color 0.3s ease, color 0.3s ease;`

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
| **Floating action btn** | `shadow-lg w-12 h-12 rounded-full bg-surface border border-border flex items-center justify-center hover:scale-105 transition-transform` | Circular, positioned absolute in main content for toggles (day/night, feature switches) |
| **Input** | `bg-surface border border-border rounded-none shadow-sm focus:ring-1 focus:ring-primary` | Number inputs: `font-mono` + right-justified unit suffix (`absolute right-3 top-1/2 -translate-y-1/2 text-text-light text-sm`) |
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
| **Sidebar app shell** | Outermost: `flex h-screen w-screen overflow-hidden bg-background`. Left: sidebar (`w-[400px]`). Right: main content (`flex-1 flex flex-col h-full relative`). |
| **Sidebar** | `w-[400px] bg-background border-r border-border shadow-2xl z-20 relative`. Header area: app name (`text-[26px] font-header`) + icon button row (`flex gap-1`). Body: `flex-1 overflow-y-auto p-8 pt-4` with accordion sections. Collapse: `w-0 -translate-x-full opacity-0`; show circular expand button (`absolute top-4 left-4 shadow-lg rounded-full`) in main content. |
| **Accordion sections** | Inside sidebar scrollable body. Separated by `border-b border-border last:border-0`. Tenor Sans title goes `text-primary` when open. Chevron `rotate-180` when open. Grid-row animation (`grid-rows-[1fr]`/`[0fr]`). |
| **Main content area** | `flex-1 bg-secondary relative overflow-hidden` for the content region (NOT `bg-background` — use the warmer `bg-secondary`). Floating action buttons positioned `absolute top-4 right-4 z-10 flex gap-2` using circular buttons (`w-12 h-12 rounded-full shadow-lg`). |
| **Header / navbar** | Alternative to sidebar layout. `bg-background border-b border-border` — neutral background, never colored fill. |
| **Card grid** | Cards: `bg-surface border border-border rounded-none p-4`. Grid: `grid gap-4`. Section titles: uppercase micro-labels. |
| **Floating bar** | `bg-surface/95 backdrop-blur border-t shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)]` for sticky bottom controls. |

**Adapting to any layout:** The visual identity comes from the color palette, typography, sharp geometry, and border-based structure — not from a specific layout. Keep warm neutral background dominant, use borders instead of shadows for structure, and restrict primary/accent to interactive elements.

See [references/layout.md](references/layout.md) for full HTML patterns and global styles.

## Step 7: Global Styles

- **Selection:** `selection:bg-accent/20` on outermost container
- **Scrollbars:** `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent`
- **Theme transition:** `transition-colors duration-300` on all color-changing elements
- **Dark mode:** Toggle `dark` class on root container — all colors update via CSS custom properties. Provide a circular floating action button (`w-12 h-12 rounded-full shadow-lg`) with sun icon (light mode) / moon icon (dark mode) in the main content area's top-right corner.

## When Applying to an Existing Project

1. **Audit existing colors.** Search for all hardcoded colors (`blue-`, `gray-`, `indigo-`, `#3B82F6`, etc.) and replace with design system tokens.
2. **Strip all border-radius.** Find and remove all `rounded-*` classes (except `rounded-full` on icon buttons). Add `rounded-none` explicitly where needed.
3. **Replace shadow-based structure with borders.** Remove `shadow-*` from cards, panels, and containers. Add `border border-border` instead.
4. **Check headers/navbars.** If any header uses a colored background (`bg-blue-*`, `bg-primary`, `bg-accent`, `bg-green-*`, etc.), replace with `bg-background border-b border-border`.
5. **Install the fonts and CSS custom properties** — these are mandatory, not optional.

## Contributing New Patterns

When applying this design system to a project, you will encounter UI patterns not yet covered (e.g. toast notifications, data tables, modals, progress bars, badges). When this happens:

1. **Ask the human for guidance** — propose how the component should look using the core principles (warm palette, sharp geometry, border-based structure, minimal color accents). Wait for approval.
2. **Apply the approved pattern** consistently across all instances.
3. **Contribute it back** to this skill so future projects benefit:
   - New component patterns go in `references/components.md`
   - New layout patterns go in `references/layout.md`
   - New tokens or core concepts go in this file (`SKILL.md`)
   - Include rationale and context with each addition

The design system grows through real-world usage. Every novel pattern is an opportunity to make the system more complete.

## Checklist

**Foundations:**
- [ ] DM Sans (body) and Tenor Sans (headings) are loading
- [ ] CSS custom properties (`:root` and `.dark`) are defined
- [ ] Light bg is #F9F8F6 (warm off-white), dark bg is #1A1918 (warm charcoal)
- [ ] Terracotta accent #C67D63 is consistent across both themes
- [ ] Theme switches smoothly; no cool blues or default Tailwind colors leak through

**Geometry and Structure:**
- [ ] All buttons/inputs/cards/containers use `rounded-none`; icon buttons use `rounded-full`
- [ ] No `rounded-sm` through `rounded-2xl` classes remain in the project (except icon buttons)
- [ ] Cards and sections use `border border-border`, not `shadow-*`
- [ ] Shadows only on sidebar overlay, floating bar, and active toggle items

**Color Distribution:**
- [ ] Background/surface (warm neutrals) covers 85%+ of visible area
- [ ] No headers, banners, or sections use `bg-primary` or `bg-accent` as a background fill
- [ ] Primary (sage) appears only on buttons, links, active states, and hover indicators
- [ ] Accent (terracotta) appears only on CTA buttons, slider thumbs, and small highlights
- [ ] No default Tailwind blue, indigo, or gray colors remain

**Layout and Interaction:**
- [ ] Sidebar header shows app name (`text-[26px] font-header`) with icon button row (actions + collapse)
- [ ] Sidebar is collapsible; circular expand button appears in main content when collapsed
- [ ] Sidebar sections are collapsible accordions with Tenor Sans titles and chevron rotation
- [ ] Main content area uses `bg-secondary` background (not `bg-background`)
- [ ] Control inputs pair number input (right-justified unit suffix) with synced range slider below
- [ ] Dark mode toggle uses circular floating action button (`w-12 h-12 rounded-full shadow-lg`) with sun/moon icon
- [ ] Floating action buttons positioned `absolute top-4 right-4 z-10` in main content

**Typography and Details:**
- [ ] Micro-labels: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Number inputs use `font-mono`
- [ ] Slider thumb border uses `var(--c-surface)`, not hardcoded white
- [ ] Buttons have focus rings and disabled states
- [ ] Labels hover to `text-primary`; selection uses `selection:bg-accent/20`
