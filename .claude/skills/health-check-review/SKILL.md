---
name: health-check-review
internal: true
description: >-
  Process health check reports from consumer repos. Use when the user pastes
  a health check report, asks to diagnose a consumer repo integration, or
  wants to review skills integration issues. Analyzes report data, identifies
  bugs in manage.sh or skills code, suggests improvements to the
  health-check-prompt, and provides step-by-step next steps.
metadata:
  version: "1.0"
---

# Skill: Health Check Review

Process one or more health check reports pasted by the user from consumer repos. Diagnose issues, fix bugs in this repo, improve the health-check-prompt if needed, and deliver concrete next steps.

## Proactive Trigger

Activate this skill when the user pastes text containing a Skills Health Report (look for "Skills Health Report", numbered sections like "Submodule Registration", "Discovery Directories", "manage.sh check", etc.) or mentions reviewing or analyzing a health check report. Reports arrive wrapped in a single fenced code block — parse the markdown content inside the fence.

## Workflow

### Step 1: Parse Reports

Extract from each report:

- **Agent type:** Claude or Codex
- **Project name** (from the Project field)
- **Submodule SHAs:** local (HEAD), remote (origin/main), recorded (git ls-tree)
- **manage.sh version:** commit hash from section 7
- **Section verdicts:** PASS / WARN / FAIL for each numbered section
- **Discovery dir contents:** file listings and diff output
- **manage.sh check output:** including any auto-fix messages
- **Spec validation results:** pass/fail counts

If multiple reports are provided, note which agent produced each.

### Step 2: Cross-Agent Comparison

When reports from multiple agents are available, compare:

| Dimension | What to check |
|-----------|---------------|
| Submodule SHA | Same commit? If not, did Claude's SessionStart hook reset to the recorded pointer? Look for `+` prefix in Codex's status line. |
| manage.sh version | Same commit in section 7? Version skew is the #1 cause of discrepancies between agents. |
| Discovery dirs | Same files? Stale flat files (`.md` at top level) in one but not the other? Internal skills present? |
| check output | Did one auto-fix while the other just warned? Auto-sync was added in newer manage.sh versions. |
| Spec validation | Same pass count? Older versions run fewer tests — this is expected, not a bug. |

### Step 3: Classify Each Finding

For every issue, assign one classification:

| Classification | Meaning | Where to act |
|---------------|---------|--------------|
| **Bug** | Code defect in manage.sh or a skill file | Fix in this repo |
| **Version skew** | Old manage.sh lacks a feature or fix | Self-heals after consumer runs `manage.sh sync` |
| **Consumer action** | Requires manual steps in the consumer repo | Document in next steps |
| **Prompt improvement** | Health-check-prompt should gather better data or give clearer instructions | Edit `skills/health-check-prompt/SKILL.md` |

### Step 4: Fix Bugs

For each **Bug**:

1. Read the relevant source (usually `bin/manage.sh`)
2. Identify the root cause — don't just patch symptoms
3. Fix the code
4. If the symptom isn't already in the diagnostic table in `skills/health-check-prompt/SKILL.md`, add it
5. Run `tests/test-identity.sh` and `python3 tests/test_skills_spec.py`

### Step 5: Improve the Health Check Prompt

After analyzing the reports, evaluate the health-check-prompt itself:

- **Missing data:** Was any information needed for diagnosis not captured by the commands? Add new commands.
- **Ambiguous output:** Did agents interpret command output differently? Add clarifying notes.
- **Format drift:** Did the agents produce inconsistently formatted reports? Tighten the format rules.
- **Diagnostic table gaps:** Are there symptoms in the reports not covered by the table? Add rows.
- **ANSI leakage:** Did raw escape codes appear in output? Ensure commands pipe through ANSI stripping.

Edit `skills/health-check-prompt/SKILL.md` with any improvements.

### Step 6: Deliver Next Steps

**Goal:** The consumer repo should produce a clean health report — every section PASS, zero warnings, zero failures. Next steps exist only to close the gap between the current report and that goal.

Always end your response to the user with a structured summary using this format:

```
## Health Check Review

### Issues Found

| # | Issue | Classification | Status |
|---|-------|---------------|--------|
| 1 | <short description> | Bug / Version skew / Consumer action / Prompt improvement | Fixed / Needs consumer action |

### Actions Taken (this repo)

1. <what was fixed, which file, which commit>
2. ...

(or "None — no bugs found.")

### Next Steps — Skills Repo

1. <remaining action with exact command>
2. ...

(or "None — all fixes committed and pushed.")

### Next Steps — Consumer Repo (<project name>)

If there are consumer repo actions, output them as a **single agent prompt** inside a fenced code block (quadruple backticks) that the user can copy-paste directly to an agent running in the consumer repo. The prompt must be self-contained — include all context, exact commands, and expected outcomes so the receiving agent can execute without further clarification.

**Ordering rules for the consumer prompt** — remediation steps must follow this sequence because each step depends on the previous one:

1. `./skills/bin/manage.sh sync` — update the submodule first so all subsequent commands use the latest manage.sh
2. `./skills/bin/manage.sh check` — auto-fix hooks, discovery dirs, and internal skill leaks using the updated code
3. Stage and commit — persist all auto-fixes (`git add .claude .agents skills && git commit`)
4. Manual fixes — anything `check` cannot auto-fix (e.g., CLAUDE.md/AGENTS.md content, missing skills section)
5. Stage and commit manual fixes
6. **Verification re-run** — always end the prompt with the full health check diagnostic (commands, format rules, and report template) from `skills/health-check-prompt/SKILL.md` so the agent produces a new report proving all sections PASS

**Template for the consumer prompt:**

````
<Context: what the health report found and what needs fixing>

Run the following steps IN ORDER. Do not skip or reorder steps.

## Step 1: Sync submodule to latest
./skills/bin/manage.sh sync

## Step 2: Run integrity check (auto-fixes hooks and discovery dirs)
./skills/bin/manage.sh check 2>&1 | sed 's/\x1b\[[0-9;]*m//g'

## Step 3: Commit auto-fixes
git add .claude .agents skills
git status
git diff --cached --stat
git commit -m "chore: sync skills and apply auto-fixes"

## Step 4: Manual fixes (if any)
<specific instructions for issues check cannot auto-fix, or "No manual fixes needed.">

## Step 5: Verify — re-run the full health check
<paste the full verification prompt from health-check-prompt SKILL.md: the "Commands to run" section, the "Report format" section (including format rules and the complete report template). The consumer agent does NOT have access to health-check-prompt — everything it needs to produce a correctly formatted report must be inlined here.>

Every section should now show PASS.
````

If the report was already clean (all PASS, no warnings), output:

```
None — report is clean. No consumer repo actions needed.
```
```

### Step 7: Commit and Push

After making all changes:

1. Run `bin/manage.sh link` to refresh discovery directories
2. Run `tests/test-identity.sh` to verify CLAUDE.md/AGENTS.md parity
3. Run `python3 tests/test_skills_spec.py` to verify spec compliance
4. Commit with a descriptive message
5. Push to the working branch

## Common Patterns

These recurring findings and their typical resolutions save diagnosis time:

| Pattern | Root cause | Resolution |
|---------|-----------|------------|
| Submodule `+` prefix in status | Consumer ran `sync`/`check` but didn't commit the pointer update | Consumer: `git add skills && git commit` |
| Different SHAs across agents | Claude's SessionStart hook resets to recorded commit; Codex doesn't have this hook | Compare recorded vs actual — the hook explains the difference |
| Stale flat files (e.g. `.claude/skills/design-system.md`) | Old flat-file format predating directory-based copies | Latest `manage.sh link` cleans these automatically |
| Internal skills in discovery dirs | Old manage.sh copied before `internal: true` filtering | Latest `manage.sh check` removes them |
| ANSI codes in command output | Agent didn't strip terminal color escapes | Health-check-prompt commands pipe through `sed` for stripping |
| Different spec validation test counts | Older manage.sh versions run fewer tests | Expected — not a bug |
| check auto-syncs on one agent but not another | Auto-sync was added in a newer manage.sh version | Sync first, then re-run check |
| check reports PASS on stale discovery dirs | Old manage.sh has weaker content checks | Sync to get latest checks, then re-run |

## Gotchas

- **Circular fix dependencies.** A bug in manage.sh may cause `check` to produce bad output, which this skill then misdiagnoses. Always check the manage.sh version (section 7) before trusting `check` output — if it's old, the first recommendation should always be `manage.sh sync`.
- **Version skew masquerading as bugs.** Most discrepancies between Claude and Codex reports are version skew, not bugs. Check section 7 (manage.sh version) in both reports before filing anything as a bug. If versions differ, sync first and re-diagnose.
- **Consumer prompt must be self-contained.** The consumer agent does NOT have access to this skill or health-check-prompt. Every command, format rule, and template needed to produce a clean re-verification report must be inlined in the consumer prompt. Missing the report template is the most common omission.
- **Auto-fix output changes between runs.** `manage.sh check` auto-fixes issues as a side effect, so running it twice produces different output. When comparing reports, note whether `check` was run before or after a sync — the output is only meaningful in context.
- **Ephemeral Codex sessions.** Fixes applied in Codex sessions vanish unless committed. The consumer prompt must include explicit `git add` and `git commit` steps after every fix phase, not just at the end.
