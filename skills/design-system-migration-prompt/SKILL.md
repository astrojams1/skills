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
4. Preserve the existing layout structure but restyle it to match the design system.
5. After all changes, run the project's build/lint/test commands to verify nothing is broken.
6. **Absolutely everything must be governed by the design system.** No straggling colors, fonts, radii, or shadows may remain outside design system tokens. If a value exists in the codebase that doesn't trace to the design system, it must be replaced or explicitly approved by the human.
7. **Ask the human when encountering novel situations.** If you encounter a UI pattern, component, or styling need not covered by the design system, do not guess — describe the situation and propose an approach using design system principles, then wait for the human's guidance before proceeding.

---

## Phase 1: Audit

Before changing anything, gather intelligence and report a structured summary:

1. **Tech stack:** Framework, styling approach (Tailwind / CSS Modules / styled-components / plain CSS / SCSS), component library (shadcn / MUI / Chakra / none), build tool
2. **Color audit — search for everything to replace:**
   - Tailwind color classes: `blue-`, `indigo-`, `gray-`, `slate-`, `zinc-`, `red-`, `green-`, `purple-`, `emerald-`, `sky-`, `violet-`
   - Hex codes, CSS custom properties (`--color-`, `--tw-`), `hsl(`/`rgb(`/`oklch(` values
3. **Geometry audit:** All `rounded-*` classes, `border-radius` in CSS, all `shadow-*` classes, `box-shadow` in CSS
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

If a component library sets colors or border-radius via its theme config, override them globally there too.

---

## Phase 4: Dark Mode

If the project already has a dark mode mechanism, adapt it to toggle the `dark` class on `<html>`. If there is no toggle, add one per the design-system skill's instructions. Verify CSS custom properties switch correctly between `:root` and `.dark`.

---

## Phase 5: Verify — Exhaustive Straggler Sweep

**Nothing escapes.** Every color, font, radius, and shadow in the project must trace back to a design system token. Stray values mean the migration is incomplete.

1. Run the **Checklist** from the design-system skill's `SKILL.md` — every item must pass.
2. Confirm the project builds without errors and all tests pass.
3. **Exhaustive search for straggling values.** Run each of these searches across the entire codebase and fix every hit:

   **Colors:**
   - Tailwind color classes: `blue-`, `indigo-`, `gray-`, `slate-`, `zinc-`, `red-`, `green-`, `purple-`, `emerald-`, `sky-`, `violet-`, `amber-`, `orange-`, `cyan-`, `teal-`, `lime-`, `pink-`, `rose-`, `fuchsia-`, `yellow-`, `stone-` (Tailwind's stone, not the design system)
   - Hardcoded hex values: `#[0-9A-Fa-f]{3,8}` — every hex must be a design system token or explicitly justified
   - Inline `rgb(`, `rgba(`, `hsl(`, `hsla(`, `oklch(` values
   - CSS custom properties that are NOT `--c-*` design system tokens (e.g. leftover `--tw-*`, `--color-*`, framework vars)
   - Tailwind arbitrary color values: `text-[#`, `bg-[#`, `border-[#`, `fill-[#`, `stroke-[#`

   **Typography:**
   - Font families other than `DM Sans` and `Tenor Sans` — search for `font-family`, `fontFamily`, Google Fonts imports, `@font-face`
   - Tailwind font classes not in the design system: `font-serif`, `font-mono` (except on number inputs)

   **Geometry:**
   - Any `rounded-sm`, `rounded-md`, `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl` classes
   - Any `border-radius` in CSS/SCSS (must be `0` or circular for icon buttons)
   - Structural `shadow-*` classes on non-overlay elements

4. **Zero tolerance.** If any straggler is found, fix it. Do not proceed until the sweep is clean. Run the searches again after fixes to confirm.

---

## Phase 6: Novel Situations — Ask, Then Contribute Back

During migration you will encounter UI patterns not covered by the design system (e.g. toast notifications, data tables, modals, progress bars, badges). When this happens:

1. **Ask the human for guidance.** Describe the component and propose how it should look using design system principles (warm palette, sharp geometry, border-based structure). Wait for approval before proceeding.
2. **Apply the approved pattern** consistently across all instances of that component.
3. **Contribute the pattern back to the design system.** After the migration is complete, open a PR (or describe the addition) to the `skills` repository:
   - Add the new component pattern to `design-system/references/components.md`
   - If it's a layout pattern, add it to `design-system/references/layout.md`
   - If it introduces a new token or concept, update `design-system/SKILL.md`
   - Include the rationale and the human's guidance in the PR description

This ensures the design system grows with real-world usage and future migrations benefit from patterns discovered in earlier ones.

---END---
