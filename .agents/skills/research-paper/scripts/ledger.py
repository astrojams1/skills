#!/usr/bin/env python3
"""Ledger for the research-paper skill: one run log per paper, one index across runs.

Usage (from anywhere; the ledger lives next to this script in ../ledger/):
  ledger.py start --repo world-sim --slug cheap-world-model --paper-dir /path/to/repo/paper/cheap-world-model
  ledger.py stage 1 --tokens-left 14900000            # call at the START of each stage (closes the previous one)
  ledger.py stage 2 --estimate --bytes-in 120000 --bytes-out 8000
  ledger.py issue --stage 4 "arXiv API rate-limited" --fix "back off 3 s between queries"
  ledger.py note --stage 6 "thesis narrowed to the benchmark"
  ledger.py close --tokens-left 14500000 --outcome "PDF delivered, 9 pages"
  ledger.py show

Stage numbers follow SKILL.md (0 setup ... 20 close). Token deltas are computed from the harness's
remaining-token counter when given; with --estimate they are bytes/4. The run log is markdown so it can be
read without this script; the JSON sidecar is the source of truth for the numbers.
"""
import argparse
import datetime as dt
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
LEDGER_DIR = os.path.normpath(os.path.join(HERE, "..", "ledger"))
RUNS_DIR = os.path.join(LEDGER_DIR, "runs")
CURRENT = os.path.join(LEDGER_DIR, ".current-run")
INDEX = os.path.join(LEDGER_DIR, "LEDGER.md")

STAGES = {
    0: "Set up", 1: "Understand project", 2: "Research question", 3: "Results & contributions",
    4: "Literature", 5: "Novelty / closest prior work", 6: "Thesis", 7: "Paper type", 8: "Audience",
    9: "Venue", 10: "Scope & length", 11: "Mathematical treatment", 12: "Writing style",
    13: "Missing experiments", 14: "Run / recommend experiments", 15: "Outline", 16: "Draft",
    17: "Scientific review", 18: "Writing review", 19: "Submission checks", 20: "Close",
}


def now():
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()


def load_run(run_id=None):
    if run_id is None:
        if not os.path.exists(CURRENT):
            sys.exit("no current run; use `ledger.py start`")
        run_id = open(CURRENT).read().strip()
    path = os.path.join(RUNS_DIR, run_id + ".json")
    if not os.path.exists(path):
        sys.exit(f"run {run_id} not found at {path}")
    return run_id, json.load(open(path))


def save_run(run_id, run):
    os.makedirs(RUNS_DIR, exist_ok=True)
    json.dump(run, open(os.path.join(RUNS_DIR, run_id + ".json"), "w"), indent=1)
    write_markdown(run_id, run)


def close_open_stage(run, tokens_left=None, est=None, when=None):
    """Close the last open stage entry using either a token counter or an estimate."""
    if not run["stages"] or run["stages"][-1].get("ended"):
        return
    s = run["stages"][-1]
    s["ended"] = when or now()
    if tokens_left is not None and s.get("tokens_left_start") is not None:
        s["tokens_left_end"] = tokens_left
        s["tokens"] = s["tokens_left_start"] - tokens_left
        s["method"] = "counter"
    elif est is not None:
        s["tokens"] = est
        s["method"] = "estimate"
    else:
        s["tokens"] = None
        s["method"] = "unknown"


def write_markdown(run_id, run):
    lines = [f"# Run {run_id}", "",
             f"- repo: `{run['repo']}`  slug: `{run['slug']}`  paper dir: `{run['paper_dir']}`",
             f"- started: {run['started']}  closed: {run.get('closed') or '-'}",
             f"- skill version: {run.get('skill_version', '?')}",
             f"- outcome: {run.get('outcome') or '-'}", "",
             "## Stages", "",
             "| # | stage | started (UTC) | tokens | method | notes |", "|---|---|---|---|---|---|"]
    total = 0
    for s in run["stages"]:
        tok = s.get("tokens")
        if isinstance(tok, int):
            total += tok
        notes = "; ".join(s.get("notes", []))
        lines.append(f"| {s['n']} | {STAGES.get(s['n'], '?')} | {s['started'][11:16]} | "
                     f"{tok if tok is not None else '-'} | {s.get('method', '-')} | {notes} |")
    lines += ["", f"**Total tokens (counted stages): {total:,}**", "", "## Issues", ""]
    if run["issues"]:
        lines += ["| stage | issue | proposed fix |", "|---|---|---|"]
        for i in run["issues"]:
            lines.append(f"| {i['stage']} | {i['text']} | {i.get('fix') or '-'} |")
    else:
        lines.append("(none logged)")
    lines.append("")
    open(os.path.join(RUNS_DIR, run_id + ".md"), "w").write("\n".join(lines))


def update_index(run_id, run):
    """Rewrite the Runs table row for this run in LEDGER.md (between the RUNS markers)."""
    if not os.path.exists(INDEX):
        sys.exit(f"{INDEX} missing; create it from the template in SKILL.md")
    text = open(INDEX).read()
    start, end = "<!-- RUNS:START -->", "<!-- RUNS:END -->"
    if start not in text or end not in text:
        sys.exit("LEDGER.md needs <!-- RUNS:START --> / <!-- RUNS:END --> markers around the runs table")
    head, rest = text.split(start, 1)
    table, tail = rest.split(end, 1)
    rows = [r for r in table.strip().splitlines() if r.startswith("|")]
    if not rows:
        rows = ["| run | date | repo | paper | stages | tokens | issues | outcome |", "|---|---|---|---|---|---|---|---|"]
    total = sum(s["tokens"] for s in run["stages"] if isinstance(s.get("tokens"), int))
    done = len([s for s in run["stages"] if s.get("ended")])
    row = (f"| [{run_id}](runs/{run_id}.md) | {run['started'][:10]} | {run['repo']} | {run['slug']} | "
           f"{done}/21 | {total:,} | {len(run['issues'])} | {run.get('outcome') or 'in progress'} |")
    rows = [r for r in rows if f"[{run_id}]" not in r] + [row]
    open(INDEX, "w").write(head + start + "\n" + "\n".join(rows) + "\n" + end + tail)


def skill_version():
    try:
        for line in open(os.path.join(HERE, "..", "SKILL.md")):
            if line.strip().startswith("version:"):
                return line.split(":", 1)[1].strip().strip('"')
    except OSError:
        pass
    return "?"


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("start")
    p.add_argument("--repo", required=True)
    p.add_argument("--slug", required=True)
    p.add_argument("--paper-dir", required=True)
    p.add_argument("--tokens-left", type=int)
    p = sub.add_parser("stage")
    p.add_argument("n", type=int)
    p.add_argument("--tokens-left", type=int)
    p.add_argument("--estimate", action="store_true")
    p.add_argument("--bytes-in", type=int, default=0)
    p.add_argument("--bytes-out", type=int, default=0)
    p.add_argument("--note")
    p = sub.add_parser("issue")
    p.add_argument("text")
    p.add_argument("--stage", type=int, required=True)
    p.add_argument("--fix")
    p = sub.add_parser("note")
    p.add_argument("text")
    p.add_argument("--stage", type=int)
    p = sub.add_parser("close")
    p.add_argument("--tokens-left", type=int)
    p.add_argument("--outcome", default="")
    sub.add_parser("show")
    a = ap.parse_args()

    if a.cmd == "start":
        run_id = f"{dt.date.today().isoformat()}-{a.repo}-{a.slug}"
        run = {"repo": a.repo, "slug": a.slug, "paper_dir": a.paper_dir, "started": now(),
               "skill_version": skill_version(), "stages": [], "issues": []}
        run["stages"].append({"n": 0, "started": now(), "tokens_left_start": a.tokens_left, "notes": []})
        os.makedirs(RUNS_DIR, exist_ok=True)
        open(CURRENT, "w").write(run_id)
        save_run(run_id, run)
        update_index(run_id, run)
        # scaffold the paper directory
        os.makedirs(a.paper_dir, exist_ok=True)
        names = ["00-understanding", "01-research-question", "02-contributions", "03-literature", "04-novelty",
                 "05-decisions", "06-experiments", "07-outline", "08-review-scientific", "09-review-writing",
                 "10-submission-checks"]
        for n in names:
            path = os.path.join(a.paper_dir, n + ".md")
            if not os.path.exists(path):
                open(path, "w").write(f"# {n[3:].replace('-', ' ').title()}\n\n(not started)\n")
        for d in ("figures", "tables", "scripts", "experiments", "literature"):
            os.makedirs(os.path.join(a.paper_dir, d), exist_ok=True)
        print(f"run {run_id} started; paper dir scaffolded at {a.paper_dir}")
        return

    run_id, run = load_run()
    if a.cmd == "stage":
        est = (a.bytes_in + a.bytes_out) // 4 if a.estimate else None
        close_open_stage(run, a.tokens_left, est)
        entry = {"n": a.n, "started": now(), "tokens_left_start": a.tokens_left, "notes": []}
        if a.note:
            entry["notes"].append(a.note)
        run["stages"].append(entry)
        print(f"stage {a.n} ({STAGES.get(a.n, '?')}) started")
    elif a.cmd == "issue":
        run["issues"].append({"stage": a.stage, "text": a.text, "fix": a.fix, "at": now()})
        print(f"issue logged ({len(run['issues'])} total)")
    elif a.cmd == "note":
        target = None
        for s in run["stages"]:
            if a.stage is None or s["n"] == a.stage:
                target = s
        if target is None:
            sys.exit("no such stage yet")
        target.setdefault("notes", []).append(a.text)
    elif a.cmd == "close":
        close_open_stage(run, a.tokens_left)
        run["closed"] = now()
        run["outcome"] = a.outcome
        if os.path.exists(CURRENT):
            os.remove(CURRENT)
        print("run closed")
    elif a.cmd == "show":
        print(open(os.path.join(RUNS_DIR, run_id + ".md")).read())
        return
    save_run(run_id, run)
    update_index(run_id, run)


if __name__ == "__main__":
    main()
