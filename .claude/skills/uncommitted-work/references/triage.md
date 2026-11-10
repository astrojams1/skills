# Triage

Judge each group of files on its own: one checkout often holds a real fix beside
scratch output. Compare with the current default branch, by content.

## Decide

**Leave** if any of these is true. Save the decision and report it.

- A live session, running job or recent activity is using it.
- The owner parked it deliberately, or the repository requires their approval.
- It raises running costs or capacity, or changes pricing, billing, secrets,
  access control or data migrations, without the owner's approval.
- It's a performance claim with no measurement, in a repository that only merges
  what measures better.
- You can't tell what it is or whether it matters. Thin evidence means leave.

**Close** if you can prove one of these:

- **Landed:** the same change is on the default branch. Check with
  `git log origin/main -S 'a distinctive line'` or compare the hunk.
- **Superseded:** later work replaced it. Name it.
- **Generated:** build output, discovery copies, submodule pointer drift, caches,
  logs, or captures that can be regenerated.
- **Scratch:** debug edits, a throwaway experiment, or rejected evidence.

**Merge** if it's real work, missing from the default branch, and still makes sense
there. A ledger row or lesson recording something true counts, as long as the
repository keeps that kind of record.

## Ship

1. Make a worktree from the fresh default branch under
   `/Volumes/ssd/projects/uncommitted-work/worktrees/`, on a branch named
   `local/<short-description>`. Never use the old, stale base.
2. Bring over only the files that passed triage. Re-create the change if the
   surrounding code has moved. Never paste an old file over a newer one.
3. Read the whole diff. Confirm there are no conflict markers
   (`git grep -nE '^(<<<<<<<|=======|>>>>>>>)( |$)'`) and that no secrets or personal
   data came along. Run the repository's tests on its pinned runtime.
4. Open a PR that says where the work came from and why it's still wanted. Follow
   the repository's `AGENTS.md`, attribution rules included.
5. Merge only with every configured check green on the exact head, review
   satisfied and repository rules met: `gh pr merge N --merge --match-head-commit SHA`,
   or the method the repository requires. Never `--admin`, never GitHub auto-merge.
6. Confirm it reached the default branch, then read the result of anything the merge
   started. If a deploy fails, report it. Don't deploy or revert on your own.
7. Only then `close` the original checkout. If a PR can't merge, leave the checkout
   and report the PR, which `abandoned-prs` will pick up later.

One PR per coherent change. Several checkouts with the same change become one PR.

## Stashes

Triage each one like a checkout. When one is proven safe to close, after
`archive-stashes`, find its current number by SHA and drop only that one:
`git stash list --format='%H %gd'`, then `git stash drop 'stash@{N}'`.
