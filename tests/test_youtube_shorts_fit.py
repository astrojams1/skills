#!/usr/bin/env python3
"""Test: youtube-shorts fit-screenshot.py recovers a known player scale and offset.

Builds a textured 1080x1920 frame, places it the way the YouTube player does
(scaled, sides cropped, controls drawn on top) in a phone-sized screenshot,
and checks the fit finds the placement and maps a control back to frame
pixels. Skipped when numpy or Pillow is missing.
"""

import importlib.util
import os
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCRIPT = os.path.join(REPO_ROOT, "skills", "youtube-shorts", "scripts", "fit-screenshot.py")

try:
    import numpy as np
    from PIL import Image, ImageDraw
except ImportError:
    print("SKIP: numpy and Pillow are needed for the fit-screenshot test")
    sys.exit(0)

sys.dont_write_bytecode = True  # keep __pycache__ out of the skill folder and its discovery copies
spec = importlib.util.spec_from_file_location("fit_screenshot", SCRIPT)
fit_screenshot = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fit_screenshot)


def main():
    rng = np.random.default_rng(7)
    texture = (rng.random((48, 27, 3)) * 255).astype(np.uint8)
    frame = Image.fromarray(texture).resize((1080, 1920), Image.BICUBIC)

    scale, offset = 1.24, (-67, -4)
    shot = Image.new("RGB", (1206, 2622), (10, 10, 10))
    shot.paste(frame.resize((round(1080 * scale), round(1920 * scale)), Image.BILINEAR), offset)
    draw = ImageDraw.Draw(shot)
    draw.rectangle([1045, 1310, 1175, 2320], fill=(255, 255, 255))  # the action rail
    draw.rectangle([0, 2380, 1206, 2622], fill=(15, 15, 15))  # the tab bar

    box = [216, 480, 756, 1152]
    result = fit_screenshot.fit(frame, shot, box)
    failures = 0

    def check(ok, message):
        nonlocal failures
        print(("  PASS: " if ok else "  FAIL: ") + message)
        failures += 0 if ok else 1

    check(abs(result["scale"] - scale) <= 0.003, f"scale {result['scale']} is within 0.003 of {scale}")
    check(abs(result["offset"][0] - offset[0]) <= 3, f"x offset {result['offset'][0]} is within 3 px of {offset[0]}")
    check(abs(result["offset"][1] - offset[1]) <= 3, f"y offset {result['offset'][1]} is within 3 px of {offset[1]}")
    check(result["score"] > 0.95, f"match score {result['score']} is above 0.95")

    rail = fit_screenshot.to_frame(result, [1045, 1310, 1175, 2320])
    expected = [round((1045 - offset[0]) / scale), round((1310 - offset[1]) / scale)]
    check(abs(rail[0] - expected[0]) <= 3 and abs(rail[1] - expected[1]) <= 3,
          f"the rail maps to frame {rail[:2]}, expected about {expected}")

    print("=" * 50)
    print(f"Results: {4 + 1 - failures} passed, {failures} failed")
    print("OVERALL: " + ("PASS" if failures == 0 else "FAIL"))
    sys.exit(1 if failures else 0)


if __name__ == "__main__":
    main()
