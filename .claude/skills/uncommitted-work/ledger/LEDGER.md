# uncommitted-work: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-run facts live in
`/Volumes/ssd/projects/uncommitted-work/reports/` and the owner's activity ledger, never here.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-07 | Initial skill: repo-wide scan, backups, guarded close, triage rules | The owner asked for a weekly cleanup of uncommitted work to pair with `abandoned-prs` |

## Lessons

- 2026-11-07: Of 59 dirty checkouts in the first audit, 33 held only `node_modules` or `.DS_Store`. Separate those first, or the real work is lost in the noise.
- 2026-11-07: Scanning the code folder alone missed most of the work. Worktrees live in app and Codex folders outside it, so the scan follows `git worktree list`.
