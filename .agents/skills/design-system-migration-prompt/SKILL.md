---
name: design-system-migration-prompt
internal: true
description: >-
  A migration prompt for an AI agent in a consumer repo that already has the
  design-system skill. Use when the user wants to migrate an existing project
  to the Architectural Minimalist design system, or strip and replace an
  existing design system. The agent audits, strips, and replaces by following
  the design-system skill.
metadata:
  version: "1.1.0"
---

# Design system migration prompt

**Hand the user one prompt that makes an agent in a consumer repo replace its design system with Architectural
Minimalist.** The prompt points to the `design-system` skill instead of copying it, so the two never drift apart.

Use it when a consumer repo already has styling and needs a clean swap, or a project needs a full visual overhaul.
Use it when an agent should run the whole migration with no manual guidance.

Done means: the user has the whole prompt in one code block they can copy in one action.

## Before you start

The consumer repo must have the `design-system` skill, through the skills submodule or copied into its skill discovery
directory. If it doesn't, wire it up first with the `skill-orchestrator` skill.

## A run

1. **Offer it unasked.** The user may mention migrating a design system, restyling a project, or applying the
   Architectural Minimalist theme to an existing app. Then print the full prompt at once. Don't wait for them to ask.
2. **Print it in one block.** Put everything between the `---START---` and `---END---` markers inside one fenced code
   block that uses **four backticks**. The prompt's own triple-backtick fences then render fine inside it.
3. **Never say "copy from above".** Only you can see this skill. The user can't.

## The prompt

---START---

You are performing a complete design system migration. Strip the existing design system and replace it with the **Architectural Minimalist** design system. This is a destructive, full replacement, not a partial overlay.

**Read the `design-system` skill now.** It is your single source of truth for colors, tokens, components, layout, anti-patterns and the verification checklist:

1. `design-system/SKILL.md`
2. `design-system/references/components.md`
3. `design-system/references/layout.md`

This prompt does NOT repeat the skill. It adds the **migration-specific workflow**: the audit, a translation mapping and safety constraints.

**CONSTRAINTS:**
1. Work file by file. Commit nothing until the full migration is verified.
2. Do NOT delete functional logic, routing, state management or data-fetching code. Replace only visual and styling concerns.
3. If the project uses a component library (shadcn, MUI, Chakra and the like), override its theme globally. Don't remove the library unless the user explicitly asks.
4. **Convert the layout** to the design system's layout patterns. Do NOT blindly keep the existing layout structure. If the app has a sidebar with controls, adopt the Sidebar Application Layout. That means title and icon buttons inside the sidebar header, accordion sections, and floating action buttons in the main content area. If the app has a top navigation bar, adopt the Header-Based Layout. `references/layout.md` has the complete layout patterns.
5. After all changes, run the project's build, lint and test commands to verify nothing is broken.

---

## Phase 1: Audit

Before you change anything, gather the facts and report a structured summary:

1. **Tech stack:** Framework, styling approach (Tailwind / CSS Modules / styled-components / plain CSS / SCSS), component library (shadcn / MUI / Chakra / none), build tool.
2. **Color audit:** Every non-design-system color: Tailwind color classes, hex codes, CSS custom properties, and `hsl(`/`rgb(`/`oklch(` values.
3. **Geometry audit:** All `rounded-*` classes, `border-radius` in CSS, and all `shadow-*` classes.
4. **Typography audit:** Font imports, font config, heading and body patterns.
5. **File inventory:** Global CSS, Tailwind config, HTML entry point, layout and shell components, and every styled component file.

---

## Phase 2: Install Foundations

Follow the design-system skill's steps 1 to 3 (fonts, color palette, Tailwind config) and step 7 (Layout). For the migration:

- **Remove** the existing font imports before you add the design system fonts.
- **Merge** into the existing Tailwind config. Keep the extensions the project already has that aren't colors or fonts.
- Add the slider (range input) styles from `design-system/references/components.md`, Sliders (Range Inputs), to the global CSS.

---

## Phase 3: Strip and Replace

Work through every file from the audit. Apply the design-system skill's Core principles and Anti-patterns sections, steps 4 to 6 (Icons, Typography, Components), and its "Apply to an existing project" section.

The one thing the skill doesn't give is a **translation mapping** from old Tailwind defaults to the new tokens. Use this:

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

**Typography mapping.** Map each existing text role to the skill's type scale (step 5, Typography). Key conversions:

| Old pattern | Design system role |
|---|---|
| App title / page heading (any font/size) | **Page title**: uses `font-header` (Tenor Sans) |
| Section headings / sidebar section titles | **Section heading**: uses `font-header` (Tenor Sans) |
| Body text / labels | **Body text**: uses `font-sans` (DM Sans, the project default) |
| Form field labels | **Micro-label**: small, bold, uppercase |
| Number inputs / computed values | **Computed value**: uses `font-mono` |

Take the exact classes and sizes from the skill's step 5 Typography table.

**Component conversion.** Agents often get these wrong. For each, follow the exact pattern in `references/components.md`:
- **Floating action buttons:** Circular icon-only buttons with `title` attributes and no text labels. See the Floating Action Buttons section.
- **Toggle groups:** The active item uses surface elevation + shadow, NOT colored fills (`bg-primary`, `bg-accent`). See the Toggle Groups section.
- **SVG / canvas annotations:** Measurement lines use the terracotta accent, not black. See the SVG / Canvas Measurement Annotations section.

**Layout conversion.** Follow the exact layout pattern in `references/layout.md`:
- **Sidebar apps:** The app title and action buttons go inside the sidebar header. The sidebar's width, background, shadow and transition must match the Sidebar Application Layout. Accordion sections use the grid-row animation, with one section open at a time.
- **Header-based apps:** Use a neutral background with a border, never a colored fill.

If a component library sets colors or border-radius in its theme config, override them globally there too.

---

## Phase 4: Dark Mode

If the project already has a dark mode mechanism, adapt it to toggle the `dark` class on `<html>`. If it has no toggle, add one as the design-system skill describes. Verify that the CSS custom properties switch correctly between `:root` and `.dark`.

---

## Phase 5: Verify

1. Run the **Checklist** from the design-system skill's `SKILL.md`. Every item must pass. It covers foundations, geometry, color distribution, icons, layout, SVG annotations and typography.
2. Confirm the project builds without errors and all tests pass.
3. **Sweep for stragglers from before the migration.** These searches catch old values that Phase 3 missed:
   - Hardcoded hex values (`#[0-9A-Fa-f]{3,8}`) that don't map to a `--c-*` token
   - CSS custom properties that are NOT `--c-*` design system tokens (leftover `--tw-*`, `--color-*`, framework vars)
   - Tailwind arbitrary color values (`text-[#`, `bg-[#`, `border-[#`)
   - Old font-family declarations, or Google Fonts imports other than DM Sans / Tenor Sans
4. **Zero tolerance.** Fix every straggler you find. Run the searches again after the fixes to confirm.

---

## Phase 6: Novel Situations

You will meet UI patterns the design system doesn't cover. Follow the **Contribute new patterns** section in the design-system skill's `SKILL.md`. Ask the human, apply the pattern the same way everywhere, and add it back to the skill.

---END---

## Gotchas

- **The color audit misses places.** Agents often miss hardcoded colors in inline styles, SVG `fill` and `stroke`
  attributes, and CSS custom properties set in JavaScript. The Phase 1 audit must cover all of these, not just
  Tailwind classes and CSS files.
- **Component library themes get skipped.** With shadcn, MUI or Chakra, agents sometimes override single components
  instead of setting the theme globally. New components then come out inconsistent. Always override the theme config
  first.
- **The old layout survives.** The prompt says to convert layouts, but agents tend to keep the old structure. A
  sidebar app must adopt the Sidebar Application Layout, not just restyle its old sidebar.
- **Dark mode properties go unchecked.** Agents apply the dark mode tokens but don't verify that the `:root` and
  `.dark` custom properties actually switch. Always toggle dark mode and check the computed values.
- **The straggler sweep isn't rerun.** Agents run the sweep, fix what it finds, then call the task done without
  running it again. The prompt says "Run the searches again after the fixes"; enforce it.
