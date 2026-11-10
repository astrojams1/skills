---
name: health-check-review
internal: true
description: >-
  Process health check reports from consumer repos. Use when the user pastes
  a health check report, asks to diagnose a consumer repo integration, or
  wants to review skills integration issues. Analyzes report data, finds
  bugs in manage.sh or skills code, suggests improvements to the
  health-check-prompt, and gives step-by-step next steps.
metadata:
  version: "1.2.0"
---

# Health check review

**Turn pasted health reports into fixes in this repo and clear next steps for the consumer repo.** The goal is a clean
report from the consumer repo: every section PASS, zero warnings, zero failures. Next steps exist only to close the gap
between the current report and that goal.

Done means: every finding is classified, and bugs here are fixed and tested. The prompt is better where the reports
showed a gap, and your reply ends with the summary in [Report](#report).

Start on your own when the owner pastes a Skills Health Report, or asks you to review or analyze one. Look for "Skills
Health Report" and numbered sections like "Submodule Registration", "Discovery Directories" and "manage.sh check".
Reports arrive in one fenced code block. Parse the markdown inside the fence.

## Where things are

| What | Where |
|---|---|
| The prompt, commands, report template and diagnostic table | `skills/health-check-prompt/SKILL.md` |
| The integration CLI, where most bugs live | `bin/manage.sh` |

## A run

1. **Parse** each report. If there are several, note which agent wrote each. Pull out:
   - **Agent type:** Claude or Codex
   - **Project name** (from the Project field)
   - **Submodule SHAs:** local (HEAD), remote (origin/main), recorded (git ls-tree)
   - **manage.sh version:** the commit hash from section 7
   - **Section verdicts:** PASS, WARN or FAIL for each numbered section
   - **Discovery dir contents:** file listings and diff output
   - **manage.sh check output:** including any auto-fix messages
   - **Spec validation results:** pass and fail counts
2. **Compare agents** when you have reports from more than one:

   | Dimension | What to check |
   |-----------|---------------|
   | Submodule SHA | Same commit? If not, did Claude's SessionStart hook reset to the recorded pointer? Look for a `+` prefix in Codex's status line. |
   | manage.sh version | Same commit in section 7? Version skew is the top cause of differences between agents. |
   | Discovery dirs | Same files? Stale flat files (`.md` at top level) in one but not the other? Internal skills present? |
   | check output | Did one auto-fix while the other only warned? Newer manage.sh versions added auto-sync. |
   | Spec validation | Same pass count? Older versions run fewer tests. That is expected, not a bug. |

3. **Classify** each finding as one of these:

   | Classification | Meaning | Where to act |
   |---------------|---------|--------------|
   | **Bug** | Code defect in manage.sh or a skill file | Fix in this repo |
   | **Version skew** | Old manage.sh lacks a feature or fix | Self-heals after the consumer runs `manage.sh sync` |
   | **Consumer action** | Needs manual steps in the consumer repo | Put in next steps |
   | **Prompt improvement** | Health-check-prompt should gather better data or give clearer orders | Edit `skills/health-check-prompt/SKILL.md` |

4. **Fix bugs.** For each **Bug**:
   1. Read the relevant source (usually `bin/manage.sh`).
   2. Find the root cause. Don't just patch the symptom.
   3. Fix the code.
   4. If the symptom isn't in the diagnostic table in `skills/health-check-prompt/SKILL.md`, add it.
   5. Run `tests/test-identity.sh` and `python3 tests/test_skills_spec.py`.
5. **Improve the prompt.** Judge the health-check-prompt against the reports, and edit
   `skills/health-check-prompt/SKILL.md` with each fix:
   - **Missing data:** Was anything needed for diagnosis not gathered by the commands? Add commands.
   - **Unclear output:** Did agents read command output differently? Add notes that settle it.
   - **Format drift:** Did agents format their reports differently? Tighten the format rules.
   - **Table gaps:** Do the reports show symptoms the diagnostic table lacks? Add rows.
   - **ANSI leaks:** Did raw escape codes appear in output? Make sure commands pipe through ANSI stripping.
6. **Commit and push.**
   1. Run `bin/manage.sh link` to refresh the discovery directories.
   2. Run `tests/test-identity.sh` to verify AGENTS.md exists and no CLAUDE.md does.
   3. Run `python3 tests/test_skills_spec.py` to verify spec compliance.
   4. Commit with a message that says what changed.
   5. Push to the working branch.
7. **Report** (see [Report](#report)). Always end your reply with it.

## Report

End every reply with this summary:

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
```

Under the last heading, put the consumer actions as **one agent prompt** in a fenced code block of four backticks. The
owner pastes it to an agent in the consumer repo. It must stand alone: give all context, exact commands and expected
results, so the agent can act without asking.

**Order the steps like this.** Each step depends on the one before.

1. `./skills/bin/manage.sh sync`. Update the submodule first, so every later command uses the latest manage.sh.
2. `./skills/bin/manage.sh check`. Auto-fix hooks, discovery dirs and internal skill leaks with the updated code.
3. Stage and commit, to keep every auto-fix (`git add .claude .agents skills && git commit`).
4. Manual fixes: anything `check` can't auto-fix (e.g. AGENTS.md content, removing a CLAUDE.md with `git rm`, a
   missing skills section).
5. Stage and commit the manual fixes.
6. **Verification re-run.** Always end the prompt with the full health check diagnostic from
   `skills/health-check-prompt/SKILL.md`: commands, format rules and report template. The agent then makes a new report
   that proves every section PASSes.

Use this template:

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

If the report was already clean (all PASS, no warnings), write this under the heading instead:

```
None — report is clean. No consumer repo actions needed.
```

## Common patterns

These findings recur. Their usual fixes save diagnosis time.

| Pattern | Root cause | Resolution |
|---------|-----------|------------|
| Submodule `+` prefix in status | Consumer ran `sync` or `check` but didn't commit the pointer update | Consumer: `git add skills && git commit` |
| Different SHAs across agents | Claude's SessionStart hook resets to the recorded commit. Codex has no such hook | Compare recorded and actual. The hook explains the difference |
| Stale flat files (e.g. `.claude/skills/design-system.md`) | Old flat-file format, from before directory-based copies | The latest `manage.sh link` cleans these up |
| Internal skills in discovery dirs | Old manage.sh copied them before `internal: true` filtering | The latest `manage.sh check` removes them |
| ANSI codes in command output | Agent didn't strip terminal color escapes | Health-check-prompt commands pipe through `sed` to strip them |
| Different spec validation test counts | Older manage.sh versions run fewer tests | Expected, not a bug |
| check auto-syncs on one agent but not another | A newer manage.sh version added auto-sync | Sync first, then re-run check |
| check reports PASS on stale discovery dirs | Old manage.sh has weaker content checks | Sync to get the latest checks, then re-run |

## Gotchas

- **Circular fix dependencies (2026-03-19).** A manage.sh bug can make `check` print bad output, which you then
  misdiagnose. Check the manage.sh version (section 7) before you trust `check` output. If it is old, recommend
  `manage.sh sync` first.
- **Version skew looks like a bug (2026-03-19).** Most differences between Claude and Codex reports are version skew.
  Check section 7 in both reports before you call anything a bug. If the versions differ, sync first and diagnose again.
- **The consumer prompt must stand alone (2026-03-19).** The consumer agent can't see this skill or
  health-check-prompt. Inline every command, format rule and template it needs for a clean re-verification report. The
  report template is the part most often left out.
- **Auto-fix output changes between runs (2026-03-19).** `manage.sh check` auto-fixes as a side effect, so a second run
  prints different output. When you compare reports, note whether `check` ran before or after a sync. The output only
  means something in that context.
- **Codex sessions are ephemeral (2026-03-19).** Fixes made in a Codex session vanish unless committed. The consumer
  prompt must have explicit `git add` and `git commit` steps after every fix phase, not just at the end.
