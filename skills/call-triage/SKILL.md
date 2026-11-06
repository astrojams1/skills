---
name: call-triage
description: Turn a recorded call about any app, service or venture into finished follow-through. Finds the recording, transcribes it on the Mac, keeps audio and transcripts out of GitHub, sorts what was said into action items, product ideas, marketing insights and the rest, tracks every item until it is closed, and prepares a page and an email draft for the person on the call. Use for "process this call", "I just recorded a call with...", a voice memo, a customer, expert, partner or user interview, call notes, "what came out of that call", and any check on open call follow-ups. Never sends email.
metadata:
  version: "1.0.0"
  ledger: ledger/LEDGER.md
---

# Call triage

**A call is finished when every promise made on it is kept and every item has a home.** The notes are only a means to
that. Works for any product: the call says which one, and each product's own `AGENTS.md` and skills then apply.

## Hard rules

1. **Audio and transcripts never reach GitHub**, or any other hosted service. Transcribe on this Mac. Only the SSD call
   folder may hold them. Run `guard` before every commit, push and deploy that draws on a call.
2. **Nothing quoted leaves the call folder.** Issues, pages, emails and ledgers carry paraphrase. In Git, name the
   person by role ("SLP advisor call, 2026-11-06"), not by name. Family, health, students and small talk stay out
   entirely, even in the private notes when they serve no item.
3. **Never send email.** Draft it and tell the owner it is ready. The same goes for messages of any kind.
4. **Open only the recording asked for.** A voice memo library holds private recordings. Identify the call by date and
   length, and read nothing else.
5. **Don't assert what you haven't checked.** A claim made on a call ("it should work on iPad", "the link is live")
   is a thing to verify before repeating it to the person.

## Where things are

| Thing | Where |
|---|---|
| One call | `/Volumes/ssd/projects/calls/<YYYY-MM-DD>-<person>-<product>/`, mode 700 |
| Inside it | `audio/`, `transcript.txt`, `triage.md`, `items.jsonl`, `email-draft.md` |
| Tool | `scripts/call_triage.py` (Python 3.9+, no dependencies) |
| Transcriber | `scripts/transcribe.swift`, built to `/Volumes/ssd/projects/calls/bin/transcribe` |
| Getting a recording | [intake](references/intake.md) |
| Where each item goes | [routing](references/routing.md) |
| The page and the email | [deliverables](references/deliverables.md) |

`/Volumes/ssd/projects/calls/` is deliberately not a repository. Never `git init` there.

## The run

1. **Start.** `call_triage.py init <date> <person> <product>`. Record the run in the activity ledger.
2. **Get the recording and transcribe it** ([intake](references/intake.md)). Check the transcript's length against the
   recording's.
3. **Read all of it, then check consent.** Did the person hear that this was recorded? If nothing on the tape or in the
   thread says so, raise it with the owner in the final report, and word the email accordingly. Do not quote or share
   anything from the recording until that is settled.
4. **List the promises first.** Everything the owner said they would do, then everything the other person offered.
   Those lead the triage, because they are what a person remembers.
5. **Triage.** Add each item with `call_triage.py add`. Every item has a type, an owner, a destination and a next step:

   | Type | What it is |
   |---|---|
   | `commitment` | Promised on the call, by either side |
   | `action` | Work the call created that nobody promised aloud |
   | `idea` | Something the product could do |
   | `validation` | Evidence that what exists is right. Record it: it stops good work being undone |
   | `marketing` | Audience, wording, channel, objection, how buying or adoption really happens |
   | `research` | A claim or name to check before relying on it |
   | `risk` | Legal, safety, privacy, or a limit on what can be claimed |
   | `relationship` | How to keep this person: what they want, what to ask next, when |

   Compare each idea with the product as it stands. Read the code: the owner may have built half of it already, and the
   useful finding is then the gap.
6. **Do the work.** Take every item as far as authority allows, in order: promises to the person, anything blocking
   them, then the rest ([routing](references/routing.md)). Slow outside steps (reviews, approvals) go first, so their
   clock runs while you do everything else.
7. **Share.** If the person is owed something or would value it, build the page and the email draft
   ([deliverables](references/deliverables.md)). The page says only what is true at that moment.
8. **Guard and report.** Run `guard` on every repository touched and on the page. Report, in this order: what the
   owner must do, what is done, what is waiting and on whom. Then `call_triage.py status`.

## Follow-ups stay open until they are closed

`items.jsonl` is append-only and the last line for an id wins. An item closes only with evidence (a merged PR, a draft
id, a live URL, an approved build). `waiting` needs a `--due` date and says who it waits on. `call_triage.py due` lists
everything across all calls that is overdue or due within a week. Run it at the start of any session about a product
that has calls, and whenever the owner asks what came out of a call. A scheduled check is the owner's decision: offer it,
don't create it unasked.

An item that can only be done by the owner still gets tracked, with the exact step written down for them.

## Gotchas

- **Voice Memos is protected.** The shell gets `Operation not permitted`, even for the temporary copy the app hands the
  clipboard. Do not route around it with a background job or a Python that holds Full Disk Access. Use the app, as in
  [intake](references/intake.md).
- **Recordings are titled by location, not by person.** Find the call by date and duration, then confirm it from the
  transcript's first minutes.
- **Machine transcripts mishear names and terms** ("IAP" for IEP, "circle palsy" for cerebral palsy). Check a term
  before it reaches an issue or a page, and treat speaker turns as inferred: there are no speaker labels.
- **A call describes the plan, not the state.** "I'm setting up the tester link" may never have happened. Check the
  actual system, not the email about it.
- **A guard you didn't see pass didn't run.** Read its `guard: ok` line before pushing. Under zsh, a command held in a
  variable doesn't split into words and fails beside the commit, not before it.
- **Separate what was said from what you concluded.** Mark your own inference, so a suggestion made by the agent is
  never credited to the person on the call.
