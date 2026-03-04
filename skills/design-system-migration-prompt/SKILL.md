---
name: design-system-migration-prompt
internal: true
description: >-
  A migration prompt for an AI agent in a consumer repo that already has the
  design-system skill. The agent audits the existing design system, strips it
  completely, and replaces it with the Architectural Minimalist design system
  by following the design-system skill.
metadata:
  version: "1.0"
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

You are performing a complete design system migration. Strip the existing design system and replace it with the **Architectural Minimalist** design system. This is a destructive, full replacement — not a partial overlay.

**Read the `design-system` skill now** — it is your single source of truth for colors, tokens, components, layout, anti-patterns, and the verification checklist:

1. `design-system/SKILL.md`
2. `design-system/references/components.md`
3. `design-system/references/layout.md`

This prompt does NOT repeat the skill. It adds the **migration-specific workflow**: audit, translation mapping, and safety constraints.

**CONSTRAINTS:**
1. Work file-by-file. Commit nothing until the full migration is verified.
2. Do NOT delete functional logic, routing, state management, or data-fetching code. Only replace visual/styling concerns.
3. If the project uses a component library (shadcn, MUI, Chakra, etc.), override its theme globally rather than removing the library — unless the user explicitly asks otherwise.
4. **Convert the layout** to match the design system's layout patterns — do NOT blindly preserve the existing layout structure. If the app has a sidebar with controls, adopt the Sidebar Application Layout from the skill (title + icon buttons inside the sidebar header, accordion sections, floating action buttons in the main content area). If the app has a top navigation bar, adopt the Header-Based Layout. Refer to `references/layout.md` for the complete layout patterns.
5. After all changes, run the project's build/lint/test commands to verify nothing is broken.

---

## Phase 1: Audit

Before changing anything, gather intelligence and report a structured summary:

1. **Tech stack:** Framework, styling approach (Tailwind / CSS Modules / styled-components / plain CSS / SCSS), component library (shadcn / MUI / Chakra / none), build tool
2. **Color audit:** Search for all non-design-system colors — Tailwind color classes, hex codes, CSS custom properties, `hsl(`/`rgb(`/`oklch(` values
3. **Geometry audit:** All `rounded-*` classes, `border-radius` in CSS, all `shadow-*` classes
4. **Typography audit:** Font imports, font config, heading/body patterns
5. **File inventory:** Global CSS, Tailwind config, HTML entry point, layout/shell components, all styled component files

---

## Phase 2: Install Foundations

Follow the design-system skill Steps 1–3 and Step 7. Migration-specific notes:

- **Remove** existing font imports before adding the design system fonts
- **Merge** into the existing Tailwind config — do not delete non-color/font extensions the project already has
- Add slider/range-input styles from `design-system/references/layout.md` to the global CSS

---

## Phase 3: Strip and Replace

Work through every file from the audit. Apply the design-system skill's Core Principles, Anti-patterns, Steps 4–6, and "When Applying to an Existing Project" section.

The one thing the skill doesn't provide is a **translation mapping** from old Tailwind defaults to new tokens. Use this:

| Old pattern | New token |
|---|---|
| `blue-*`, `indigo-*`, `violet-*`, `sky-*` (primary-like) | `primary` / `primaryHover` |
| `red-*`, `orange-*`, `amber-*` (accent-like) | `accent` / `accentHover` |
| `gray-*`, `slate-*`, `zinc-*`, `neutral-*` (backgrounds) | `background` / `surface` / `secondary` |
| `gray-*`, `slate-*` (text) | `text-main` / `text-muted` / `text-light` |
| `gray-*`, `slate-*` (borders) | `border` |
| `white` / `#FFFFFF` (page bg) | `background` |
| `white` / `#FFFFFF` (card/panel bg) | `surface` |
| Any hardcoded hex, rgb, hsl | Map to nearest design system token |

**Typography mapping** — equally critical as colors:

| Old pattern | New token |
|---|---|
| App title / page heading (any font/size) | `text-[26px] font-header font-medium text-text-main leading-tight mb-2` (Tenor Sans) |
| Section headings / sidebar section titles | `font-header text-[15px] uppercase tracking-[0.1em] text-text-main` (Tenor Sans) |
| Body text / labels | `font-sans` (DM Sans) — the project default |
| Micro-labels (form field labels) | `text-[11px] font-bold uppercase tracking-[0.15em] text-text-muted` (DM Sans) |
| Monospace / code / numbers | `font-mono` on number inputs and computed values |

**Floating action buttons** — audit all buttons in the main content area:
- Every floating toggle (dark mode, feature switches) MUST be a circular icon-only button: `w-12 h-12 !p-0 rounded-full shadow-lg` with a `w-5 h-5` Lucide icon inside
- Remove any text labels from floating action buttons — they are icon-only with `title` attributes for tooltips
- Group floating action buttons in `absolute top-4 right-4 z-10 flex gap-2`

**Sidebar properties** — the sidebar must match these exact specifications:
- Width: `w-[400px]` (open state), `w-0 -translate-x-full opacity-0` (closed state)
- Background: `bg-background` — the same warm neutral as the page, never a colored fill
- Shadow: `shadow-2xl` — the sidebar is an overlay element, so it keeps its shadow (do NOT strip it during shadow cleanup)
- Border: `border-r border-border`
- Transition: `transition-all duration-300 ease-in-out`

**Sidebar header** — the app title and action buttons (collapse, reset, auto-adjust) MUST be inside the sidebar header, not in a separate header bar or navbar. Follow the Sidebar Header pattern from `references/components.md`.

**Accordion section animations** — sidebar sections must use the CSS Grid animation trick for smooth expand/collapse:
- Container: `grid transition-all duration-300 ease-in-out`
- Open: `grid-rows-[1fr] opacity-100 pb-6`
- Closed: `grid-rows-[0fr] opacity-0`
- Inner wrapper: `overflow-hidden min-h-0`
- Only one section open at a time — expanding one collapses all others

**Toggle groups (segmented controls)** — replace any existing toggle/tab/segmented controls with the design system pattern:
- Container: `flex bg-secondary/50 rounded-none p-1 gap-1 border border-border`
- Active item: `bg-surface text-text-main shadow-sm border border-black/5`
- Inactive item: `text-text-muted hover:text-text-main hover:bg-surface/50 border border-transparent`
- Do NOT use `bg-primary`, `bg-accent`, or any colored fill for active toggle items — the active state is a subtle surface elevation with a shadow, not a color change

**SVG / Canvas annotations** — if the app draws measurement lines, dimension annotations, or overlays, convert them to the terracotta accent style from `references/components.md` (SVG / Canvas Measurement Annotations section).

If a component library sets colors or border-radius via its theme config, override them globally there too.

---

## Phase 4: Dark Mode

If the project already has a dark mode mechanism, adapt it to toggle the `dark` class on `<html>`. If there is no toggle, add one per the design-system skill's instructions. Verify CSS custom properties switch correctly between `:root` and `.dark`.

---

## Phase 5: Verify

1. Run the **Checklist** from the design-system skill's `SKILL.md` — every item must pass.
2. Confirm the project builds without errors and all tests pass.
3. **Straggler sweep for pre-migration remnants.** Search the codebase for values from the old design system that were missed during Phase 3. Key searches:
   - Hardcoded hex values (`#[0-9A-Fa-f]{3,8}`) that don't map to a `--c-*` token
   - CSS custom properties that are NOT `--c-*` design system tokens (leftover `--tw-*`, `--color-*`, framework vars)
   - Tailwind arbitrary color values (`text-[#`, `bg-[#`, `border-[#`)
   - Old font-family declarations that weren't replaced
4. **Typography check.** Verify:
   - The app title uses `font-header` (Tenor Sans), not the body font
   - All sidebar section headings use `font-header text-[15px] uppercase tracking-[0.1em]`
   - No old font-family declarations remain (search for `font-family`, Google Fonts imports other than DM Sans / Tenor Sans)
5. **Layout structure check.** Verify:
   - If the app has a sidebar: title and action icon buttons are inside the sidebar header (not in a separate header bar)
   - Sidebar width is `w-[400px]`, background is `bg-background`, shadow is `shadow-2xl`
   - Sidebar collapse button (`Minimize2`) is in the sidebar header button row
   - Sidebar expand button (`Maximize2`) is a floating circular button in the main content area (only visible when sidebar is collapsed)
   - Sidebar open/close uses `transition-all duration-300 ease-in-out`
   - Accordion sections animate with the grid-rows trick (`grid-rows-[1fr]` / `grid-rows-[0fr]` + opacity)
   - Only one accordion section is open at a time
   - All floating action buttons in the main content area are circular icon-only buttons (`w-12 h-12 rounded-full`)
   - Toggle groups use `bg-secondary/50` container with `bg-surface shadow-sm` active item — no colored fills
   - SVG/canvas measurement annotations use terracotta accent color, not black
6. **Zero tolerance.** If any straggler is found, fix it. Run the searches again after fixes to confirm.

---

## Phase 6: Novel Situations

During migration you will encounter UI patterns not covered by the design system. Follow the **Contributing New Patterns** section in the design-system skill's `SKILL.md` — ask the human, apply consistently, and contribute back.

---END---
