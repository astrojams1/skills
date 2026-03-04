---
name: design-system-migration-prompt
internal: true
description: >-
  A migration prompt for an AI agent in a consumer repo that already has the
  design-system skill. The agent audits the existing design system, strips it
  completely, and replaces it with the Architectural Minimalist design system
  by following the design-system skill.
---

# Skill: Design System Migration Prompt

This skill provides a copy-paste prompt that instructs an AI agent in a consumer repo to completely replace whatever design system is currently in use with the **Architectural Minimalist** design system. The consumer repo must already have access to the `design-system` skill — the prompt references it rather than embedding the full spec.

## When to Use

- When onboarding a new consumer repo that already has styling and you want a clean swap
- When an existing project needs a full visual overhaul to match the Architectural Minimalist aesthetic
- When you want an agent to autonomously handle the entire migration without manual guidance

## Prerequisites

The consumer repo must have the `design-system` skill available (via the skills submodule or copied into its skill discovery directory). If it does not, use the `skill-orchestrator` skill to wire it up first.

## Agent Instructions

**Proactive trigger:** If the user mentions migrating a design system, restyling a project, or applying the Architectural Minimalist theme to an existing app — immediately output the full prompt below. Do NOT wait for them to explicitly ask for it.

**Output rules:** Print everything between the `---START---` and `---END---` markers inside a single fenced code block using **quadruple backticks** (i.e., four backtick characters) so the user can copy the entire prompt in one action. The inner triple backticks will render correctly inside the quadruple-backtick fence. Do NOT tell the user to "copy from above" — the skill content is only in your context and is not visible to them.

## The Prompt

---START---

You are performing a complete design system migration. Your job is to **strip the existing design system entirely** and replace it with the **Architectural Minimalist** design system. This is a destructive, full replacement — not a partial overlay.

**Your primary reference is the `design-system` skill.** Read these files now — they contain every color, token, component pattern, and layout rule you need:

1. `design-system/SKILL.md` — core principles, color palette, Tailwind config, typography, component summary, layout patterns, checklist
2. `design-system/references/components.md` — full HTML/CSS patterns for every component
3. `design-system/references/layout.md` — full HTML patterns for layouts and global styles

Follow the skill's Steps 1–7 for all implementation details. This prompt adds the **migration-specific workflow** on top.

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

Follow the `design-system` skill Steps 1–3 and Step 7:

- **Step 1** — Install fonts (remove existing font imports that are being replaced)
- **Step 2** — Add CSS custom properties (`:root` and `.dark` blocks) and body styles
- **Step 3** — Configure Tailwind (merge into existing config — do not delete non-color/font extensions)
- **Step 7** — Add global styles (selection highlight, scrollbars, theme transitions)

Also add the slider (range input) styles from `design-system/references/layout.md` to the global CSS.

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

Follow the design-system skill's Core Principle 1:
1. Replace all `rounded-sm` through `rounded-3xl` with `rounded-none`.
2. Keep `rounded-full` ONLY on icon-only buttons. Replace all other `rounded-full` with `rounded-none`.
3. Set `border-radius: 0` in CSS files (except icon buttons).
4. If a component library sets border-radius via theme config, override it to `0` globally.

### 3C: Shadows — Replace with Borders

Follow the design-system skill's Core Principle 2:
1. Remove `shadow-*` from cards, panels, containers, and sections.
2. Add `border border-border` to those elements instead.
3. Shadows are ONLY allowed on sidebar overlays, floating bottom bars, active toggle items, and buttons (`shadow-sm`).

### 3D: Headers and Navigation

If ANY header or navbar uses a colored background (`bg-blue-*`, `bg-primary`, `bg-accent`, gradient, etc.):
- Replace with `bg-background border-b border-border`
- Text should be `text-text-main`, not `text-white`
- Navigation links become ghost buttons (see design-system skill Step 5)

### 3E: Typography

Apply the typography scale from the design-system skill Step 4. Replace heading fonts with `font-header` (Tenor Sans) and body fonts with `font-sans` (DM Sans).

### 3F: Component Patterns

Restyle every component to match the patterns in the design-system skill Step 5 and `design-system/references/components.md`. Key components: buttons (primary, secondary, accent, ghost, icon), inputs, cards, toggle groups, computed value displays.

### 3G: Layout Patterns

Restyle layout shells to match the design-system skill Step 6 and `design-system/references/layout.md`. Key patterns: header, sidebar, floating bar, accordion.

---

## Phase 4: Dark Mode

1. Ensure the `<html>` element toggles a `dark` class for dark mode. If the project already has a dark mode mechanism, adapt it to toggle this class.
2. Verify that all CSS custom properties switch correctly between `:root` and `.dark`.
3. If there is no dark mode toggle in the UI, add one as an icon button in the header.
4. Test that the theme transitions smoothly — `transition-colors duration-300` should be on color-changing elements.

---

## Phase 5: Verification Checklist

Run through the **Checklist** section at the bottom of the design-system skill's `SKILL.md`. Verify every item and report the result. Additionally confirm:

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

If any item fails, fix it before finishing.

---

## Reference Implementation

Visual reference: https://pinch-pleat-simulator-731832823064.us-west1.run.app/

When in doubt about how something should look, refer to this live implementation.

---END---
