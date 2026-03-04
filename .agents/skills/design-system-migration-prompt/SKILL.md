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

**Typography mapping** — map existing text roles to the design system's typography scale (Step 5 in the skill). Key conversions:

| Old pattern | Design system role |
|---|---|
| App title / page heading (any font/size) | **Page title** — uses `font-header` (Tenor Sans) |
| Section headings / sidebar section titles | **Section heading** — uses `font-header` (Tenor Sans) |
| Body text / labels | **Body text** — uses `font-sans` (DM Sans, the project default) |
| Form field labels | **Micro-label** — small, bold, uppercase |
| Number inputs / computed values | **Computed value** — uses `font-mono` |

Refer to the skill's Step 5 Typography table for exact classes and sizes.

**Component conversion** — the following components are commonly mis-migrated. For each, follow the exact pattern in `references/components.md`:
- **Floating action buttons:** Must be circular icon-only buttons with `title` attributes — no text labels. See the Floating Action Buttons section.
- **Toggle groups:** Active item uses surface elevation + shadow, NOT colored fills (`bg-primary`, `bg-accent`). See the Toggle Groups section.
- **SVG / Canvas annotations:** Measurement lines use terracotta accent, not black. See the SVG / Canvas Measurement Annotations section.

**Layout conversion** — follow the exact layout pattern from `references/layout.md`:
- **Sidebar apps:** App title and action buttons go inside the sidebar header. Sidebar properties (width, background, shadow, transition) must match the Sidebar Application Layout. Accordion sections use the grid-row animation with single-open behavior.
- **Header-based apps:** Use neutral background with border, never colored fill.

If a component library sets colors or border-radius via its theme config, override them globally there too.

---

## Phase 4: Dark Mode

If the project already has a dark mode mechanism, adapt it to toggle the `dark` class on `<html>`. If there is no toggle, add one per the design-system skill's instructions. Verify CSS custom properties switch correctly between `:root` and `.dark`.

---

## Phase 5: Verify

1. Run the **Checklist** from the design-system skill's `SKILL.md` — every item must pass. This covers foundations, geometry, color distribution, icons, layout, SVG annotations, and typography.
2. Confirm the project builds without errors and all tests pass.
3. **Straggler sweep for pre-migration remnants.** These searches catch old values missed during Phase 3:
   - Hardcoded hex values (`#[0-9A-Fa-f]{3,8}`) that don't map to a `--c-*` token
   - CSS custom properties that are NOT `--c-*` design system tokens (leftover `--tw-*`, `--color-*`, framework vars)
   - Tailwind arbitrary color values (`text-[#`, `bg-[#`, `border-[#`)
   - Old font-family declarations or Google Fonts imports other than DM Sans / Tenor Sans
4. **Zero tolerance.** If any straggler is found, fix it. Run the searches again after fixes to confirm.

---

## Phase 6: Novel Situations

During migration you will encounter UI patterns not covered by the design system. Follow the **Contributing New Patterns** section in the design-system skill's `SKILL.md` — ask the human, apply consistently, and contribute back.

---END---
