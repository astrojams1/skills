#!/usr/bin/env python3
"""Map a phone screenshot of a playing Short back onto the video's own pixels.

    python3 fit-screenshot.py --frame frame.png --screenshot shot.png \
        [--box x0,y0,x1,y1] [--mark x0,y0,x1,y1 ...] [--diff diff.png] \
        [--preview new.png ...]

--frame is the video's frame at the moment of the screenshot (extract it with
ffmpeg -ss <t> -i video.mp4 -frames:v 1 frame.png). --box is a textured
region of that frame, away from YouTube's controls, to match on (frame
pixels; default the middle of the frame). Prints the player's scale and
offset, the part of the frame the phone shows, and each --mark (a box in
screenshot pixels around a YouTube control) converted to frame pixels: the
numbers that go into assets/zones.json. --diff writes |screenshot - frame|
in screenshot space; YouTube's controls stand out in it, which is where to
put the marks. --preview puts YouTube's controls, lifted from the
screenshot, over other frames of the same size (a new cut, a still) and writes
<name>-phone.png beside each: what a viewer would see, before uploading. It
takes the white pixels inside each --mark, so mark each control tightly: any
white video inside a mark comes along. Needs numpy and Pillow.
"""

import argparse
import json
import os
import sys

try:
    import numpy as np
    from PIL import Image, ImageFilter
except ImportError:
    sys.exit("fit-screenshot.py needs numpy and Pillow: python3 -m pip install numpy pillow")


def gray(image):
    return np.asarray(image.convert("L"), dtype=np.float64)


def ncc(image, template):
    """Normalized cross-correlation of template over every position in image."""
    h, w = template.shape
    H, W = image.shape
    if h > H or w > W:
        return None
    t = template - template.mean()
    tn = np.sqrt((t * t).sum())
    shape = (H + h - 1, W + w - 1)
    corr = np.fft.irfft2(np.fft.rfft2(image, shape) * np.fft.rfft2(t[::-1, ::-1], shape), shape)
    corr = corr[h - 1:H, w - 1:W]
    ii = np.pad(image, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    ii2 = np.pad(image * image, ((1, 0), (1, 0))).cumsum(0).cumsum(1)
    window = lambda a: a[h:, w:] - a[:-h, w:] - a[h:, :-w] + a[:-h, :-w]
    var = window(ii2) - window(ii) ** 2 / (h * w)
    return corr / (np.sqrt(np.maximum(var, 1e-6)) * tn + 1e-9)


def search(frame, shot, box, scales, step):
    """Best (score, scale, x, y) of box from frame placed in shot, shot downsampled by step."""
    x0, y0, x1, y1 = box
    crop = frame.crop(box)
    small = shot.resize((shot.width // step, shot.height // step), Image.BILINEAR) if step > 1 else shot
    target = gray(small)
    best = None
    for s in scales:
        size = (max(8, round((x1 - x0) * s / step)), max(8, round((y1 - y0) * s / step)))
        scores = ncc(target, gray(crop.resize(size, Image.BILINEAR)))
        if scores is None:
            continue
        y, x = np.unravel_index(np.argmax(scores), scores.shape)
        if best is None or scores[y, x] > best[0]:
            best = (float(scores[y, x]), float(s), x * step, y * step)
    return best


def fit(frame, shot, box):
    """Scale and offset with screenshot = scale * frame + offset."""
    lo = shot.width / frame.width * 0.95
    hi = shot.height / frame.height * 1.05
    coarse = search(frame, shot, box, np.arange(lo, hi, 0.005), 2)
    if coarse is None:
        raise SystemExit("the --box region is larger than the screenshot at every scale")
    fine = search(frame, shot, box, np.arange(coarse[1] - 0.006, coarse[1] + 0.0065, 0.001), 1)
    score, s, x, y = fine
    return {"score": round(score, 4), "scale": round(s, 4),
            "offset": [round(x - box[0] * s, 1), round(y - box[1] * s, 1)]}


def to_frame(result, rect):
    s = result["scale"]
    ox, oy = result["offset"]
    x0, y0, x1, y1 = rect
    return [round((x0 - ox) / s), round((y0 - oy) / s), round((x1 - ox) / s), round((y1 - oy) / s)]


def place(frame, size, result):
    """The frame drawn where the player draws it, on a canvas the screenshot's size."""
    s = result["scale"]
    canvas = Image.new("RGB", size)
    canvas.paste(frame.resize((round(frame.width * s), round(frame.height * s)), Image.BICUBIC),
                 tuple(round(v) for v in result["offset"]))
    return canvas


def overlay(shot, frame, result, marks):
    """YouTube's layer from the screenshot: its opacity, and the shade it casts on the video.

    Inside each mark (a box around a control, in screenshot pixels) the white
    pixels are YouTube's icons and text; outside the video, everything is
    YouTube's. Telling controls from video by difference ghosts whatever
    moved, and every edge the upload's re-encode softened.
    """
    a = np.asarray(shot, dtype=np.float64)
    f = np.asarray(place(frame, shot.size, result), dtype=np.float64)
    la, lf = a.mean(axis=2), f.mean(axis=2)
    video = np.zeros(la.shape)
    x0, y0, x1, y1 = [round(v) for v in to_screen(result, [0, 0, frame.width, frame.height])]
    video[max(0, y0):max(0, y1), max(0, x0):max(0, x1)] = 1
    alpha = 1 - video
    for x0, y0, x1, y1 in marks:
        alpha[y0:y1, x0:x1] = np.maximum(alpha[y0:y1, x0:x1], np.clip((la[y0:y1, x0:x1] - 190) / 30, 0, 1))
    alpha = np.asarray(Image.fromarray((alpha * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3)), dtype=np.float64) / 255
    # The player darkens the video behind its controls, top and bottom: per
    # row, the median ratio of screenshot to frame over the frame's lit pixels.
    shade = np.ones(la.shape[0])
    for y in range(la.shape[0]):
        lit = (lf[y] > 60) & (video[y] > 0) & (alpha[y] < 0.05)
        if lit.sum() > 12:
            shade[y] = np.clip(np.median(la[y, lit] / lf[y, lit]), 0.3, 1)
    shade = np.convolve(np.pad(shade, 30, mode="edge"), np.ones(61) / 61, mode="valid")[:, None, None]
    return alpha[..., None], shade


def preview(shot, frame, result, marks, path):
    alpha, shade = overlay(shot, frame, result, marks)
    new = np.asarray(place(Image.open(path).convert("RGB"), shot.size, result), dtype=np.float64) * shade
    out = new * (1 - alpha) + np.asarray(shot, dtype=np.float64) * alpha
    target = os.path.splitext(path)[0] + "-phone.png"
    Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(target)
    return target


def to_screen(result, rect):
    s = result["scale"]
    ox, oy = result["offset"]
    x0, y0, x1, y1 = rect
    return [x0 * s + ox, y0 * s + oy, x1 * s + ox, y1 * s + oy]


def rect(text):
    values = [int(v) for v in text.split(",")]
    if len(values) != 4:
        raise argparse.ArgumentTypeError("expected x0,y0,x1,y1")
    return values


def main():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--frame", required=True)
    parser.add_argument("--screenshot", required=True)
    parser.add_argument("--box", type=rect)
    parser.add_argument("--mark", type=rect, action="append", default=[])
    parser.add_argument("--diff")
    parser.add_argument("--preview", action="append", default=[])
    a = parser.parse_args()

    frame = Image.open(a.frame).convert("RGB")
    shot = Image.open(a.screenshot).convert("RGB")
    W, H = frame.size
    box = a.box or [round(W * 0.2), round(H * 0.25), round(W * 0.7), round(H * 0.6)]
    result = fit(frame, shot, box)
    visible = to_frame(result, [0, 0, shot.width, shot.height])
    result["visible"] = [max(0, visible[0]), max(0, visible[1]), min(W, visible[2]), min(H, visible[3])]
    result["marks"] = [{"screenshot": m, "frame": to_frame(result, m)} for m in a.mark]
    if result["score"] < 0.9:
        result["warning"] = "weak match: use the frame from the same moment, or a --box with more texture"

    if a.diff:
        s = result["scale"]
        placed = Image.new("RGB", shot.size)
        placed.paste(frame.resize((round(W * s), round(H * s)), Image.BILINEAR),
                     tuple(round(v) for v in result["offset"]))
        d = np.abs(np.asarray(shot, dtype=np.int16) - np.asarray(placed, dtype=np.int16)).max(axis=2)
        Image.fromarray(np.where(d > 40, 255, 0).astype(np.uint8)).save(a.diff)
        result["diff"] = a.diff

    if a.preview:
        if not a.mark:
            raise SystemExit("--preview needs a --mark around each of YouTube's controls on the screenshot")
        result["previews"] = [preview(shot, frame, result, a.mark, path) for path in a.preview]

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
