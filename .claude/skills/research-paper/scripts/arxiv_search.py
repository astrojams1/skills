#!/usr/bin/env python3
"""Search arXiv (export API) and print compact results; save raw Atom responses for reproducibility.

  arxiv_search.py --out <paper-dir>/literature "query one" "query two" ... [--max 25] [--recent]

Query syntax is arXiv's (fields ti:, abs:, all:, AND/OR, quotes for phrases). Prints one line per hit:
  <arxiv id> <yyyy-mm> <first author> — <title>
and appends the query to <out>/search-log.tsv with the hit count. --recent sorts by submission date.
Be polite: the script sleeps 3 s between queries (arXiv asks for this).
"""
import argparse
import os
import re
import sys
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

NS = {"a": "http://www.w3.org/2005/Atom"}


def search(q, maxn, recent):
    url = ("https://export.arxiv.org/api/query?search_query=" + urllib.parse.quote(q)
           + f"&max_results={maxn}" + ("&sortBy=submittedDate&sortOrder=descending" if recent else "&sortBy=relevance"))
    req = urllib.request.Request(url, headers={"User-Agent": "research-paper-skill/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        raw = r.read()
    root = ET.fromstring(raw)
    hits = []
    for e in root.findall("a:entry", NS):
        aid = e.find("a:id", NS).text.rsplit("/abs/", 1)[-1]
        aid = re.sub(r"v\d+$", "", aid)
        title = " ".join(e.find("a:title", NS).text.split())
        date = e.find("a:published", NS).text[:7]
        auth = e.find("a:author/a:name", NS)
        hits.append((aid, date, auth.text if auth is not None else "?", title))
    return raw, hits


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("queries", nargs="+")
    ap.add_argument("--out", required=True)
    ap.add_argument("--max", type=int, default=25)
    ap.add_argument("--recent", action="store_true")
    a = ap.parse_args()
    os.makedirs(a.out, exist_ok=True)
    log = open(os.path.join(a.out, "search-log.tsv"), "a")
    for i, q in enumerate(a.queries):
        if i:
            time.sleep(3)
        try:
            raw, hits = search(q, a.max, a.recent)
        except Exception as e:  # noqa: BLE001
            print(f"## {q}\n  ERROR {e}")
            log.write(f"{time.strftime('%Y-%m-%d')}\tarxiv\t{q}\tERROR\n")
            continue
        slug = re.sub(r"[^a-z0-9]+", "-", q.lower())[:60].strip("-")
        open(os.path.join(a.out, f"arxiv-{slug}.xml"), "wb").write(raw)
        print(f"## {q}  ({len(hits)} hits)")
        for aid, date, auth, title in hits:
            print(f"  {aid} {date} {auth} — {title}")
        log.write(f"{time.strftime('%Y-%m-%d')}\tarxiv\t{q}\t{len(hits)}\n")
    log.close()


if __name__ == "__main__":
    sys.exit(main())
