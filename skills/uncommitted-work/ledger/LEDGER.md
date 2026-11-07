# uncommitted-work: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in
`/Volumes/ssd/projects/uncommitted-work/reports/` and the owner's activity ledger, never here.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-07 | Initial skill: repo-wide scan, backups, guarded close, triage rules | The owner asked for a weekly cleanup of uncommitted work to pair with `abandoned-prs` |
| 1.0.1 | 2026-11-07 | `close` removes untracked files before resetting and sees junk inside untracked folders; Füd's repository is in scope | The first real run deleted a tracked file on one checkout (restored), and refused one scratch folder |

## Lessons

- 2026-11-07: Of 59 dirty checkouts in the first audit, 33 held only `node_modules` or `.DS_Store`. Separate those first, or the real work is lost in the noise.
- 2026-11-07: Scanning the code folder alone missed most of the work. Worktrees live in app and Codex folders outside it, so the scan follows `git worktree list`.
- 2026-11-07: A dirty patch can be the HEAD commit in reverse, when HEAD moved past a tree left behind. Never apply a backup to main as it stands: compare the checkout's files with main, by content.
- 2026-11-07: Passing tests in a fresh worktree need its submodules initialized. Eight false failures came from `vendor/skills` being empty.
- 2026-11-07: A worktree's branch can hold local-only commits. `close` leaves them, and the report should name them.
