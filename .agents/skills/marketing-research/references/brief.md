# The weekly brief

Write each brief for an agent in one of our businesses who has five minutes. Lead with what to try. Keep each line
short and give its link.

## The shape

```markdown
# Marketing research brief, week of YYYY-MM-DD

Read on YYYY-MM-DD. Sources read: N (case studies with numbers: N). Kinds: research, platforms, ...

## Top three

1. **Finding in one line.** Grade A. Who, when, what they did, what happened. [link]

## Sessions

Every finding worth keeping, grouped by theme (agents at work, AI search, email, video, app stores, local business,
partnerships, measurement). Each: the finding, grade, fit, link, and the practice id in `practices.md`.

## What changes for our agents

Each skill change made this run, with its PR, and each one handed to another repository.

## Handoffs

### Apps (app-marketing)
- **Idea** (`research:YYYY-MM-DD#P-NNN`): what to build. reaches, size (with its basis), effort 1 to 5, moves,
  pattern. Measure: the number and where it is read. Bar: what counts as working. Verdict: 14 days after it ships.
  Rules it must respect, when any apply.

### Vegas Microworks
### Money coaching
### Clean Streets
### Pipsqueak

## Results back

Each research idea a business has tried: its status or verdict, linked to the private register, and the lesson.

## Questions for next week

What we still want to know, and why.
```

Every business gets at least two ideas. A new business with a marketing skill gets its own heading and a row in the
table below the week it starts.

## The businesses

Where each keeps its ideas and experiments, and where its Invent step reads the brief. Read the registers with the
`mcp__github__` tools (`get_file_contents`), or `gh api repos/astrojams1/<repo>/contents/<path>` where `gh` works.

| Business | Repository (branch) | Ideas and experiments | Invent step that reads the brief |
|---|---|---|---|
| Apps (Space Worms, Newsworthy, Giraffe Stretch and later apps) | `astrojams1/app-sites` (`main`) | `marketing/apps/<id>.json`, `ideas` and `experiments` | `skills/app-marketing/references/invent.md` in this repository |
| Vegas Microworks | `astrojams1/vegas-microworks` (`main`) | `docs/experiments.md` | `docs/marketing.md`, step 6 |
| Money coaching | `astrojams1/money-coaching` (`main`) | `content/growth/experiments.json` | `skills/lead-gen/SKILL.md`, step 2b |
| Clean Streets (Patreon growth) | `astrojams1/cleanstreets` (`master`) | `idea:` and `experiment:` lines in `.claude/skills/patreon-growth/LEDGER.md` | `.claude/skills/patreon-growth/references/invent.md` |
| Pipsqueak | `astrojams1/pipsqueak` (`main`) | `marketing/gtm/experiments.json` | `docs/go-to-market.md`, "Each daily run" |

Each business tags an idea it took from a brief with `research:YYYY-MM-DD#P-NNN`, so step 2 of a run can find it.
