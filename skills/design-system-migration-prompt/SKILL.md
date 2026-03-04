---
name: design-system-migration-prompt
internal: true
description: >-
  A self-contained prompt for the skills repo author to give to an AI agent in a
  consumer repo. The agent audits the existing design system, strips it
  completely, and replaces it with the Architectural Minimalist design system
  (sage, terracotta, stone, sharp geometry, DM Sans + Tenor Sans).
---

# Skill: Design System Migration Prompt

This skill provides a copy-paste prompt that instructs an AI agent in a consumer repo to completely replace whatever design system is currently in use with the **Architectural Minimalist** design system. The prompt is self-contained — it embeds the full design system specification so the consumer agent needs no access to this repository.

## When to Use

- When onboarding a new consumer repo that already has styling and you want a clean swap
- When an existing project needs a full visual overhaul to match the Architectural Minimalist aesthetic
- When you want an agent to autonomously handle the entire migration without manual guidance

## Agent Instructions

**Proactive trigger:** If the user mentions migrating a design system, restyling a project, or applying the Architectural Minimalist theme to an existing app — immediately output the full prompt below. Do NOT wait for them to explicitly ask for it.

**Output rules:** Print everything between the `---START---` and `---END---` markers inside a single fenced code block using **quadruple backticks** (i.e., four backtick characters) so the user can copy the entire prompt in one action. The inner triple backticks will render correctly inside the quadruple-backtick fence. Do NOT tell the user to "copy from above" — the skill content is only in your context and is not visible to them.

## The Prompt

---START---

You are performing a complete design system migration. Your job is to **strip the existing design system entirely** and replace it with the **Architectural Minimalist** design system defined below. This is a destructive, full replacement — not a partial overlay.

**CONSTRAINTS — read before doing anything:**
1. Work file-by-file. Commit nothing until the full migration is complete and verified.
2. Do NOT delete functional logic, routing, state management, or data-fetching code. Only replace visual/styling concerns.
3. If the project uses a component library (shadcn, MUI, Chakra, etc.), override its theme globally rather than removing the library — unless the user explicitly asks you to remove it.
4. Preserve the existing layout structure (sidebar, top-nav, grid, etc.) but restyle it to match the design system.
5. After all changes, run the project's build/lint/test commands to verify nothing is broken.

---

## Phase 1: Audit the Existing Design System

Before changing anything, gather intelligence. Run these searches and report what you find:

1. **Tech stack detection:**
   - Framework: React / Vue / Svelte / plain HTML / other
   - Styling approach: Tailwind CSS / CSS Modules / styled-components / plain CSS / SCSS / other
   - Component library: shadcn / MUI / Chakra / Ant Design / none / other
   - Build tool: Vite / Next.js / CRA / Webpack / other

2. **Color audit — find every color reference in the project:**
   - Search for Tailwind color classes: `blue-`, `indigo-`, `gray-`, `slate-`, `zinc-`, `red-`, `green-`, `purple-`, `emerald-`, `sky-`, `violet-`
   - Search for hex codes: `#3B82F6`, `#6366F1`, `#EF4444`, etc.
   - Search for CSS custom properties or theme tokens: `--color-`, `--tw-`, theme config
   - Search for `hsl(`, `rgb(`, `oklch(` in stylesheets

3. **Geometry audit:**
   - Search for all `rounded-` classes (rounded-sm, rounded-md, rounded-lg, rounded-xl, rounded-2xl, rounded-full)
   - Search for `border-radius` in CSS files
   - Search for all `shadow-` classes (shadow-sm, shadow-md, shadow-lg, shadow-xl, shadow-2xl)
   - Search for `box-shadow` in CSS files

4. **Typography audit:**
   - Current font imports (Google Fonts links, @font-face, font files)
   - Font family configuration in Tailwind config or CSS
   - Heading/body font usage patterns

5. **File inventory — list the key files to modify:**
   - Global CSS file(s)
   - Tailwind config file
   - HTML entry point (for font links)
   - Layout/shell components (header, sidebar, footer)
   - All component files that contain styling

Report your findings in a structured summary before proceeding to Phase 2.

---

## Phase 2: Install Foundations

### 2A: Install Fonts

Add these to the HTML `<head>` (or framework equivalent like `app/layout.tsx`, `index.html`, `+layout.svelte`):

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Tenor+Sans&display=swap" rel="stylesheet">
```

Remove any existing Google Fonts links or @font-face declarations for fonts that are being replaced.

### 2B: CSS Custom Properties

Add these to your global CSS file. If a `:root` block already exists, replace its color variables entirely. If a `.dark` block exists, replace it too.

```css
:root {
  --c-bg: #F9F8F6;
  --c-surface: #FFFFFF;
  --c-secondary: #EBE9E4;
  --c-secondary-hover: #DDD9D2;
  --c-primary: #7C9082;
  --c-primary-hover: #627367;
  --c-accent: #C67D63;
  --c-accent-hover: #A8654F;
  --c-border: #D4D4D4;
  --c-text-main: #2D2D2D;
  --c-text-muted: #666666;
  --c-text-light: #9CA3AF;
}

.dark {
  --c-bg: #1A1918;
  --c-surface: #2A2928;
  --c-secondary: #2A2928;
  --c-secondary-hover: #353432;
  --c-primary: #8CA092;
  --c-primary-hover: #7C9082;
  --c-accent: #C67D63;
  --c-accent-hover: #B56D53;
  --c-border: #3E3C3A;
  --c-text-main: #ECEBE9;
  --c-text-muted: #A6A5A2;
  --c-text-light: #8A8986;
}
```

Apply to `body`:

```css
body {
  margin: 0;
  font-family: 'DM Sans', sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: var(--c-bg);
  color: var(--c-text-main);
  transition: background-color 0.3s ease, color 0.3s ease;
}
```

### 2C: Tailwind CSS Config

If the project uses Tailwind, replace the theme colors and fonts. Merge into the existing config — do not delete non-color/font extensions (spacing, plugins, etc.).

```js
// tailwind.config.js or tailwind.config.ts — merge into theme.extend
{
  darkMode: 'class',
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
}
```

If the project does NOT use Tailwind, apply the equivalent CSS classes manually or via the project's existing styling approach.

### 2D: Global Styles

Add these global styles:

- **Selection highlight:** Add `selection:bg-accent/20` on the outermost container (or via CSS: `::selection { background: rgba(198, 125, 99, 0.2); }`)
- **Scrollbars:** `scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent` (requires tailwind-scrollbar plugin, or equivalent CSS)
- **Theme transition:** `transition-colors duration-300` on all color-changing elements

### 2E: Slider (Range Input) Styles

Add these to your global CSS:

```css
input[type=range] {
  -webkit-appearance: none;
  appearance: none;
  background: transparent;
  cursor: pointer;
  width: 100%;
}

input[type=range]::-webkit-slider-runnable-track {
  height: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

input[type=range]::-moz-range-track {
  height: 2px;
  background: var(--c-border);
  border-radius: 1px;
}

input[type=range]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 16px;
  width: 16px;
  background-color: var(--c-accent);
  border-radius: 50%;
  margin-top: -7px;
  border: 2px solid var(--c-surface);
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}

input[type=range]::-moz-range-thumb {
  border: 2px solid var(--c-surface);
  height: 16px;
  width: 16px;
  background-color: var(--c-accent);
  border-radius: 50%;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
  transition: transform 0.1s ease, background-color 0.2s, border-color 0.3s;
}

input[type=range]::-webkit-slider-thumb:hover {
  transform: scale(1.1);
  background-color: var(--c-accent-hover);
}

input[type=range]::-moz-range-thumb:hover {
  transform: scale(1.1);
  background-color: var(--c-accent-hover);
}

input[type=range]:focus {
  outline: none;
}

input[type=range]:focus::-webkit-slider-thumb {
  box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3);
}

input[type=range]:focus::-moz-range-thumb {
  box-shadow: 0 0 0 2px rgba(198, 125, 99, 0.3);
}
```

---

## Phase 3: Strip and Replace (The Bulk Migration)

Work through the project systematically. For each file that contains styling:

### 3A: Color Replacement

Replace ALL existing color references with design system tokens. Use this mapping as a guide:

| Old pattern | New token |
|---|---|
| `blue-*`, `indigo-*`, `violet-*`, `sky-*` (primary-like) | `primary` / `primaryHover` |
| `red-*`, `orange-*`, `amber-*` (accent-like) | `accent` / `accentHover` |
| `gray-*`, `slate-*`, `zinc-*`, `neutral-*` (backgrounds) | `background` / `surface` / `secondary` |
| `gray-*`, `slate-*` (text) | `text-main` / `text-muted` / `text-light` |
| `gray-*`, `slate-*` (borders) | `border` |
| `white` / `#FFFFFF` (page background) | `background` |
| `white` / `#FFFFFF` (card/panel background) | `surface` |
| Any hardcoded hex, rgb, hsl values | Map to nearest design system token |

**No cool-toned colors should remain.** Every `blue-`, `indigo-`, `gray-`, `slate-`, `zinc-` must be replaced.

### 3B: Geometry — Strip All Border Radius

1. Search the entire project for `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` and replace with `rounded-none`.
2. Search for `rounded-full` — keep ONLY on icon-only buttons (small square buttons with just an SVG icon). Replace all other `rounded-full` with `rounded-none`.
3. Search CSS files for `border-radius` and set to `0` (except icon buttons).
4. If a component library sets border-radius via theme config, override it to `0` globally.

### 3C: Shadows — Replace with Borders

1. Remove `shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl` from cards, panels, containers, and sections.
2. Add `border border-border` to those elements instead.
3. Shadows are ONLY allowed on:
   - Sidebar overlays: `shadow-2xl`
   - Floating bottom bars: `shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)]`
   - Active toggle items: `shadow-sm`
   - Buttons: `shadow-sm` (small, subtle)
4. Search CSS files for `box-shadow` and apply the same rule.

### 3D: Headers and Navigation

If ANY header or navbar uses a colored background (`bg-blue-*`, `bg-primary`, `bg-accent`, `bg-green-*`, gradient, etc.):
- Replace with `bg-background border-b border-border`
- Text should be `text-text-main`, not `text-white`
- Navigation links become ghost buttons: `bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 rounded-none`

### 3E: Typography

Replace heading fonts with `font-header` (Tenor Sans) and body fonts with `font-sans` (DM Sans).

| Role | Classes |
|---|---|
| **Page title** | `text-[26px] font-header font-medium text-text-main leading-tight mb-2` |
| **Section heading** | `font-header text-[15px] uppercase tracking-[0.1em] text-text-main` |
| **Body text** | `font-sans text-sm to text-base text-text-main` |
| **Micro-label** | `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted mb-1.5 block` |
| **Helper text** | `text-[12px] text-text-muted mt-2 leading-relaxed` |

### 3F: Component Patterns

Apply these patterns to every matching component in the project:

**Primary Button:**
```
inline-flex items-center justify-center font-medium transition-all duration-200
focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary/50
disabled:opacity-50 disabled:cursor-not-allowed
bg-primary text-white hover:bg-primaryHover shadow-sm px-6 py-2.5 text-base rounded-none
```

**Secondary Button:**
```
[base classes] bg-surface border border-border text-text-main hover:bg-secondaryHover shadow-sm px-6 py-2.5 text-base rounded-none
```

**Accent Button (CTA):**
```
[base classes] bg-accent text-white hover:bg-accentHover shadow-sm px-6 py-2.5 text-base rounded-none
```

**Ghost Button:**
```
[base classes] bg-transparent text-text-muted hover:text-primary hover:bg-primary/5 px-4 py-2 text-base rounded-none
```

**Icon Button (only exception to rounded-none):**
```
p-2.5 rounded-full text-text-muted hover:text-primary hover:bg-secondaryHover bg-transparent transition-all duration-200
```

**Text Input / Select / Textarea:**
```
w-full px-3 py-2 bg-surface border border-border rounded-none text-base text-text-main shadow-sm
placeholder-text-light focus:outline-none focus:ring-1 focus:ring-inset focus:ring-primary focus:border-primary transition-all duration-200
```

**Number Input:** Same as text input plus `font-mono`.

**Card / Container:**
```
bg-surface border border-border rounded-none p-4
```

**Toggle Group (Segmented Control):**
- Wrapper: `flex bg-secondary/50 rounded-none p-1 gap-1 border border-border`
- Active item: `bg-surface text-text-main shadow-sm border border-black/5`
- Inactive item: `text-text-muted hover:text-text-main hover:bg-surface/50 border border-transparent`

**Computed Value Display:**
```html
<div class="p-3 bg-secondary/30 rounded border border-border">
  <div class="flex justify-between items-center">
    <span class="text-xs font-bold text-text-muted uppercase tracking-wider">Label</span>
    <span class="font-mono font-medium text-text-main">Value</span>
  </div>
</div>
```

### 3G: Layout Patterns

**Header:**
```html
<header class="bg-background border-b border-border px-8 py-4">
  <div class="flex items-center justify-between">
    <h1 class="text-[26px] font-header font-medium text-text-main leading-tight">Title</h1>
    <nav class="flex items-center gap-2">
      <!-- ghost buttons for nav items, icon buttons for actions -->
    </nav>
  </div>
</header>
```

**Sidebar (if present):**
```
w-[400px] bg-background border-r border-border shadow-2xl
```
Slide animation via `translate-x-0` (open) / `-translate-x-full` (closed).

**Floating Bottom Bar (if present):**
```
bg-surface/95 backdrop-blur border-t border-border p-6 shadow-[0_-4px_30px_-5px_rgba(0,0,0,0.1)]
```

**Accordion / Collapsible Section:**
- Title: `font-header text-[15px] uppercase tracking-[0.1em]`, changes to `text-primary` when open
- Chevron: `rotate-180` when open
- Content: animate with `grid-rows-[1fr]` / `grid-rows-[0fr]`

---

## Phase 4: Dark Mode

1. Ensure the `<html>` element toggles a `dark` class for dark mode. If the project already has a dark mode mechanism, adapt it to toggle this class.
2. Verify that all CSS custom properties switch correctly between `:root` and `.dark`.
3. If there is no dark mode toggle in the UI, add one as an icon button in the header.
4. Test that the theme transitions smoothly — `transition-colors duration-300` should be on color-changing elements.

Dark mode toggle function:
```js
function toggleDarkMode() {
  document.documentElement.classList.toggle('dark');
}
```

---

## Phase 5: Verification Checklist

After completing all changes, verify every item below. Report the result of each check. If any item fails, fix it before finishing.

**Foundations:**
- [ ] DM Sans (body) and Tenor Sans (headings) are loading — check the network tab or the HTML source
- [ ] CSS custom properties (`:root` and `.dark`) are defined in the global stylesheet
- [ ] Light background is #F9F8F6 (warm off-white), dark background is #1A1918 (warm charcoal)
- [ ] Terracotta accent #C67D63 is consistent across both themes
- [ ] Theme switches smoothly with no flicker or unstyled flash

**Geometry and Structure:**
- [ ] All buttons/inputs/cards/containers use `rounded-none`; only icon buttons use `rounded-full`
- [ ] No `rounded-sm` through `rounded-2xl` classes remain in the project (search to confirm)
- [ ] Cards and sections use `border border-border`, not `shadow-*`
- [ ] Shadows only on sidebar overlay, floating bar, active toggle items, and buttons

**Color Distribution:**
- [ ] Background/surface (warm neutrals) covers 85%+ of visible area
- [ ] No headers, banners, or sections use `bg-primary` or `bg-accent` as a background fill
- [ ] Primary (sage) appears only on buttons, links, active states, and hover indicators
- [ ] Accent (terracotta) appears only on CTA buttons, slider thumbs, and small highlights
- [ ] **Zero** default Tailwind blue, indigo, gray, or slate colors remain (search to confirm: `blue-`, `indigo-`, `gray-`, `slate-`, `zinc-`)

**Typography and Details:**
- [ ] Micro-labels: `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted`
- [ ] Number inputs use `font-mono`
- [ ] Slider thumb border uses `var(--c-surface)`, not hardcoded white
- [ ] Buttons have focus rings (`focus:ring-2 focus:ring-primary/50`) and disabled states
- [ ] Labels hover to `text-primary`; text selection uses `selection:bg-accent/20`

**Build and Runtime:**
- [ ] Project builds without errors
- [ ] No console warnings or errors related to styling
- [ ] All existing tests still pass

**Anti-patterns — confirm NONE of these exist:**
- [ ] No colored header/navbar backgrounds (must be `bg-background border-b border-border`)
- [ ] No `bg-primary` or `bg-accent` on containers, sections, or page regions
- [ ] No `shadow-md` / `shadow-lg` / `shadow-xl` on cards or panels
- [ ] No cool-toned colors (blue, indigo, slate, zinc, gray) anywhere in the project
- [ ] No mixed corner styles (everything is sharp except icon buttons)

---

## Reference Implementation

Visual reference: https://pinch-pleat-simulator-731832823064.us-west1.run.app/

When in doubt about how something should look, refer to this live implementation.

---END---
