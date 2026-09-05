#!/usr/bin/env bash
# Build a paper directory with latexmk (pdflatex + bibtex) into <paper-dir>/build/main.pdf.
#   build.sh <paper-dir> [--strict]
# --strict fails on any LaTeX error, undefined reference/citation, or overfull box wider than 10pt,
# and checks that all fonts are embedded (pdffonts, if installed).
set -uo pipefail
dir="${1:?paper dir}"
strict=0; [ "${2:-}" = "--strict" ] && strict=1
cd "$dir" || exit 1
mkdir -p build
latexmk -pdf -interaction=nonstopmode -halt-on-error -output-directory=build main.tex > build/latexmk.log 2>&1
status=$?
log=build/main.log
errors=$(grep -c "^!" "$log" 2>/dev/null || true)
undef=$(grep -c -i "undefined" "$log" 2>/dev/null || true)
over=$(grep -E "Overfull \\\\hbox \(([0-9.]+)pt" -o "$log" 2>/dev/null | sed -E 's/.*\(([0-9.]+)pt/\1/' | awk '$1>10' | wc -l | tr -d ' ')
pages=$(grep -oE "Output written on [^ ]+ \(([0-9]+) pages" "$log" 2>/dev/null | grep -oE "[0-9]+ pages" | head -1)
echo "latexmk exit $status; errors $errors; 'undefined' mentions $undef; overfull>10pt $over; $pages"
if [ "$strict" = 1 ]; then
  fail=0
  [ "$status" != 0 ] && fail=1
  [ "$errors" != 0 ] && fail=1
  [ "$undef" != 0 ] && { grep -i "undefined" "$log" | head -20; fail=1; }
  [ "$over" != 0 ] && { grep -E "Overfull \\\\hbox" "$log" | head -20; fail=1; }
  if command -v pdffonts >/dev/null 2>&1; then
    nonemb=$(pdffonts build/main.pdf 2>/dev/null | awk 'NR>2 && $(NF-3)=="no"' | wc -l | tr -d ' ')
    [ "$nonemb" != 0 ] && { echo "non-embedded fonts: $nonemb"; fail=1; }
  fi
  # ship the .bbl next to main.tex so arXiv can build without running bibtex
  [ -f build/main.bbl ] && cp build/main.bbl main.bbl
  exit $fail
fi
exit $status
