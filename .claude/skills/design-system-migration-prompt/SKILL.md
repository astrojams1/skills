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

## Phase 5: Verify

1. Run the **Checklist** from the design-system skill's `SKILL.md` — every item must pass
2. Confirm the project builds without errors and all tests pass
3. Search the entire codebase one final time for stray cool-toned colors, rounded corners, or structural shadows

Fix anything that fails before finishing.

---END---
