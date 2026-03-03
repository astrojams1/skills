---
name: health-check-review
internal: true
description: >-
  Process health check reports from consumer repos. Analyzes report data,
  identifies bugs in manage.sh or skills code, suggests improvements to the
  health-check-prompt, and provides step-by-step next steps for both the
  skills repo and the consumer repo.
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

1. <step with exact command to run>
2. <step with exact command to run>
...
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
