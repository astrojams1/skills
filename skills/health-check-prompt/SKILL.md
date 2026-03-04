---
name: health-check-prompt
internal: true
description: >-
  A diagnostic prompt for the skills repo author to give to Claude or Codex
  agents in consumer repos. The agent runs commands and inspects files, then
  returns a structured health report covering every aspect of the skills
  integration. Use when you need to verify a consumer repo's integration or
  debug issues remotely.
metadata:
  version: "1.0"
---

# Skill: Health Check Prompt

This skill provides a copy-paste prompt for diagnosing the skills integration in any consumer repo. Give the prompt to a Claude or Codex agent running in the consumer repo. The agent will gather data and return a structured report you can use to identify issues.

## When to Use

- After initial `manage.sh install` to verify everything is wired correctly
- When a consumer repo reports skills not loading or being stale
- At the start of a support session to get a baseline
- After a `manage.sh sync` to confirm the update landed

## Agent Instructions

**Proactive trigger:** If the user mentions running a health check, diagnosing a consumer repo, or checking a skills integration — immediately output the full prompt below. Do NOT wait for them to explicitly ask for it. The whole point of this skill is to hand over the prompt quickly so the user can paste it into the consumer repo agent.

**Output rules:** Print everything between the `---START---` and `---END---` markers inside a single fenced code block using **quadruple backticks** (i.e., four backtick characters) so the user can copy the entire prompt in one action. The inner triple backticks will render correctly inside the quadruple-backtick fence. Do NOT tell the user to "copy from above" — the skill content is only in your context and is not visible to them.

## The Prompt

---START---

Run a full diagnostic of the skills integration in this repo and return a structured health report. Execute the commands below and collect their EXACT output. Do NOT paraphrase or summarize command output — include it verbatim. If a command fails, include the error message.

**CONSTRAINTS — read these before doing anything:**
1. **Report only.** Do NOT commit, push, create PRs, or modify any files yourself.
2. `manage.sh check` (command 13) auto-fixes some issues as a side effect — that is expected behavior, not something you should do. Report its output verbatim.
3. After collecting all command output, return the structured report below and STOP.

**FORMAT RULES — follow these exactly when writing the report:**
1. **Single block output:** Wrap the **entire** report in a single fenced code block (triple backticks with `markdown` language tag) so the user can copy it in one action.
2. Inside the report use standard GitHub-flavored markdown: `**bold**` (not `__bold__`), `-` for list items.
3. Use `##` for the report title and `###` for each numbered section — exactly as shown in the template.
4. Use `- **Key:** value` for single-line data items.
5. Indent multi-line command output by 4 spaces instead of using fenced code blocks (fenced code blocks cannot nest inside the outer fence).
6. All command output must be verbatim after ANSI stripping — never paraphrase, summarize, or reformat.
7. Commands 13 and 14 below already strip ANSI color codes. If you run any additional commands, strip them too: `command 2>&1 | sed 's/\x1b\[[0-9;]*m//g'`
8. If `git submodule status` output starts with `+` before the SHA, note this explicitly — it means the checked-out commit differs from the recorded pointer in the parent repo.
9. Copy the template structure exactly. Do not rename sections, reorder them, merge them, or add extra sections.
10. In command 8 diff output, entries like `Only in skills/skills/: <name>` for skills that have `internal: true` in their SKILL.md frontmatter are **expected** — internal skills are intentionally not copied to discovery dirs. Do not count these as issues in the Discovery Directories verdict.

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
ls -la CLAUDE.md AGENTS.md 2>/dev/null
cmp -s CLAUDE.md AGENTS.md && echo "IDENTICAL" || echo "DIFFER"

# 11. Skills section in CLAUDE.md
grep -n -i "skills" CLAUDE.md 2>/dev/null | head -20

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

Return the report using EXACTLY this structure. Copy the headers and bullet format character-for-character, only replacing `<...>` placeholders with actual data. Use `PASS`, `WARN`, or `FAIL` for each verdict.

For items marked `<verbatim ...>`, include the raw command output indented by 4 spaces (NOT in fenced code blocks — the entire report is already inside a single fence). For single-value items, put the value on the same line after the colon.

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
- **Verdict:** <PASS if both exist, identical, and have skills section>
- **CLAUDE.md exists:** <yes with ls -la output | no>
- **AGENTS.md exists:** <yes with ls -la output | no>
- **Identical:** <IDENTICAL or DIFFER>
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

## Reading the Report

When the consumer agent returns the report, check for these common issues:

| Symptom | Likely cause | Fix |
|---|---|---|
| Submodule FAIL — not registered | `manage.sh install` was never run | Run `manage.sh install .` |
| Commits behind > 0 | Submodule not synced recently | Run `manage.sh sync` |
| Modified files in submodule | Someone edited skills locally | `git -C skills checkout .` |
| Discovery dirs missing or not in VCS | `git add .claude .agents` was skipped | Run `manage.sh link` then commit |
| Content mismatch in discovery dirs | Stale copies after a sync | Run `manage.sh link` |
| SessionStart hook missing/old format | Old install or manual settings edit | Run `manage.sh check` (auto-fixes) |
| CLAUDE.md and AGENTS.md differ | Manual edit to only one file | Copy one to the other |
| No "Skills" section in CLAUDE.md | Step 5 of skill-orchestrator was skipped | Add agent-instructions template |
| Spec validation fails | Corrupted submodule content | Run `manage.sh sync` or `reinstall` |
| `check` warns but doesn't auto-sync (or reports "Missing skill file .claude/skills/\<name\>.md" with flat path) | Submodule is far behind; running an old manage.sh that lacks auto-sync and directory-based checks | Run `manage.sh sync` first to get the latest tools, then re-run `check` |
| Internal skill (e.g. health-check-prompt) in consumer discovery dirs | Old manage.sh copied it before `internal: true` filtering existed | Run `manage.sh check` (latest version removes internal skills automatically) |
| Claude and Codex report different submodule SHAs on same checkout | Claude's SessionStart hook ran `git submodule update` before diagnostic, changing the submodule to the recorded commit | Compare "Recorded commit" (git ls-tree) with "Status line" — if they match, the hook already ran |
| `manage.sh status` lists internal skills (e.g. health-check-prompt) as available | Old manage.sh lacked `internal: true` filtering in the status command | Run `manage.sh sync` to get the latest version, then re-run `status` |
| manage.sh check behaves differently across agents | Agents are running different manage.sh versions because submodule is at different commits | Sync submodule first (`manage.sh sync`), then re-run diagnostic |
| `manage.sh status` shows `>-` or `>- >-` instead of skill descriptions | Old manage.sh description extraction doesn't strip YAML block scalar indicators (`>-`, `|`) | Run `manage.sh sync` to get the fix |
| `check` reports PASS on discovery dirs despite content mismatches in diff output | Old manage.sh used existence-only checks, not diff-based content verification | Run `manage.sh sync` to get the latest check logic, then re-run `check` |
| `check` auto-fixes discovery dirs but submodule is behind (discovery dirs downgraded) | Old manage.sh lacks auto-sync; it detects stale discovery dirs and refreshes them from the outdated submodule, replacing newer committed content with older versions | Run `manage.sh sync` first to update the submodule, then re-run `check` |
| Submodule `+` prefix and old manage.sh version despite recorded pointer being current | Ephemeral environment (e.g. Codex) started with submodule at wrong commit; old manage.sh can't auto-sync (chicken-and-egg) | Run `git submodule update --init --recursive` first, or sync to latest manage.sh which auto-resets to recorded pointer during `check` |
| SessionStart hook initializes but doesn't auto-sync (hook command ends with `manage.sh link` without a fetch/update step) | Old hook format that only initializes to recorded pointer and refreshes skill files, but never checks for upstream updates | Run `manage.sh check` to auto-fix the hook, or `manage.sh sync` to update both the submodule and the hook |
| Codex fix commands succeed but next session shows same issues | Codex sessions are ephemeral — working tree fixes don't persist unless committed; `git submodule update` fixes the working tree but produces no diff when the index already records the correct pointer | Update consumer AGENTS.md Codex instruction to `git submodule update --init --recursive && ./skills/bin/manage.sh check` (see agent-instructions template) |
