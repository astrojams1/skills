"""The kit's own test: the safe-zone check passes a good caption and catches the two ways a caption goes wrong.

  Blender -b --factory-startup --python-exit-code 1 -P selftest.py
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shortkit as k  # noqa: E402


def build(px, py, depth_behind=False):
    scene = k.new_scene(1.0, background="#202020", samples=1)
    cam = k.camera(location=(0, 0, 10), look_at=(0, 0, 0))
    wall = k.quad("Wall", 20, 30, material=k.emission_material("wall", "#405060"))
    cap = k.text("Caption", size=0.4, name="Caption")
    cap.location = k.at_pixel(cam, px, py, 11.0 if depth_behind else 9.0)
    k.plate(cap, "#000000")
    return scene, cam, wall


def problems(**case):
    scene, cam, _ = build(**case)
    return [p["why"] for p in k.safe_check(scene, cam)["problems"]]


failures = []
good = problems(px=480, py=400)
if good:
    failures.append(f"a caption inside the safe box was flagged: {good}")
top = problems(px=480, py=150)
if not any("outside" in w for w in top):
    failures.append(f"a caption under the top controls was not flagged: {top}")
hidden = problems(px=480, py=400, depth_behind=True)
if not any("hidden behind Wall" in w for w in hidden):
    failures.append(f"a caption behind the picture was not flagged: {hidden}")
# at_pixel must land where it says, at any depth and with the camera tilted.
scene, cam, _ = build(px=480, py=400)
cam.location = (1.5, -3, 8)
k.aim(cam, (0.5, 0.5, 0))
for px, py, d in ((300, 700, 6.0), (96, 288, 9.5), (1000, 1800, 14.0)):
    p = k.world_to_camera_view(scene, cam, k.at_pixel(cam, px, py, d))
    got = (p.x * k.W, (1 - p.y) * k.H)
    if abs(got[0] - px) > 0.5 or abs(got[1] - py) > 0.5 or abs(p.z - d) > 1e-3:
        failures.append(f"at_pixel({px}, {py}, {d}) projects to {got} at depth {p.z}")

for f in failures:
    print("FAIL", f)
print("selftest:", "ok" if not failures else f"{len(failures)} failed")
sys.exit(1 if failures else 0)
