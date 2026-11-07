# Where each item goes

The product's own `AGENTS.md` and skills win over this table. A held change stays held.

| Item | Destination | How far to take it |
|---|---|---|
| Test access, TestFlight, store listing | `app-release` | Do it. Apple's beta review counts as a slow step: start it first. Public App Store release keeps its own rules |
| Product idea | An issue in the product's repository, or its backlog | Write the spec: the problem, what exists, the gap, a proposed shape, how to know it worked. Offer the build as a separate session |
| Small fix the call exposed | The product's repository | Do it, with its checks, and merge per the owner's rules |
| Marketing insight, Ouro or astrojams app | `app-marketing`: the app's profile or backlog in `app-sites` | Add it with honest `impact` and `effort` |
| Site copy or a site fact | The product's own site, or `ouro-website` / `astrojams-website` | Ship routine truth-keeping. A new claim needs a source |
| Research | `research.md` in the product, or the item's notes | Check it now if a search can settle it |
| Warm contact | `warm-lead-followup`, once that skill is on `main`; until then this register | Record what to ask next, and when |
| Legal, medical, financial question | The owner, in the report | Say what was observed. Don't give the answer as advice |
| Anything else | Open item in `items.jsonl` | Name the next step, the owner and a date |

## Writing an item for a repository

Issues and commits are the first place a call could leak.

- Paraphrase, and say "an SLP advisor call, 2026-11-06". The item id ties it back to the call folder.
- State what the person suggested separately from what the agent concluded.
- Check the repository's visibility. A public repository gets the conclusion and no mention of a call.
- `call_triage.py guard --repo <path> --call <folder>` before pushing, and on any file you wrote from the transcript.
  Issue text goes through `guard --file`.

## Authority

The owner's request to manage follow-ups end to end covers the steps that keep a promise made on the call, using
existing accounts and tools. It doesn't cover:

- sending anything to anyone,
- a public release, a price or an account change,
- a promise the owner did not make,
- a change that a product's `AGENTS.md` holds for approval.

Those become items for the owner, with the exact step spelled out.
