"""Worked example: a product's own picture breaks into tiles that fly in, settle full bleed, and fly back out.

The last frame is the first frame, so the Short loops without a seam. One caption pops in over a solid plate,
placed by frame pixels inside the safe box. Use it to learn the kit, not as a template: every Short needs its own idea.

  ../blender-short.sh tiles-assemble.py OUT --image store/screenshots/iphone-00-campus.jpg \
      --caption "Build an AI campus" --font "/System/Library/Fonts/Avenir Next.ttc"
"""

import math
import os
import random
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shortkit as k  # noqa: E402


def extra(p):
    p.add_argument("--image", required=True, help="the picture: a screenshot, game art, a frame of a recording")
    p.add_argument("--caption", default="")
    p.add_argument("--font")
    p.add_argument("--seconds", type=float, default=8.0)
    p.add_argument("--cols", type=int, default=8)
    p.add_argument("--background", default="#0f1c1f")
    p.add_argument("--plate", default="#0f1c1f")
    p.add_argument("--ink", default="#f2fff8")


opts = k.options(extra)
scene = k.new_scene(opts.seconds, background=opts.background, samples=48)
fps = scene.render.fps
end = scene.frame_end + 1  # the loop's frame 1 again

# The picture fills the frame's width with a little overscan, so the camera's drift never shows an edge.
DIST = 10.0
cam = k.camera(location=(0, 0, DIST), look_at=(0, 0, 0), lens=50, dof_distance=DIST, fstop=4.0)
img = k.load_media(opts.image)
iw, ih = img.size
width = (k.W / k.pixels_per_metre(cam, DIST)) * 1.06
height = width * ih / iw

cols = opts.cols
rows = max(1, round(cols * height / width))
tw, th = width / cols, height / rows
art = k.emission_material("art", image=img)
edge = k.emission_material("edge", "#081012")

ASSEMBLE, LEAVE = 2.4, 1.6  # seconds: tiles land within the first, and lift away over the last
for r in range(rows):
    for c in range(cols):
        x = -width / 2 + (c + 0.5) * tw
        y = -height / 2 + (r + 0.5) * th
        tile = k.quad(f"tile_{r}_{c}", tw, th, uv=(c / cols, r / rows, (c + 1) / cols, (r + 1) / rows), material=art)
        tile.data.materials.append(edge)
        solid = tile.modifiers.new("thickness", "SOLIDIFY")
        solid.thickness = 0.04
        solid.use_rim = True
        solid.material_offset = 1
        solid.material_offset_rim = 1
        # Tiles nearest the centre land first: a ripple outwards.
        reach = math.hypot(x / width, y / height) / 0.71
        land = k.seconds_to_frame(scene, 0.35 + reach * (ASSEMBLE - 0.9) + random.uniform(0, 0.25))
        lift = k.seconds_to_frame(scene, opts.seconds - LEAVE + (1 - reach) * 0.6 + random.uniform(0, 0.2))
        away = dict(location=(x * random.uniform(1.4, 2.2), y * random.uniform(1.3, 1.8), random.uniform(2.5, 6.5)),
                    rotation_euler=(random.uniform(-2.5, 2.5), random.uniform(-2.5, 2.5), random.uniform(-1, 1)))
        home = dict(location=(x, y, 0), rotation_euler=(0, 0, 0))
        k.key(tile, 1, interpolation="QUART", easing="EASE_OUT", **away)
        k.key(tile, land, interpolation="BEZIER", **home)
        k.key(tile, lift, interpolation="QUART", easing="EASE_IN", **home)
        k.key(tile, end, **away)

# A slow push in and back out again, so the loop's camera also meets itself.
k.key(cam, 1, location=(0, 0, DIST))
k.key(cam, (1 + end) // 2, location=(0.15, -0.35, DIST * 0.93))
k.key(cam, end, location=(0, 0, DIST))

if opts.caption:
    # Place by frame pixels: centred on x 480 (the safe box's middle), near the top of the safe box.
    # Near the lens (well in front of every tile, even mid-flight), sized in frame pixels: a 100 px em.
    near = 3.0
    cap = k.text(opts.caption, size=100 / k.pixels_per_metre(cam, near), font=opts.font, color=opts.ink,
                 name="Caption")
    cap.location = k.at_pixel(cam, 480, 380, near)
    k.plate(cap, color=opts.plate, name="CaptionPlate")
    # Ride with the camera, so the push moves the picture but never the caption.
    cap.parent = cam
    cap.matrix_parent_inverse = cam.matrix_world.inverted()
    t_in, t_out = k.seconds_to_frame(scene, ASSEMBLE + 0.1), k.seconds_to_frame(scene, opts.seconds - LEAVE - 0.2)
    k.key(cap, 1, scale=(0, 0, 0))
    k.key(cap, t_in - 1, scale=(0, 0, 0), interpolation="BACK", easing="EASE_OUT")
    k.key(cap, t_in + 9, scale=(1, 1, 1))
    k.key(cap, t_out, scale=(1, 1, 1), interpolation="BACK", easing="EASE_IN")
    k.key(cap, t_out + 8, scale=(0, 0, 0))

k.render(scene, cam, opts)
