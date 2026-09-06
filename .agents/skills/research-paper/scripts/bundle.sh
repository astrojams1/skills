#!/usr/bin/env bash
# Make an arXiv-ready source bundle from a paper directory and prove it builds from a clean directory.
#   bundle.sh <paper-dir>   ->  <paper-dir>/build/arxiv-bundle.tar.gz
# Includes main.tex, main.bbl, refs.bib, figures/, tables/, and every file named by \input, \include,
# \lstinputlisting or \includegraphics in main.tex (paths relative to the paper dir).
set -euo pipefail
dir="${1:?paper dir}"
cd "$dir"
stage="$(mktemp -d)"
cp main.tex "$stage/"
[ -f main.bbl ] && cp main.bbl "$stage/"
[ -f refs.bib ] && cp refs.bib "$stage/"
for d in figures tables; do [ -d "$d" ] && mkdir -p "$stage/$d" && cp -r "$d"/. "$stage/$d/"; done
grep -oE '\\(input|include|lstinputlisting|includegraphics(\[[^]]*\])?)\{[^}]+\}' main.tex | sed -E 's/.*\{([^}]+)\}/\1/' | sort -u | while read -r f; do
  for cand in "$f" "$f.tex" "figures/$f" "figures/$f.pdf" "figures/$f.png" "figures/$f.jpg"; do
    if [ -f "$cand" ]; then mkdir -p "$stage/$(dirname "$cand")"; cp "$cand" "$stage/$cand"; break; fi
  done
done
( cd "$stage" && latexmk -pdf -interaction=nonstopmode -halt-on-error main.tex > build.log 2>&1 && echo "clean-directory build OK: $(grep -oE '[0-9]+ pages' main.log | head -1)" || { echo "clean-directory build FAILED"; tail -30 build.log; exit 1; } )
mkdir -p build
( cd "$stage" && rm -f main.pdf main.aux main.log main.out main.blg main.fls main.fdb_latexmk build.log && tar czf - . ) > build/arxiv-bundle.tar.gz
echo "bundle: $dir/build/arxiv-bundle.tar.gz ($(du -h build/arxiv-bundle.tar.gz | cut -f1))"
rm -rf "$stage"
