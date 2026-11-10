---
name: call-triage
description: Turn a recorded call about any app, service or venture into finished follow-through. Finds the recording, transcribes it on the Mac, keeps audio and transcripts out of GitHub, sorts what was said into action items, product ideas, marketing insights and the rest, tracks every item until it is closed, and prepares a page and an email draft for the person on the call. Use for "process this call", "I just recorded a call with...", a voice memo, a customer, expert, partner or user interview, call notes, "what came out of that call", and any check on open call follow-ups. Never sends email.
metadata:
  version: "1.1.0"
  ledger: ledger/LEDGER.md
---

# Call triage

**Keep every promise made on a call, and give every item a home.** The call says which product it is about, and that
product's own `AGENTS.md` and skills then apply.

Done means: every item in `items.jsonl` is closed with evidence, or waits on a named person by a due date.

## Where things are

| What | Where |
|---|---|
| One call | `/Volumes/ssd/projects/calls/<YYYY-MM-DD>-<person>-<product>/`, mode 700 |
| Inside it | `audio/`, `transcript.txt`, `triage.md`, `items.jsonl`, `email-draft.md` |
| Tool | `scripts/call_triage.py` (Python 3.9+, no dependencies) |
| Transcriber | `scripts/transcribe.swift`, built to `/Volumes/ssd/projects/calls/bin/transcribe` |
| Getting a recording | [intake](references/intake.md) |
| Where each item goes | [routing](references/routing.md) |
| The page and the email | [deliverables](references/deliverables.md) |

`/Volumes/ssd/projects/calls/` is not a repository, on purpose. Never `git init` there.

## Authority

The owner asked for follow-ups to be managed end to end, with existing accounts and tools. It doesn't cover sending
anything, a public release, or a price or account change. Nor does it cover a promise the owner did not make, or a
change a product's `AGENTS.md` holds for approval. Those become tracked items for the owner, with the exact step.

Repository rules and approval holds outrank this skill.

## A run

1. **Start.** Run `call_triage.py init <date> <person> <product>`. Record the run in the activity ledger.
2. **Get the recording and transcribe it** ([intake](references/intake.md)). Check the transcript's length against
   the recording's.
3. **Read all of it, then check consent.** Did the person hear that this was recorded? If nothing says so, raise
   it with the owner in the report and word the email to match. Quote or share nothing until settled.
4. **List the promises first:** the owner's, then the other person's. They lead the triage.
5. **Triage.** Add each item with `call_triage.py add`, with a type, an owner, a destination and a next step. The types
   are in [routing](references/routing.md). Compare each idea with the code as it stands: the owner may have built
   half of it, and then the finding is the gap.
6. **Do the work.** Take every item as far as Authority allows: promises to the person, then anything blocking them,
   then the rest ([routing](references/routing.md)). Start slow outside steps (reviews, approvals) first.
7. **Share.** If the person is owed something or would value it, build the page and the email draft
   ([deliverables](references/deliverables.md)). The page says only what is true at that moment.
8. **Guard.** Run `guard` on every repository you touched and on the page.
9. **Report.**

## Rules

- **Audio and transcripts never reach GitHub** or any hosted service. Transcribe on this Mac. Only the SSD call folder
  holds them. Run `guard` before every commit, push and deploy that draws on a call.
- **Nothing quoted leaves the call folder.** Issues, pages, emails and ledgers carry paraphrase. In Git, name the
  person by role ("SLP advisor call, 2026-11-06"), not by name. Leave out family, health, students and small talk
  entirely. Keep them out of the private notes too when they serve no item.
- **Never send email** or any message. Draft it and tell the owner it is ready.
- **Open only the recording asked for.** A voice memo library holds private recordings. Find the call by date and
  length, and read nothing else.
- **Check a claim made on the call** ("the link is live") before you repeat it to the person.

## Follow-ups

- **The last line wins.** `items.jsonl` is append-only; the last line for an id wins.
- **Close only with evidence:** a merged PR, a draft id, a live URL, an approved build.
- **A wait has a date.** `waiting` needs a `--due` date and says who it waits on.
- **Check what is due.** `call_triage.py due` lists everything across all calls that is overdue or due within a week.
  Run it at the start of any session about a product that has calls, and when the owner asks what came out of a call.
- **Don't schedule it yourself.** Offer a scheduled check; the owner decides.

## Report

**Needs you** (what the owner must do), **Done** (with evidence), **Waiting** (and on whom). Then run
`call_triage.py status`.

## Gotchas

- **Voice Memos is protected (2026-11-06).** The shell gets `Operation not permitted`, even for the clipboard's
  temporary copy. Don't route around it with a background job or a Python with Full Disk Access. Use the app
  ([intake](references/intake.md)).
- **Recordings are titled by place, not person (2026-11-06).** Find the call by date and duration, then confirm it from
  the transcript's first minutes.
- **Machine transcripts mishear names and terms (2026-11-06)** ("IAP" for IEP, "circle palsy" for cerebral palsy).
  Check a term before it reaches an issue or a page. Speaker turns are a guess: there are no labels.
- **A call describes the plan, not the state (2026-11-06).** "I'm setting up the tester link" may never have
  happened. Check the real system.
- **A guard you didn't see pass didn't run (2026-11-06).** Read its `guard: ok` line before pushing. Under zsh, a
  command held in a variable doesn't split into words, so it fails beside the commit, not before it.
- **Keep what was said apart from what you concluded (2026-11-06).** Mark your own inference, so an agent's suggestion
  is never credited to the person on the call.

## Ledger

Versions and lessons go in [ledger/LEDGER.md](ledger/LEDGER.md). Append rows; never rewrite them. Per-call facts live
in the SSD call folders and the owner's activity ledger, never there.
