# Changing the release process: where a change belongs

Every app's release runs on this shared skill plus a thin repository skill. When the owner asks for a change
to "the release skill", "the app store submission process" or anything these skills do — or a run teaches
something worth keeping — decide where it belongs **before editing**, every time, and say which you chose
and why.

## Decide

| The change is… | It belongs in | Examples |
|---|---|---|
| True of every app on these stores | **This skill** (skills repository, `skills/app-release/`) | A new Apple or Google rule or API behavior, a script bug or feature, a safer default, a gate, ledger format, approval policy, a gotcha that cost a retry |
| True of one kind of app | **This skill**, in [app types](app-types.md) | A rule for games, news apps, kids apps, paid downloads |
| A fact or choice of one app | **The app repository**: `app-release.config.json`, the store data, or its repository skill | IDs, vault item names, copy, screenshots, price, its extra gates, the owner's preference for that app |
| Both | Split it: the general part here, the app's part there, in two pull requests that link each other | "Hold Play commits while Newsworthy's rejection stands" → `--hold` here; the current hold in Newsworthy's ledger. A root-caused rejection → the check that stops the next app here (`submit` refuses a Kids Category app whose notes skip Guideline 1.3); the answer in Giraffe Stretch's review notes |

When unsure, ask: would the next app need this? If yes, it goes here. An owner preference stated about one
app stays with that app unless the owner says it applies to all of them.

## Change this skill

1. **Edit the source, never a copy.** The source is `skills/app-release/` in the skills repository
   (`astrojams1/skills`; on the owner's Mac `/Volumes/ssd/code/skills`). Never edit `.claude/skills/`,
   `.agents/skills/` or the app repository's `skills/` submodule checkout in place: submodule edits are lost
   on the next sync, and discovery copies are regenerated.
2. Work on a branch in the skills repository and follow its `AGENTS.md`: a script change comes with a test
   in `tests/app-release/`; run `node --test tests/app-release/*.test.mjs`, `python3
   tests/test_skills_spec.py`, `bash tests/test-identity.sh` and `bash tests/test-manage.sh`; run
   `bin/manage.sh link`; bump `metadata.version` (patch for wording and fixes, minor for a new command or
   gate, major for a format change apps must migrate to); add a sanitized row or lesson to
   [the skill ledger](../ledger/LEDGER.md).
3. **Check every app that uses it.** Search the consumer repositories (on the owner's Mac, folders under
   `/Volumes/ssd/code` with `app-release.config.json`) for anything the change affects: config fields,
   store data fields, commands their repository skills or docs name. A breaking change ships with the
   migration for each app, or waits.
4. Open the pull request (with the owner's approval to push). After it merges, update each app's submodule
   pointer (`git -C <submodule> fetch origin main && git -C <submodule> checkout origin/main`, where the
   submodule is `skills/` or `vendor/skills/`, or `./skills/bin/manage.sh sync`) in that app's own pull request, and run a read-only command there
   (`asc.mjs status`, `android-release.mjs tracks`, `ledger.mjs status`) to confirm it still works.
5. If the skills repository cannot be changed in this session, make no local workaround that hides the gap:
   record the proposed change as a next action in the app's ledger (`ledger.mjs record --gate
   skill.app-release …`) and tell the owner.

## Staying current

`ledger.mjs status`, the first command of every run, fetches the skills repository's main and warns when the
copy it runs from is behind. Update the submodule in the app repository (its own small pull request) before a
release relies on the newer behavior. Repositories that ran `manage.sh install` also sync it at session
start.

## Change an app's repository skill

Keep it thin: facts, choices and gates only that app has. If you find yourself writing a procedure, a
command's behavior or a store rule there, it belongs here instead. If an app's skill contradicts this skill,
fix whichever is wrong; do not leave both.

## Report

Say where each part of the change landed (pull request links), why there, which other apps it affects, and
what still needs merging or a submodule bump before the apps run the new behavior.
