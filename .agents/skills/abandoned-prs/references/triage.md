# Triage

## Decide

**Wait** if any of these is true. Save the decision and report it.

- The owner placed a hold, or the repository requires their approval.
- It raises running costs or capacity, or changes pricing, billing, secrets,
  access control or data migrations, and the owner has not approved that.
- It would need a store submission, release or manual deploy to mean anything.
- It claims a benefit that has never been measured, and the repository only
  merges what measures better. Run the measurement only if it's cheap and allowed.
- It has an ongoing purpose, such as a staging or load-test PR.
- You can't tell what it was for, or who still wants it.

**Close** if you can prove one of these against the current default branch:

- **Landed:** every meaningful change is already there. Name the commit or PR.
- **Superseded:** a later change replaced it. Name that change.
- **Obsolete:** the code it changes no longer exists or is no longer used.
- **Unsuitable:** measurements show no gain, or the idea failed and fixing it
  would mean a new design.

**Merge** if it still has value on today's default branch and everything under
[Merge](#merge) can be met. Being stale is not a reason to close: most abandoned
PRs here only needed conflicts fixed and review findings answered.

## Close

Comment first, then `gh pr close` without `--delete-branch`. Say why, name the
replacement if there is one, and say the branch is kept. Every claim must be one
you checked just now. "It's on main" means you found the file or row on main; if
anything worthwhile survives only on the branch, say that too. If you get a claim
wrong, post a correction.

## Fix

Work from a new worktree on the PR's branch.

- Merge the default branch in. Don't rebase shared history.
- When resolving conflicts, keep both sides' intent. Versions and ledger rows move
  forward: renumber rather than overwrite, and never rewrite a historic row.
- A scripted resolution must use `set -e`. Before every push, confirm there are no
  conflict markers: `git grep -nE '^(<<<<<<<|=======|>>>>>>>)( |$)'`.
- Answer every review finding, including bot findings. Fix it, or reply with
  evidence that it's wrong.
- Use the repository's own test setup and pinned runtime. A failure on the wrong
  Node version is not a real failure, so check before blaming the code or saying so
  in a comment.

## Merge

All of these must be true at the moment of merging:

- Every required and configured check is green on the exact head SHA, including
  any suite that only runs on a label. If CI doesn't run the tests, the full local
  tests pass on the merged result.
- Required review is satisfied, and no finding is left unanswered.
- The repository's own merge rules are followed, including merge method.
- The PR is still quiet: re-read the timeline just before merging.

Pin the merge: `gh pr merge N --merge --match-head-commit SHA`, or the method the
repository requires. Then confirm it's merged and the default branch contains it,
and read the result of anything the merge started. If a deploy fails, report it.
Don't deploy, roll back or revert on your own unless the repository's rules say to.

For a performance claim, report the size of the evidence. One paired run is one
paired run.
