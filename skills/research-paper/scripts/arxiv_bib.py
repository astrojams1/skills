#!/usr/bin/env python3
"""Make BibTeX entries from arXiv ids using the export API (never from memory).

  arxiv_bib.py 2303.08128 2406.09403 ... [--out refs.bib] [--abstracts abstracts.md]

Entry keys are <firstauthorlastname><year><firstsignificanttitleword>. If a DOI is present in the arXiv
record it is included. With --abstracts, the abstracts are appended to that markdown file for reading.
Ids are fetched in batches of 20 with a 3 s pause.
"""
import argparse
import re
import time
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

NS = {"a": "http://www.w3.org/2005/Atom", "arxiv": "http://arxiv.org/schemas/atom"}
STOP = {"a", "an", "the", "of", "for", "and", "on", "in", "to", "with", "via", "from", "by", "towards", "toward", "is", "are", "as", "at", "its"}


def fetch(ids):
    url = "https://export.arxiv.org/api/query?id_list=" + urllib.parse.quote(",".join(ids)) + f"&max_results={len(ids)}"
    req = urllib.request.Request(url, headers={"User-Agent": "research-paper-skill/0.1"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return ET.fromstring(r.read())


def key_for(authors, year, title):
    last = authors[0].split()[-1].lower() if authors else "anon"
    last = re.sub(r"[^a-z]", "", last) or "anon"
    words = [w for w in re.sub(r"[^a-z0-9 ]", " ", title.lower()).split() if w not in STOP]
    return f"{last}{year}{words[0] if words else 'paper'}"


def entry(e):
    aid = re.sub(r"v\d+$", "", e.find("a:id", NS).text.rsplit("/abs/", 1)[-1])
    title = " ".join(e.find("a:title", NS).text.split())
    title = re.sub(r"(?<!\\)([&%#])", r"\\\1", title)  # TeX-escape special characters in titles
    authors = [a.text for a in e.findall("a:author/a:name", NS)]
    year = e.find("a:published", NS).text[:4]
    cat = e.find("arxiv:primary_category", NS)
    cat = cat.get("term") if cat is not None else ""
    doi = e.find("arxiv:doi", NS)
    summary = " ".join(e.find("a:summary", NS).text.split())
    key = key_for(authors, year, title)
    auth = " and ".join(authors)
    lines = [f"@article{{{key},",
             f"  title = {{{{{title}}}}},",
             f"  author = {{{auth}}},",
             f"  journal = {{arXiv preprint arXiv:{aid}}},",
             f"  year = {{{year}}},",
             f"  eprint = {{{aid}}},",
             "  archivePrefix = {arXiv},",
             f"  primaryClass = {{{cat}}},"]
    if doi is not None and doi.text:
        lines.append(f"  doi = {{{doi.text.strip()}}},")
    lines.append("}")
    return key, aid, title, authors, year, summary, "\n".join(lines)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--out")
    ap.add_argument("--abstracts")
    a = ap.parse_args()
    bibs, absd = [], []
    for i in range(0, len(a.ids), 20):
        if i:
            time.sleep(3)
        root = fetch(a.ids[i:i + 20])
        for e in root.findall("a:entry", NS):
            if e.find("a:id", NS) is None or "/abs/" not in e.find("a:id", NS).text:
                continue
            key, aid, title, authors, year, summary, bib = entry(e)
            bibs.append(bib)
            absd.append(f"## {key} — {aid} — {title}\n{', '.join(authors[:3])}{' et al.' if len(authors) > 3 else ''} ({year})\n\n{summary}\n")
            print(f"{key}\t{aid}\t{title}")
    if a.out:
        with open(a.out, "a") as f:
            f.write("\n\n".join(bibs) + "\n")
    if a.abstracts:
        with open(a.abstracts, "a") as f:
            f.write("\n".join(absd) + "\n")


if __name__ == "__main__":
    main()
