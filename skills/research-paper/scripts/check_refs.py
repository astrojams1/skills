#!/usr/bin/env python3
"""Reference hygiene for a paper directory.

  check_refs.py <paper-dir> [--resolve] [--allow-unresolved]

Checks:
  1. every \\cite{...} key in *.tex exists in refs.bib
  2. every bib entry is cited (orphans are reported, not fatal)
  3. every bib entry has an `eprint` (arXiv) or `doi` field
  4. with --resolve: each eprint/doi answers HTTP 200 (arXiv export API / doi.org); results are cached in
     <paper-dir>/literature/resolved.json so re-runs are free
Exit code 1 on any fatal problem (unknown cite key, entry without identifier, unresolved identifier unless
--allow-unresolved).
"""
import glob
import json
import os
import re
import sys
import urllib.request

ENTRY = re.compile(r"@(\w+)\s*\{\s*([^,\s]+)\s*,", re.M)
FIELD = re.compile(r"^\s*(\w+)\s*=\s*[{\"](.*?)[}\"]\s*,?\s*$", re.M)
CITE = re.compile(r"\\cite[tp]?\*?(?:\[[^\]]*\])*\{([^}]*)\}")


def parse_bib(text):
    entries = {}
    positions = [(m.start(), m.group(2)) for m in ENTRY.finditer(text)]
    for i, (pos, key) in enumerate(positions):
        end = positions[i + 1][0] if i + 1 < len(positions) else len(text)
        body = text[pos:end]
        fields = {m.group(1).lower(): m.group(2).strip() for m in FIELD.finditer(body)}
        entries[key] = fields
    return entries


def resolve(kind, value, cache):
    k = f"{kind}:{value}"
    if k in cache:
        return cache[k]
    if kind == "eprint":
        url = f"https://export.arxiv.org/api/query?id_list={value}"
    else:
        url = f"https://doi.org/{value}"
    ok = False
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "research-paper-skill/0.1", "Accept": "application/json, text/html, */*"})
        with urllib.request.urlopen(req, timeout=20) as r:
            data = r.read(4000).decode("utf-8", "ignore")
            ok = r.status == 200 and ("<entry>" in data if kind == "eprint" else True)
            if kind == "eprint" and "<entry>" in data and "Error" in data[:2000] and "<title>Error" in data:
                ok = False
    except Exception as e:  # noqa: BLE001
        ok = False
        print(f"  resolve error {k}: {e}")
    cache[k] = ok
    return ok


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    pdir = sys.argv[1]
    do_resolve = "--resolve" in sys.argv
    allow = "--allow-unresolved" in sys.argv
    bib_path = os.path.join(pdir, "refs.bib")
    if not os.path.exists(bib_path):
        sys.exit(f"no refs.bib in {pdir}")
    entries = parse_bib(open(bib_path).read())
    cited = set()
    for tex in glob.glob(os.path.join(pdir, "**", "*.tex"), recursive=True):
        if "/build/" in tex:
            continue
        for m in CITE.finditer(open(tex).read()):
            for key in m.group(1).split(","):
                cited.add(key.strip())
    fatal = 0
    missing = sorted(k for k in cited if k not in entries)
    for k in missing:
        print(f"FATAL unknown cite key: {k}")
        fatal += 1
    orphans = sorted(k for k in entries if k not in cited)
    for k in orphans:
        print(f"warn orphan bib entry (not cited): {k}")
    cache_path = os.path.join(pdir, "literature", "resolved.json")
    cache = json.load(open(cache_path)) if os.path.exists(cache_path) else {}
    for key, f in sorted(entries.items()):
        ident = ("eprint", f["eprint"]) if "eprint" in f else ("doi", f["doi"]) if "doi" in f else None
        if ident is None:
            print(f"FATAL {key}: no eprint or doi field")
            fatal += 1
            continue
        if do_resolve:
            ok = resolve(ident[0], ident[1], cache)
            print(f"{'ok  ' if ok else 'FAIL'} {key}: {ident[0]} {ident[1]}")
            if not ok and not allow:
                fatal += 1
    if do_resolve:
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        json.dump(cache, open(cache_path, "w"), indent=1)
    print(f"{len(entries)} entries, {len(cited)} cited keys, {len(orphans)} orphans, {fatal} fatal")
    sys.exit(1 if fatal else 0)


if __name__ == "__main__":
    main()
