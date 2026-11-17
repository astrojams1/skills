# Shorts built in Blender

Blender renders a Short as a real 3D scene: depth, a moving camera, focus blur, motion blur, light and physics. A flat
2D cut can't fake those. The owner asked for it (James, 2026-11-16: "we should try using blender for some of them.
those videos might be cool and might perform well"). It runs as experiment E7 in
`app-shorts/ledger/experiments.md`, and that experiment's verdict keeps or retires it.

## When it fits

Use Blender when depth or physics is the idea:

- the product's own picture breaks apart, folds, stacks or flies;
- a game's world becomes a diorama the camera moves through;
- a real object (a card, a page, a lunchbox, a badge) does something physical.

The rules that bind every Short still bind a Blender one. The product's own visuals are the spectacle
(`app-shorts/references/creative.md`), and the owner's verdicts in `app-shorts/ledger/verdicts.md` still hold.

- **Not a phone turntable.** A rendered iPhone body spinning on a studio floor is the "stock product-video template"
  the panel and the owner rejected (importron-easy-v3, importron-trend-v4).
- **No mascots, scoreboards, slot machines or parody sets,** however good they look in 3D (2026-11-12).
- **The product's picture stays exact.** Put screens, game art and recordings on unlit (emission) surfaces, and render
  with the Standard view transform. The kit does both; AgX or Filmic would wash out an app's colours.

### Starting points per product (check the product first; never a template)

| Product | A 3D moment |
|---|---|
| Data Center | the valley's own art breaks into tiles and lands as the campus grows (`scripts/blender/tiles-assemble.py`); a slow camera through the valley as a diorama |
| Space Worms | the arena's frame peels off as a sheet and the giant worm's kill plays across it; a near miss frozen in 3D as the camera orbits |
| Newsworthy | the day's top story as a printed card that drops onto a stack, its 1–10 score stamped on it |
| Füd | the lunchbox's foods fall into a box (rigid-body physics) and land as the app's own entries |
| Hanzi Cards | a character's strokes rise from the card as extruded ink, in stroke order |
| Importron | a synthetic lab PDF folds itself into Apple Health's lab result card |
| LOB | the shot's arc drawn as a ribbon in space over the real game frame |
| Vegas Microworks | the tool's result as a physical object on a desk; no gambling imagery, ever |

## The kit

`scripts/blender/shortkit.py` builds a scene in a few calls, and `scripts/blender-short.sh` renders it headless and
encodes it. Blender 5.2 is installed on the Mac (`/Applications/Blender.app`); cloud containers do not have it.

```bash
S=skills/youtube-shorts/scripts
$S/blender-short.sh SCENE.py OUT --check-only [scene args]   # safe-zone check only, seconds
$S/blender-short.sh SCENE.py OUT --still 4 [scene args]      # one full-size frame at 4 s
$S/blender-short.sh SCENE.py OUT --preview [scene args]      # half size, 16 samples, to judge motion
$S/blender-short.sh SCENE.py OUT [scene args]                # OUT/render.mp4, 1080x1920, no audio
```

`OUT` must be on `/Volumes/ssd`. The full run writes `safe-zone.json`, `meta.json`, `frames/`, `blender.log` and
`render.mp4` (H.264, square pixels). Renders wait on a lock (`/Volumes/ssd/projects/app-shorts/render.lock`), so only
one runs at a time, at `nice -n 10`. The worked example: 240 frames at full size, Eevee with 48 samples, 136 tiles,
focus and motion blur, took 234 s on the Mac's M4. Iterate on stills and `--preview`, then render the full cut once.

A scene script, in brief (the example is `scripts/blender/tiles-assemble.py`):

```python
import shortkit as k
opts = k.options(lambda p: p.add_argument("--image"))
scene = k.new_scene(8.0, background="#0f1c1f")              # seconds, 30 fps, true colours
cam = k.camera(location=(0, 0, 10), dof_distance=10)        # portrait, sensor fitted to the height
art = k.screen("Art", opts.image, height=8)                  # unlit picture, aspect from the file
cap = k.text("Build an AI campus", size=100 / k.pixels_per_metre(cam, 3))   # a 100 px em
cap.location = k.at_pixel(cam, 480, 380, 3)                  # frame pixel (x 480 = safe box middle), 3 m from lens
k.plate(cap, "#0f1c1f")                                      # solid ground for 4.5:1 contrast
k.key(cap, 1, scale=(0, 0, 0), interpolation="BACK", easing="EASE_OUT")
k.key(cap, 12, scale=(1, 1, 1))
k.render(scene, cam, opts)                                   # checks the safe zone, then renders
```

- **Place by frame pixels.** `at_pixel(cam, x, y, distance)` returns the world point that shows at that pixel. Compose
  against `assets/zones.json` exactly as for a 2D cut.
- **Mark what must be read** with `safe=True` (`text` does by default; `screen(..., safe=True)` for a product screen
  that must show whole). Before rendering, `render` projects each marked object every 0.5 s. It stops (exit 3) when one
  leaves the safe box, or when something sits between it and the camera.
- **Keep captions near the lens** (2 to 4 m) and parent them to the camera when the camera moves, so the push moves the
  picture, not the words.
- **Loop it.** Key the last state at `scene.frame_end + 1` equal to frame 1; the render stops one frame short, so the
  loop has no repeated frame.
- **A screen recording plays as a texture.** `screen("Rec", "take.mp4", height=...)` loads a movie that advances with
  the scene's frames. Record it at the Short's 30 fps.
- **Lit objects** (paper, a box, a floor) use `surface_material` and an area `light`. Pictures stay unlit.

After the render, the cut is checked and scored like any other: `safe-zone.mjs --every 0.5`, `legibility.swift`, the
rules checklist and the reviewer panel (`app-shorts`). `render.mp4` has no sound. Score it and mix it on afterwards:

```bash
ffmpeg -i render.mp4 -i score.wav -map 0:v -map 1:a -c:v copy -c:a aac -b:a 192k -shortest cut.mp4
```

## Test the kit

```bash
/Applications/Blender.app/Contents/MacOS/Blender -b --factory-startup --python-exit-code 1 \
  -P skills/youtube-shorts/scripts/blender/selftest.py
```

It passes a caption inside the safe box, catches one under the top controls and one behind the picture, and checks
that `at_pixel` lands on its pixel with the camera tilted. Run it after changing `shortkit.py` or updating Blender.

## Gotchas

- **A caption behind the picture passes a box check (2026-11-16).** The example's caption sat 0.6 m in front of the
  tiles; when the camera pushed in, it went behind them while still projecting inside the safe box. The kit now
  ray-casts from the camera to every marked object (`hidden behind ...`).
- **A new camera's `matrix_world` is stale** until the view layer updates. Placing by pixels against it put the first
  caption 9 m behind the picture. `at_pixel` updates the layer first.
- **Blender 5 has layered actions.** `action.fcurves` is gone. `key(..., interpolation=, easing=)` and `fcurves(obj)`
  reach the F-curves through the action's channel bag.
- **Text centres on its line, not its ink.** A caption's box sits about 8 px off the point given (descenders count).
  Leave margin inside the safe box; the check measures the real box.
- **Ease the fly-in gently.** With EXPO ease-out, 136 tiles all looked landed by 1.2 s; QUART spreads the arrival.
