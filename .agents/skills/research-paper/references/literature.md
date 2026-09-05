# Literature search protocol

Goal: find the works a reviewer in the chosen audience would expect to see cited, the closest prior work
(possibly one that already did what we claim), and the standard baselines. Bias toward finding the paper
that kills the claim: that is cheaper to find now than after submission.

## Sources (in order of reliability for resolving records)

1. arXiv API — `https://export.arxiv.org/api/query?search_query=all:<terms>&max_results=25&sortBy=relevance`
   Returns Atom XML with id, title, authors, published, summary. Best for method-family queries.
2. Semantic Scholar API — `https://api.semanticscholar.org/graph/v1/paper/search?query=<q>&limit=20&fields=title,year,authors,externalIds,citationCount,abstract`
   Best for citation counts and finding the canonical version (DOI) of a known paper. Rate-limited; back off.
3. Web search (WebSearch tool) — for surveys, blog posts naming the standard baselines, and for very recent
   work. Every web hit must then be resolved through 1 or 2 before it enters `refs.bib`.
4. Crossref — `https://api.crossref.org/works?query=<q>&rows=10` for DOIs of venue papers.

Fetch with curl (respect the proxy env) or WebFetch. Save raw responses under `paper/<slug>/literature/`
so the search is reproducible.

## Query plan

Write 8-15 queries before running any, covering:

- the task ("3D scene reconstruction from two views", "object pose from images")
- the method family ("analysis by synthesis", "vision language model tool use", "LLM code interpreter")
- the constraint the thesis depends on ("training-free", "zero-shot", "low cost")
- the application ("robot perception", "world model for manipulation")
- the benchmark style ("synthetic benchmark symmetries scoring")
- the exact phrase of the thesis, in case it exists ("cheapest world model")
- surveys of the field (last 2-3 years)

Run them all; keep a table: query, source, hits, kept (count). Add follow-up queries from the titles found
(snowballing) until two consecutive queries return nothing new.

## Selection

Keep a hit if any of: it is a plausible closest work; it is a baseline the audience expects; it defines a
term or metric used; it is a survey that scopes the field; it is directly contradicting or supporting a
claim. Drop otherwise. Aim for a working list of 30-60, prune to the cited set in stage 15.

## Annotating

For each kept work: full title, first author, year, venue/arXiv id, one sentence on what it does, one
sentence on the relation to ours (same/different/baseline/definition). Mark the 3-8 closest.

## Bib hygiene

- Build `refs.bib` from resolved records only. Each entry has `eprint` + `archivePrefix={arXiv}` or `doi`.
  The `check_refs.py` script rejects entries without one and verifies that every `\cite` key exists.
- Keys: `firstauthorYEARkeyword` (e.g. `kerbl2023gaussian`).
- Titles in braces to protect capitals. Authors as "Last, First and Last, First".
- Never cite from memory. If a known paper cannot be resolved (API down), leave a `% TODO resolve` comment
  and log an issue; the strict build fails until resolved.

## Reading depth

Abstract-level for the long list. Read the full paper (WebFetch the arXiv abs page or HTML version) for the
3-8 closest works and for any baseline you compare numbers against; quote their protocol in `04-novelty.md`.
