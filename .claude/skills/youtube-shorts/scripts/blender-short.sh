#!/usr/bin/env bash
# Render a Blender scene script (built with blender/shortkit.py) headless, then encode its frames to an MP4 Short.
#
#   blender-short.sh SCENE.py OUT_DIR [--preview] [--still SECONDS] [--check-only] [scene args...]
#
# Writes OUT_DIR/safe-zone.json and meta.json, then frames/ and render.mp4 (1080x1920, H.264, square pixels, no
# audio: mix the score in afterwards), or still.png. Exits 3 when a safe-marked object leaves the safe box.
# One render at a time on the Mac: renders wait on a lock (SHORTS_RENDER_LOCK).
set -euo pipefail

if [[ $# -lt 2 ]]; then
  sed -n '2,9p' "$0" | sed 's/^# \{0,1\}//'
  exit 64
fi
scene=$(cd "$(dirname "$1")" && pwd)/$(basename "$1")
out=$2
shift 2
[[ $out == /* ]] || out=$PWD/$out
if [[ $(uname) == Darwin && $out != /Volumes/ssd/* ]]; then
  echo "OUT_DIR must be on /Volumes/ssd (the internal drive has no room for renders): $out" >&2
  exit 64
fi
mkdir -p "$out"
out=$(cd "$out" && pwd)

blender=${BLENDER:-}
if [[ -z $blender ]]; then
  for candidate in /Applications/Blender.app/Contents/MacOS/Blender "$(command -v blender || true)"; do
    if [[ -n $candidate && -x $candidate ]]; then blender=$candidate; break; fi
  done
fi
if [[ -z $blender ]]; then
  echo "Blender not found: install it (brew install --cask blender) or set BLENDER" >&2
  exit 69
fi

lock=${SHORTS_RENDER_LOCK:-}
if [[ -z $lock ]]; then
  if [[ -d /Volumes/ssd/projects/app-shorts ]]; then lock=/Volumes/ssd/projects/app-shorts/render.lock; else lock=$out/.render.lock; fi
fi
check_only=0; still=0
for a in "$@"; do
  [[ $a == --check-only ]] && check_only=1
  [[ $a == --still ]] && still=1
done
if [[ $check_only == 0 ]]; then
  waited=0
  until mkdir "$lock" 2>/dev/null; do
    if (( waited == 0 )); then echo "waiting for another render to finish ($lock)" >&2; fi
    if (( waited > 3600 )); then echo "gave up after an hour waiting for $lock" >&2; exit 75; fi
    sleep 10; waited=$((waited + 10))
  done
  echo $$ > "$lock/pid"
  trap 'rm -rf "$lock"' EXIT
fi

rm -rf "$out/frames"
started=$(date +%s)
nice -n 10 "$blender" -b --factory-startup --python-exit-code 1 -P "$scene" -- --out "$out" "$@" \
  > "$out/blender.log" 2>&1 || {
  status=$?
  grep -E "SAFE-ZONE|safe-zone:|Error|Traceback" "$out/blender.log" | tail -20 >&2 || true
  echo "blender exited $status; full log: $out/blender.log" >&2
  exit $status
}
grep -E "SAFE-ZONE|safe-zone:" "$out/blender.log" || true

if [[ $check_only == 1 ]]; then exit 0; fi
if [[ $still == 1 ]]; then echo "$out/still.png"; exit 0; fi

fps=$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1])).fps)' "$out/meta.json")
nice -n 10 ffmpeg -v error -y -framerate "$fps" -i "$out/frames/f_%04d.png" \
  -c:v libx264 -preset slow -crf 14 -pix_fmt yuv420p -vf setsar=1 -movflags +faststart "$out/render.mp4"
echo "rendered in $(( $(date +%s) - started )) s: $out/render.mp4"
