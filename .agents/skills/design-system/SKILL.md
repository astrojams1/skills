---
name: design-system
description: >-
  Apply the Architectural Minimalist design system to web projects. Features
  warm organic colors (sage, terracotta, stone), sharp geometry (rounded-none),
  DM Sans and Tenor Sans typography, and full light/dark mode support with
  Tailwind CSS. Use when the user asks to style a web project, mentions design
  systems, theming, visual styling, color palette, typography, dark mode, or
  when a project needs a cohesive visual identity applied from scratch.
metadata:
  version: "1.1.0"
---

# Design system

**Apply the Architectural Minimalist design system to this project.** A warm organic palette and sharp geometry make
it precise yet inviting.

Done means: every item in the [Checklist](#checklist) passes, in light and dark mode.

## Where things are

| What | Where |
|---|---|
| Principles, tokens, fonts, Tailwind config, checklist | This file |
| Component HTML/CSS patterns, exact classes, code examples | [references/components.md](references/components.md) |
| Layout patterns, global styles, interaction details | [references/layout.md](references/layout.md) |
| Reference implementation | https://pinch-pleat-simulator-731832823064.us-west1.run.app/ |

## Core principles

1. **Sharp geometry everywhere.** Use `rounded-none` on all buttons, inputs, cards and containers. The one exception:
   icon-only buttons use `rounded-full`. Strip every `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`,
   `rounded-2xl` and `rounded-full` (except on icon buttons) from the whole project. Never mix rounded and sharp
   corners. If a component library has rounded defaults, override them globally.
2. **Borders define structure, not shadows.** Use thin 1px borders (`border border-border`). Put shadows only on
   overlaying elements: the sidebar overlay, the floating control bar and the active toggle. Remove all `shadow-sm`,
   `shadow-md`, `shadow-lg` and `shadow-xl` from cards, panels, sections and containers.
3. **Warm organic palette.** Sage green, terracotta, stone, parchment. No cool blues or saturated primaries. Both
   themes keep warm undertones.
4. **Warm neutrals dominate.** Background (`#F9F8F6`) and surface (`#FFFFFF`) cover 85%+ of the visible area. Primary
   (sage) and accent (terracotta) are for buttons, links, active states, slider thumbs and micro-accents only. Never
   use `bg-primary` or `bg-accent` on headers, banners, hero sections, cards or page regions. Headers use
   `bg-background` or `bg-surface` with `border-b border-border`.
5. **High information density.** Show a clear hierarchy through the type scale, weight and uppercase micro-labels.

## Anti-patterns

- **Never leave default framework colors.** Replace Tailwind blue (`blue-500`, `indigo-600` and the like), gray
  (`gray-*`) and other cool defaults with the design system tokens.
- **Never skip the CSS custom properties.** Define the `:root` and `.dark` variables even when you use Tailwind
  classes, so every theme color resolves.

## A run

### 1. Install the fonts

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Tenor+Sans&display=swap" rel="stylesheet">
```

### 2. Set the color palette (CSS custom properties)

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

### 3. Configure Tailwind CSS

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

### 4. Icons

**Use [Lucide](https://lucide.dev/) only.** Use `lucide-react` for React and `lucide` for vanilla JS. Don't mix icon
libraries.

**Set every icon's size.** Lucide defaults to 24px, so override it:

| Context | Class | Size |
|---------|-------|------|
| Sidebar header icon buttons | `w-5 h-5` | 20px |
| Floating action buttons (`w-12 h-12`) | `w-5 h-5` | 20px |
| Inline body icons | `w-4 h-4` | 16px |

All icon buttons use one icon size (`w-5 h-5`). The button's padding and size set the hit target, not the icon size.
Put `className="w-5 h-5"` (or `size={20}`) on every Lucide icon component. A missing size is this system's most
common mistake: oversized icons break the sidebar header alignment.

**Style sidebar header icon buttons as a tuned set.** They use `p-2.5`, `rounded-full`, `text-text-muted`, and hover to
`text-primary` (sage green) on `bg-secondaryHover`. The `hover:text-primary` is mandatory: never use
`hover:text-text-main` or another hover color. The `w-5 h-5` icon, `p-2.5` padding and `items-start` on the parent
flex row work together. They line the icon centers up with the title's cap-height, so changing one breaks the
alignment. The full class string and the reasons are in `references/components.md`, Sidebar Header.

**Use these icons:**

| Function | Lucide Icon |
|----------|-------------|
| Collapse sidebar | `Minimize2` |
| Expand sidebar | `Maximize2` |
| Reset / undo | `RotateCcw` |
| Auto-adjust / magic | `Wand2` |
| Dark mode (day) | `Sun` |
| Dark mode (night) | `Moon` |
| Section accordion chevron | `ChevronDown` (rotates 180° when open) |

**Pick new icons simply.** Choose simple outlines, not filled shapes. Show the action, not the object. Prefer
metaphors everyone knows, like a chevron to expand or an X to close. Browse [lucide.dev/icons](https://lucide.dev/icons)
and pick the simplest. If two are alike, pick the one with fewer strokes.

### 5. Typography

| Role | Tailwind Classes | Min Size |
|------|-----------------|----------|
| **Page title** | `text-[26px] font-header font-medium text-text-main leading-tight mb-2` | 26px |
| **Section heading** | `font-header text-[15px] uppercase tracking-[0.1em] text-text-main` (active: `text-primary`) | 15px |
| **Body text** | `font-sans text-sm to text-base text-text-main` | 14px (`text-sm`) |
| **Micro-label** | `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5 block` | 11px |
| **Helper text** | `text-[12px] text-text-muted mt-2 leading-relaxed` | 12px |
| **Tip text** | `text-sm text-text-light leading-snug` | 14px |
| **Inline action** | `text-[10px] font-bold uppercase tracking-widest text-accent` | 10px |
| **Computed value** | `font-mono font-medium text-text-main` (uses body size context) | 14px |

**Minimum sizes.** No UI text is smaller than `10px`. Only inline action buttons (like "Set to Floor") use `10px`.
Labels, helper text and all readable content are `11px` or larger. Micro-labels at `11px` are the smallest readable
tier. They make up for it with `font-bold` and `uppercase tracking-[0.15em]`.

### 6. Components

Full HTML/CSS patterns, exact classes and code examples are in
[references/components.md](references/components.md).

- **Buttons:** Primary (sage fill), Secondary (surface + border), Accent (terracotta fill), Ghost (transparent).
  Icon buttons are the only exception to `rounded-none`: they use `rounded-full` and must have a `title` attribute.
  Floating Action buttons are circular (`w-12 h-12 rounded-full shadow-lg`), sit in the main content area and must
  have a `title` attribute.
- **Form controls:** Input (sharp corners, border-based, `font-mono` for number inputs). Toggle Group (a segmented
  control: the active item is raised with surface bg + shadow, no colored fills). Slider (terracotta thumb, with a
  `var(--c-surface)` thumb border for dark mode). Control Input (a labeled number input + synced range slider +
  optional suffix, tip or action).
- **Dropdown (Select Menu):** A custom select with sharp corners and a border-based trigger styled like an input. It
  has a `ChevronDown` indicator (`w-4 h-4`, rotates 180° when open) and an overlay options panel (`shadow-lg`). The
  selected option uses `text-primary bg-primary/5`. It supports grouped options with micro-label headings.
- **Containers:** Card (`bg-surface border border-border rounded-none`). Computed Value display (`bg-secondary/30`
  with a mono value).
- **Unit suffix on number inputs:** Show it for measurement fields (`in`, `%`, `px`). Leave it off dimensionless
  counts.
- **SVG / canvas annotations:** Apps that draw measurements or dimension lines on a canvas or SVG use the terracotta
  accent (`#C67D63`), never default black. This covers lines, end caps and value labels. The full SVG pattern and React helper
  are in [references/components.md](references/components.md).

### 7. Layout

The design system has two main layouts. Full HTML patterns, class strings and interaction details are in
[references/layout.md](references/layout.md).

**Sidebar app shell.** This is the main layout. A collapsible sidebar (`w-[400px]`, `bg-background`, `shadow-2xl`)
sits on the left. Its header holds the app title and icon buttons, and its body holds accordion sections. The main
content area (`flex-1`, `bg-secondary`) sits on the right, with floating action buttons top-right and an optional
floating bottom bar. The sidebar animates open and closed with `transition-all duration-300 ease-in-out`. The canvas
or content must re-zoom when the sidebar opens or closes.

- **Header:** The app title and action buttons (collapse, reset and so on) live **inside** the sidebar header.
- **Accordions:** Only one section is open at a time. Titles use `font-header`, with `ChevronDown` rotation and a
  grid-row animation.
- **Width:** All sidebar controls are full width.
- **Collapse and expand:** `Minimize2` in the sidebar header collapses it. A floating `Maximize2` button in the main
  content expands it.

**Header-based layout.** Use it for apps with no sidebar. The header is `bg-background border-b border-border`: a
neutral background, never a colored fill.

**Other patterns.** Card grid (border-based, no shadows). Floating bottom bar (backdrop-blur, border-t, shadow).

**Any other layout.** The look comes from the palette, the type, sharp geometry and border-based structure, not from
one layout. Follow the core principles.

### 8. Global styles

- **Selection:** `selection:bg-accent/20` on the outermost container.
- **Scrollbars:** `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent`.
- **Theme transition:** `transition-colors duration-300` on every element that changes color.
- **Dark mode:** Toggle the `dark` class on the root container. All colors update through the CSS custom properties.
  Add a circular floating action button (`w-12 h-12 rounded-full shadow-lg`) in the top-right corner of the main
  content area. It shows a sun icon in light mode and a moon icon in dark mode.

## Apply to an existing project

1. **Audit existing colors.** Search for every hardcoded color (`blue-`, `gray-`, `indigo-`, `#3B82F6` and the like).
   Replace each with a design system token.
2. **Strip all border-radius.** Remove every `rounded-*` class, except `rounded-full` on icon buttons. Add
   `rounded-none` explicitly where needed.
3. **Replace shadow-based structure with borders.** Remove `shadow-*` from cards, panels and other containers that
   don't overlay. Add `border border-border` instead. **Keep shadows on overlaying elements:** the sidebar
   (`shadow-2xl`), floating action buttons (`shadow-lg`), the floating bottom bar and the expand button (`shadow-lg`).
4. **Check headers and navbars.** If a header has a colored background (`bg-blue-*`, `bg-primary`, `bg-accent`,
   `bg-green-*` and the like), replace it with `bg-background border-b border-border`.
5. **Install the fonts and CSS custom properties.** Both are mandatory.

## Contribute new patterns

For a UI pattern this system doesn't cover yet, like a toast, data table, modal, progress bar or badge:

1. **Ask the human.** Propose a look that follows the core principles: warm palette, sharp geometry, border-based
   structure, few color accents. Wait for approval.
2. **Apply the approved pattern** the same way everywhere it appears.
3. **Add it to this skill,** with the reasons and context, so future projects benefit:
   - New component patterns go in `references/components.md`.
   - New layout patterns go in `references/layout.md`.
   - New tokens or core ideas go in this file (`SKILL.md`).

## Checklist

**Foundations:**
- [ ] DM Sans (body) and Tenor Sans (headings) are loading
- [ ] CSS custom properties (`:root` and `.dark`) are defined
- [ ] Light bg is #F9F8F6 (warm off-white), dark bg is #1A1918 (warm charcoal)
- [ ] Terracotta accent #C67D63 is the same in both themes
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

**Icons:**
- [ ] Using Lucide icons only (`lucide-react` or `lucide`)
- [ ] All icon buttons use `w-5 h-5` icon size whatever the button's size
- [ ] Sidebar header icon buttons use `hover:text-primary hover:bg-secondaryHover`, NOT `hover:text-text-main`
- [ ] Sidebar collapse uses `Minimize2`; expand uses `Maximize2`
- [ ] Section accordions use `ChevronDown` with `rotate-180` when open
- [ ] Dark mode toggle uses `Sun` (day) / `Moon` (night) from Lucide

**Layout and Interaction:**
- [ ] Sidebar header: `flex justify-between items-start`, so title and icon buttons are top-aligned
- [ ] Sidebar collapse/expand animates with `transition-all duration-300 ease-in-out`; a circular expand button (`Maximize2`) appears when collapsed
- [ ] App shell uses `overflow-hidden`, so no horizontal scrollbar flashes during the sidebar transition
- [ ] Canvas/content re-zooms to fill the space when the sidebar opens or closes (resize observer or `transitionend`)
- [ ] Sidebar sections are collapsible accordions with Tenor Sans (`font-header`) titles, `border-b border-border` dividers, and chevron rotation
- [ ] Accordion section headers show `text-primary` on hover (title and chevron, via `group-hover:text-primary`)
- [ ] Accordion content animates with `grid transition-all duration-300 ease-in-out` between `grid-rows-[1fr]` and `grid-rows-[0fr]`
- [ ] Only one accordion section is open at a time; opening one closes the others
- [ ] All controls inside the sidebar are full width (`w-full`): inputs, toggles and sliders fill the sidebar content area
- [ ] Main content area uses `flex-1 flex flex-col h-full relative`; the canvas region uses `flex-1 bg-secondary relative overflow-hidden` to fill all the space
- [ ] Control inputs pair a number input (unit suffix when it applies) with a synced range slider below
- [ ] Unit suffixes shown only on measurement fields (inches, %, px), not on dimensionless counts
- [ ] All icon-only buttons and floating action buttons have a `title` attribute (native browser tooltip)
- [ ] Dark mode toggle is a circular floating action button (`w-12 h-12 rounded-full shadow-lg`) with a sun/moon icon
- [ ] Floating action buttons sit at `absolute top-4 right-4 z-10` in the main content

**SVG / Canvas Annotations:**
- [ ] Measurement/dimension lines use terracotta accent (`#C67D63`), not default black
- [ ] Dimension value labels use a filled terracotta pill with white bold text
- [ ] End caps are perpendicular serif lines in terracotta
- [ ] No default SVG colors (black strokes, black text) remain on annotation elements

**Typography and Details:**
- [ ] No text smaller than 10px; 10px only for inline action buttons
- [ ] Micro-labels at 11px are the smallest readable content tier
- [ ] Micro-labels: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Number inputs use `font-mono`
- [ ] Slider thumb border uses `var(--c-surface)`, not hardcoded white
- [ ] Buttons have focus rings and disabled states
- [ ] Labels hover to `text-primary`; selection uses `selection:bg-accent/20`
