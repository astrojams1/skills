---
name: <app>-app-release
description: Build, upload, submit and release <App> to the App Store and Google Play end to end, and keep its release ledger, by following the shared app-release skill with this app's facts. Use for App Store, TestFlight, App Review, Google Play, Play Console, store listing, store screenshots, store icon or release requests about <App>, or a request to change how its releases or this skill work, even when the skill is not named.
---

# <App> app release

Follow the shared skill at `skills/skills/app-release/SKILL.md` (the skills submodule) for the whole
process: credentials, local builds, App Store Connect and Play commands, owner-only steps, review and the
ledger. This file adds only what is true of <App>. When the two disagree about <App>, this file wins.

**Changing release instructions:** before editing this file, decide where the change belongs with the shared
skill's `references/maintaining.md`. Anything true of every app (a store rule, a script's behavior, a gate,
the ledger, a gotcha) goes to the shared skill in the skills repository, never here and never into the
`skills/` submodule checkout; only <App>'s own facts, choices and extra gates go here.

- Configuration: `app-release.config.json`; store data: `<path>`.
- Ledger: `<gates json>` (view `<view md>`); run log `<runs md>`.
- Kind of app: `<game|news|…>` — see the shared `references/app-types.md`.

## Facts

| Thing | Value |
|---|---|
| App Store Connect app | `<id>`, bundle `<id>`, team `<id>` |
| Google Play app | `<name>`, package `<id>` |
| Vault items | `op://API Tokens/App Store Connect`, `op://API Tokens/<App> Android` |
| Privacy and support pages | `<urls>` |

## Gates and gotchas only this app has

- …
