# uncommitted-work: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in
`/Volumes/ssd/projects/uncommitted-work/reports/` and the owner's activity ledger, never here.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-07 | Initial skill: repo-wide scan, backups, guarded close, triage rules | The owner asked for a weekly cleanup of uncommitted work to pair with `abandoned-prs` |
| 1.0.1 | 2026-11-07 | `close` removes untracked files before resetting and sees junk inside untracked folders; Füd's repository is in scope | The first real run deleted a tracked file on one checkout (restored), and refused one scratch folder |
| 1.1.0 | 2026-11-10 | The weekly task's stored prompt is a pointer, written here; a stale prompt is reported | Prompt copies on the Mac drifted from the skills before (app-marketing kept a three-item budget after the skill dropped it) |
| 1.2.0 | 2026-11-10 | A run fixes what it finds; the report lists anything left open with its blocker. "Never end by asking" and reading `/Users/astro/AGENTS.md` moved here from the old prompt | James: a run that notes an issue and leaves it is being lazy |
| 1.3.0 | 2026-11-10 | Rewritten in the house style from `skill-writing`; no behavior change. The run rules block replaces the skill's own copies of those rules, and the report names what is left open. Same structure as its pair skill | The owner asked that every skill read as one author wrote it, plainly |

## Lessons

- 2026-11-07: Of 59 dirty checkouts in the first audit, 33 held only `node_modules` or `.DS_Store`. Separate those first, or the real work is lost in the noise.
- 2026-11-07: Scanning the code folder alone missed most of the work. Worktrees live in app and Codex folders outside it, so the scan follows `git worktree list`.
- 2026-11-07: A dirty patch can be the HEAD commit in reverse, when HEAD moved past a tree left behind. Never apply a backup to main as it stands: compare the checkout's files with main, by content.
- 2026-11-07: Passing tests in a fresh worktree need its submodules initialized. Eight false failures came from `vendor/skills` being empty.
- 2026-11-07: A worktree's branch can hold local-only commits. `close` leaves them, and the report should name them.
