# call-triage: ledger

The skill's own record: versions and lessons. Append rows; never rewrite them. Per-call facts live in the SSD call
folders and the owner's activity ledger, never here.

## Versions

| version | date | change | why |
|---|---|---|---|
| 1.0.0 | 2026-11-06 | Initial skill: on-device transcription, item register, privacy guard, routing, the page and the email draft | The owner will hold calls about many apps and services, and wants each one followed through without audio or transcripts in GitHub |
| 1.1.0 | 2026-11-10 | Rewritten in the house style from `skill-writing`; no behavior change. Authority moved from `references/routing.md` into `SKILL.md` | The owner asked that every skill read as one author wrote it, plainly |

## Lessons

- 2026-11-06: Voice Memos blocks the shell, including the temporary copy it puts on the clipboard. Share > Copy, then a Finder paste, is the working route, and both steps need full-screen control.
- 2026-11-06: Apple's `SpeechAnalyzer` transcribed a 23-minute call in about 20 seconds on the Mac, with no install or model download.
- 2026-11-06: The first call found a promised tester link that had never been created, and an "it should work on iPad" for an iPhone-only build. Checking what was said against the real systems was the most valuable step of the run.
- 2026-11-06: A guard held in a shell variable did not run under zsh (no word splitting), and the commit went ahead anyway. Write the `guard` command out in full, and read its `guard: ok` line before pushing.
