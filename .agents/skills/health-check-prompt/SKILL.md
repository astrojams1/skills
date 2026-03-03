---
name: health-check-prompt
internal: true
description: >-
  A diagnostic prompt for the skills repo author to give to Claude or Codex
  agents in consumer repos. The agent runs commands and inspects files, then
  returns a structured health report covering every aspect of the skills
  integration. Use when you need to verify a consumer repo's integration or
  debug issues remotely.
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

**Output rules:** Print everything between the `---START---` and `---END---` markers as a fenced code block so it is easy to copy. Do NOT tell the user to "copy from above" — the skill content is only in your context and is not visible to them.

## The Prompt

---START---

Run a full diagnostic of the skills integration in this repo and return a structured health report. Execute the commands below and collect their EXACT output. Do NOT paraphrase or summarize command output — include it verbatim. If a command fails, include the error message.

**CONSTRAINTS — read before doing anything:**
1. **Report only.** Do NOT commit, push, create PRs, or modify any files yourself.
2. `manage.sh check` (command 13) auto-fixes some issues as a side effect — that is expected behavior, not something you should do. Report its output verbatim.
3. After collecting all command output, return the structured report below and STOP.

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
./skills/bin/manage.sh check 2>&1

# 14. manage.sh status
./skills/bin/manage.sh status 2>&1

# 15. Spec validation
python3 ./skills/tests/test_skills_spec.py 2>&1 | tail -20
```

### Report format

Return the report using EXACTLY this structure. Fill in each section with the verbatim command output. Use `PASS`, `WARN`, or `FAIL` for each verdict.

```
## Skills Health Report

**Project:** <output of command 1>
**Date:** <current date>
**Agent:** <Claude or Codex>

### 1. Submodule Registration
- **Verdict:** <PASS|FAIL>
- **URL:** <output of .gitmodules url>
- **Branch tracking:** <output of .gitmodules branch>
- **Status line:** <output of git submodule status>
- **Recorded commit:** <output of git ls-tree HEAD skills>

### 2. Submodule Version
- **Verdict:** <PASS|WARN — behind N commits|FAIL>
- **Local SHA:** <HEAD sha>
- **Remote SHA:** <origin/main sha>
- **Commits behind:** <count>

### 3. Submodule Cleanliness
- **Verdict:** <PASS|WARN|FAIL>
- **Modified files:** <list or "none">
- **Untracked files:** <list or "none">

### 4. Discovery Directories
- **Verdict:** <PASS|FAIL>
- **.claude/skills/ files:** <file listing>
- **.agents/skills/ files:** <file listing>
- **Committed to VCS:** <yes/no, with git ls-files output>
- **Content match vs source:** <diff output or "all match">

### 5. SessionStart Hook
- **Verdict:** <PASS|WARN — old format|FAIL — missing>
- **settings.json contents:** <full JSON>

### 6. Agent Instruction Files
- **Verdict:** <PASS|WARN|FAIL>
- **CLAUDE.md exists:** <yes/no>
- **AGENTS.md exists:** <yes/no>
- **Identical:** <IDENTICAL or DIFFER>
- **Skills section present:** <yes/no, with grep output>

### 7. manage.sh version
- **Last commit touching manage.sh:** <output of command 12>

### 8. manage.sh check
- **Verdict:** <PASS|WARN|FAIL>
- **Full output:**
<verbatim output of manage.sh check>

### 9. manage.sh status
- **Full output:**
<verbatim output of manage.sh status>

### 10. Spec Validation
- **Verdict:** <PASS|FAIL>
- **Output:** <verbatim tail of test output>

### 11. Summary
- **Overall:** <ALL PASS | N issues found>
- **Action items:** <numbered list of anything that needs fixing, or "none">
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
| manage.sh check behaves differently across agents | Agents are running different manage.sh versions because submodule is at different commits | Sync submodule first (`manage.sh sync`), then re-run diagnostic |
