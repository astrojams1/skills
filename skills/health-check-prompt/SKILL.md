---
name: health-check-prompt
internal: true
description: >-
  A diagnostic prompt for the skills repo author to give to Claude or Codex
  agents in consumer repos. The agent runs commands and inspects files, then
  returns a structured health report covering every part of the skills
  integration. Use when you need to verify a consumer repo's integration or
  debug issues remotely.
metadata:
  version: "1.2.0"
---

# Health check prompt

**Hand the owner a prompt that makes an agent in a consumer repo report on its skills integration.** The report has a
fixed shape, so it is quick to diagnose.

Done means: the whole prompt is on screen in one block the owner can copy.

Use it after the first `manage.sh install`, and after `manage.sh sync` to confirm the update landed. Use it when a
consumer repo says skills are missing or stale, and at the start of a support session for a baseline.

## A run

1. **Output the prompt at once.** When the owner mentions running a health check, diagnosing a consumer repo or
   checking a skills integration, print the full prompt. Don't wait to be asked. The point is to hand it over fast.
2. **Use one block.** Print everything between `---START---` and `---END---` inside one fenced code block made of
   **four backticks**. The owner then copies the whole prompt in one action, and the inner three-backtick fences still
   render.
3. **Read the report** with [Reading the report](#reading-the-report). For a full review and fixes, use
   `health-check-review`.

## Rules

- **Never say "copy from above".** The skill is only in your context. The owner can't see it.

## The prompt

---START---

Run a full diagnostic of the skills integration in this repo and return a structured health report. Run the commands
below and collect their EXACT output. Do NOT paraphrase or summarize command output. Include it verbatim. If a command
fails, include the error message.

**CONSTRAINTS. Read these before you do anything:**
1. **Report only.** Do NOT commit, push, create PRs or change any files yourself.
2. `manage.sh check` (command 13) auto-fixes some issues as a side effect. That is expected, not something you should
   do. Report its output verbatim.
3. After you collect all command output, return the report below and STOP.

**FORMAT RULES. Follow these exactly when you write the report:**
1. **One block:** Wrap the **entire** report in one fenced code block, with triple backticks and the `markdown` tag.
   The user can then copy it in one action.
2. Inside the report, use GitHub-flavored markdown: `**bold**` (not `__bold__`), and `-` for list items.
3. Use `##` for the report title and `###` for each numbered section, exactly as the template shows.
4. Use `- **Key:** value` for one-line data items.
5. Indent multi-line command output by 4 spaces. Don't use fenced code blocks: they can't nest inside the outer fence.
6. All command output must be verbatim after ANSI stripping. Never paraphrase, summarize or reformat it.
7. Commands 13 and 14 below already strip ANSI color codes. If you run any other command, strip it too:
   `command 2>&1 | sed 's/\x1b\[[0-9;]*m//g'`
8. If `git submodule status` output starts with `+` before the SHA, say so plainly. It means the checked-out commit
   differs from the pointer recorded in the parent repo.
9. Copy the template structure exactly. Do not rename, reorder or merge sections, and add no new ones.
10. In command 8's diff output, lines like `Only in skills/skills/: <name>` are **expected** for skills with
    `internal: true` in their SKILL.md frontmatter. Internal skills are never copied to discovery dirs. Don't count
    these as issues in the Discovery Directories verdict.

### Commands to run (run each one and capture the output)

```bash
# 1. Project identity
basename "$(git rev-parse --show-toplevel)"

# 2. Git submodule state (actual checkout vs recorded pointer)
git submodule status skills
git ls-tree HEAD skills

# 3. .gitmodules entry for skills
git config -f .gitmodules --get submodule.skills.url
git config -f .gitmodules --get submodule.skills.branch

# 4. Submodule remote comparison
git -C skills rev-parse HEAD
git -C skills fetch origin main --quiet 2>&1 && git -C skills rev-parse origin/main
git -C skills rev-list --count HEAD..origin/main 2>/dev/null || echo "N/A"

# 5. Local modifications in submodule
git -C skills diff --name-only
git -C skills ls-files --others --exclude-standard

# 6. Discovery directory listing
find .claude/skills -type f 2>/dev/null | sort
find .agents/skills -type f 2>/dev/null | sort

# 7. Discovery dirs committed to VCS (not just local)
git ls-files .claude/skills | head -30
git ls-files .agents/skills | head -30

# 8. Content match: discovery dirs vs submodule source
diff -rq skills/skills/ .claude/skills/ 2>&1 | head -20
diff -rq skills/skills/ .agents/skills/ 2>&1 | head -20

# 9. SessionStart hook
cat .claude/settings.json 2>/dev/null || echo "FILE NOT FOUND"

# 10. Agent instruction files
ls -la AGENTS.md 2>/dev/null || echo "AGENTS.md NOT FOUND"
ls -A | grep -ix 'claude\.md' && echo "CLAUDE.md PRESENT (must not exist)" || echo "CLAUDE.md ABSENT"

# 11. Skills section in AGENTS.md
grep -n -i "skills" AGENTS.md 2>/dev/null | head -20

# 12. manage.sh version (which code is actually running)
git -C skills log --oneline -1 -- bin/manage.sh

# 13. manage.sh check (the main integrity check — auto-fixes as side effect)
./skills/bin/manage.sh check 2>&1 | sed 's/\x1b\[[0-9;]*m//g'

# 14. manage.sh status
./skills/bin/manage.sh status 2>&1 | sed 's/\x1b\[[0-9;]*m//g'

# 15. Spec validation
python3 ./skills/tests/test_skills_spec.py 2>&1 | tail -20

# 16. Recent consumer repo commits (situational awareness for reviewer)
git log --oneline -10
```

### Report format

Return the report in EXACTLY this structure. Copy the headers and bullet format character for character. Replace only
the `<...>` placeholders with real data. Use `PASS`, `WARN` or `FAIL` for each verdict.

For items marked `<verbatim ...>`, include the raw command output indented by 4 spaces. Do NOT use fenced code blocks,
since the whole report is already inside one fence. For one-value items, put the value on the same line after the colon.

```
## Skills Health Report

**Project:** <output of command 1>
**Date:** <YYYY-MM-DD>
**Agent:** <Claude or Codex>

### 1. Submodule Registration
- **Verdict:** <PASS if url and branch are set, FAIL otherwise>
- **URL:** <output of .gitmodules url>
- **Branch tracking:** <output of .gitmodules branch>
- **Status line:** <full output of git submodule status — note if line starts with + or ->
- **Recorded commit:** <output of git ls-tree HEAD skills>

### 2. Submodule Version
- **Verdict:** <PASS if up-to-date | WARN — behind N commits>
- **Local SHA:** <full 40-char HEAD sha>
- **Remote SHA:** <full 40-char origin/main sha>
- **Commits behind:** <integer>

### 3. Submodule Cleanliness
- **Verdict:** <PASS if both empty | WARN or FAIL otherwise>
- **Modified files:** <file list or "none">
- **Untracked files:** <file list or "none">

### 4. Discovery Directories
- **Verdict:** <PASS if all match | FAIL if missing, stale, or extra files>
- **.claude/skills/ files:**
<verbatim file listing from find, one path per line>
- **.agents/skills/ files:**
<verbatim file listing from find, one path per line>
- **Committed to VCS:** <yes/no>
<verbatim git ls-files output>
- **Content match vs source:**
<verbatim diff -rq output, or "all match" if no differences>

### 5. SessionStart Hook
- **Verdict:** <PASS if correct nested format | WARN — old format | FAIL — missing>
- **settings.json contents:**
<verbatim JSON from cat .claude/settings.json>

### 6. Agent Instruction Files
- **Verdict:** <PASS if AGENTS.md exists with a skills section and no CLAUDE.md exists>
- **AGENTS.md exists:** <yes with ls -la output | no>
- **CLAUDE.md:** <CLAUDE.md ABSENT | CLAUDE.md PRESENT (must not exist)>
- **Skills section present:** <yes/no>
<verbatim grep output>

### 7. manage.sh version
- **Last commit touching manage.sh:** <output of command 12>

### 8. manage.sh check
- **Verdict:** <PASS | WARN — N warnings | FAIL>
- **Full output:**
<verbatim output of manage.sh check — already ANSI-stripped>

### 9. manage.sh status
- **Full output:**
<verbatim output of manage.sh status — already ANSI-stripped>

### 10. Spec Validation
- **Verdict:** <PASS | FAIL>
- **Output:**
<verbatim tail of test output>

### 11. Recent Activity
- **Last 10 commits:**
<verbatim git log output>

### 12. Summary
- **Overall:** <ALL PASS | N issues found (M auto-fixed)>
- **Action items:**
  1. <specific action with exact command, or "none">
```

---END---

## Reading the report

When the consumer agent returns the report, check it against this table. `health-check-review` adds a row here for each
new symptom it finds.

| Symptom | Likely cause | Fix |
|---|---|---|
| Submodule FAIL, not registered | `manage.sh install` was never run | Run `manage.sh install .` |
| Commits behind > 0 | Submodule not synced recently | Run `manage.sh sync` |
| Modified files in submodule | Someone edited skills locally | `git -C skills checkout .` |
| Discovery dirs missing or not in VCS | `git add .claude .agents` was skipped | Run `manage.sh link`, then commit |
| Content mismatch in discovery dirs | Stale copies after a sync | Run `manage.sh link` |
| SessionStart hook missing or old format | Old install or manual settings edit | Run `manage.sh check` (auto-fixes) |
| CLAUDE.md present alongside AGENTS.md | Project predates the AGENTS.md-only rule | Merge anything unique into AGENTS.md, then `git rm CLAUDE.md` |
| CLAUDE.md exists but AGENTS.md missing | Project predates the AGENTS.md-only rule | `git mv CLAUDE.md AGENTS.md` |
| No "Skills" section in AGENTS.md | Step 5 of skill-orchestrator was skipped | Add the agent-instructions template |
| Spec validation fails | Corrupted submodule content | Run `manage.sh sync` or `reinstall` |
| `check` warns but doesn't auto-sync (or reports "Missing skill file .claude/skills/\<name\>.md" with a flat path) | Submodule is far behind. It runs an old manage.sh with no auto-sync and no directory-based checks | Run `manage.sh sync` first to get the latest tools, then re-run `check` |
| Internal skill (e.g. health-check-prompt) in consumer discovery dirs | Old manage.sh copied it before `internal: true` filtering existed | Run `manage.sh check` (the latest version removes internal skills) |
| Claude and Codex report different submodule SHAs on the same checkout | Claude's SessionStart hook ran `git submodule update` before the diagnostic, moving the submodule to the recorded commit | Compare "Recorded commit" (git ls-tree) with "Status line". If they match, the hook already ran |
| `manage.sh status` lists internal skills (e.g. health-check-prompt) as available | Old manage.sh lacked `internal: true` filtering in `status` | Run `manage.sh sync` to get the latest version, then re-run `status` |
| manage.sh check behaves differently across agents | Agents run different manage.sh versions because the submodule is at different commits | Sync the submodule first (`manage.sh sync`), then re-run the diagnostic |
| `manage.sh status` shows `>-` or `>- >-` instead of skill descriptions | Old manage.sh doesn't strip YAML block scalar markers (`>-`, `\|`) from descriptions | Run `manage.sh sync` to get the fix |
| `check` reports PASS on discovery dirs despite content mismatches in the diff output | Old manage.sh only checked that files exist, not that content matches | Run `manage.sh sync` to get the latest check logic, then re-run `check` |
| `check` auto-fixes discovery dirs but the submodule is behind (discovery dirs downgraded) | Old manage.sh lacks auto-sync. It sees stale discovery dirs and refreshes them from the old submodule, replacing newer committed content with older versions | Run `manage.sh sync` first to update the submodule, then re-run `check` |
| Submodule `+` prefix and old manage.sh version, though the recorded pointer is current | An ephemeral environment (e.g. Codex) started with the submodule at the wrong commit. Old manage.sh can't auto-sync (chicken and egg) | Run `git submodule update --init --recursive` first, or sync to the latest manage.sh, which resets to the recorded pointer during `check` |
| SessionStart hook initializes but doesn't auto-sync (hook command ends with `manage.sh link` and has no fetch or update step) | Old hook format. It initializes to the recorded pointer and refreshes skill files, but never checks for upstream updates | Run `manage.sh check` to auto-fix the hook, or `manage.sh sync` to update both the submodule and the hook |
| Codex fix commands succeed but the next session shows the same issues | Codex sessions are ephemeral, so working tree fixes vanish unless committed. `git submodule update` fixes the working tree but makes no diff when the index already records the right pointer | Change the consumer AGENTS.md Codex line to `git submodule update --init --recursive && ./skills/bin/manage.sh check` (see the agent-instructions template) |

## Gotchas

- **Agents paraphrase command output (2026-03-19).** The prompt says "verbatim", but agents still summarize. If a
  report is missing data, check whether the agent left out output it thought unimportant. Keep the stress on verbatim
  output when you edit the prompt.
- **ANSI codes leak through (2026-03-19).** Commands 13 and 14 strip ANSI, but agents sometimes run extra commands
  without stripping. Any command you add to the prompt must end with `2>&1 | sed 's/\x1b\[[0-9;]*m//g'`.
- **Agents merge or rename report sections (2026-03-19).** This makes reports harder to parse. Compare section headers
  character for character when you review a report.
- **Internal skills get flagged as issues (2026-03-19).** `diff -rq` shows `Only in skills/skills/: <name>` for
  internal skills. Format rule 10 says these are expected, but agents and reviewers still flag them. Check the table
  above before you escalate.
- **The submodule `+` prefix is misread (2026-03-19).** Agents see `+` in `git submodule status` and report FAIL. It
  only means the checked-out commit differs from the recorded pointer, often because a sync wasn't committed. Format
  rule 8 covers this, but it is easy to miss.
