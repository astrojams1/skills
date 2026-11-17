"""Helpers for building a YouTube Short as a Blender scene, rendered headless.

A scene script imports this module, builds its scene with these helpers, and ends with `render(scene, cam, opts)`.
Run it through `../blender-short.sh SCENE.py OUT_DIR [--preview] [--still SECONDS] [--check-only] [scene args]`,
which also encodes the frames to `OUT_DIR/render.mp4`. See `../../references/blender.md`.

Everything is placed in frame pixels (1080x1920, y down) with `at_pixel`, so a layout can be composed against
`assets/zones.json` directly. Objects marked `safe=True` (captions, numbers, a product's screen) are projected through
the camera every half second before any frame renders; one outside the safe box stops the render.
"""

import argparse
import json
import math
import os
import random
import sys

import bpy
from bpy_extras.object_utils import world_to_camera_view
from mathutils import Euler, Vector

HERE = os.path.dirname(os.path.abspath(__file__))
ZONES = json.load(open(os.path.join(HERE, "..", "..", "assets", "zones.json")))
W, H = ZONES["frame"]["width"], ZONES["frame"]["height"]


# ---------------------------------------------------------------- arguments


def options(extra=None):
    """Parse the arguments after `--`. `extra(parser)` adds the scene's own."""
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    p = argparse.ArgumentParser(prog="scene.py")
    p.add_argument("--out", required=True, help="output folder (frames, meta.json, safe-zone.json)")
    p.add_argument("--preview", action="store_true", help="half size, few samples, for looking only")
    p.add_argument("--still", type=float, help="render one frame at this many seconds to still.png")
    p.add_argument("--check-only", action="store_true", help="run the safe-zone check and stop")
    p.add_argument("--allow-unsafe", action="store_true", help="report safe-zone problems without stopping")
    p.add_argument("--seed", type=int, default=7)
    if extra:
        extra(p)
    opts = p.parse_args(argv)
    random.seed(opts.seed)
    return opts


# ---------------------------------------------------------------- scene


def _engine(name):
    items = bpy.types.RenderSettings.bl_rna.properties["engine"].enum_items.keys()
    if name == "cycles":
        return "CYCLES"
    for ident in ("BLENDER_EEVEE", "BLENDER_EEVEE_NEXT"):
        if ident in items:
            return ident
    raise RuntimeError(f"No Eevee engine in {list(items)}")


def new_scene(seconds, fps=30, background=(0.0, 0.0, 0.0), engine="eevee", samples=64, motion_blur=True):
    """An empty 1080x1920 scene, `seconds` long, with true colours (Standard view, no filmic look)."""
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = _engine(engine)
    scene.render.resolution_x, scene.render.resolution_y = W, H
    scene.render.resolution_percentage = 100
    scene.render.fps = fps
    scene.frame_start, scene.frame_end = 1, int(round(seconds * fps))
    # Standard keeps an app's or a game's own colours exact; AgX/Filmic would wash them out.
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.film_transparent = False
    scene.render.use_motion_blur = motion_blur
    if scene.render.engine == "CYCLES":
        scene.cycles.samples = samples
        try:
            bpy.context.preferences.addons["cycles"].preferences.compute_device_type = "METAL"
            scene.cycles.device = "GPU"
        except Exception:
            pass
    else:
        scene.eevee.taa_render_samples = samples
    world = bpy.data.worlds.new("World")
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (*srgb(background), 1.0)
    scene.world = world
    return scene


def srgb(c):
    """A colour given as '#rrggbb' or 0-1 sRGB, in Blender's linear space."""
    if isinstance(c, str):
        c = tuple(int(c.lstrip("#")[i:i + 2], 16) / 255 for i in (0, 2, 4))
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c[:3])


def seconds_to_frame(scene, s):
    return 1 + int(round(s * scene.render.fps))


# ---------------------------------------------------------------- camera and placement


def camera(location=(0, 0, 10), look_at=(0, 0, 0), lens=50, dof_distance=None, fstop=2.8):
    data = bpy.data.cameras.new("Camera")
    data.lens = lens
    data.sensor_fit = "VERTICAL"
    data.sensor_height = 36
    if dof_distance:
        data.dof.use_dof = True
        data.dof.focus_distance = dof_distance
        data.dof.aperture_fstop = fstop
    cam = bpy.data.objects.new("Camera", data)
    bpy.context.scene.collection.objects.link(cam)
    cam.location = location
    aim(cam, look_at)
    bpy.context.scene.camera = cam
    return cam


def aim(obj, target):
    d = Vector(target) - obj.location
    obj.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()


def at_pixel(cam, px, py, distance):
    """The world point that shows at frame pixel (px, py) (y down), `distance` in front of the camera."""
    scene = bpy.context.scene
    bpy.context.view_layer.update()  # a new or moved camera's matrix_world is stale until the layer updates
    corners = [Vector(v) for v in cam.data.view_frame(scene=scene)]  # tr, br, bl, tl in camera space
    tr, br, bl, tl = [v * (distance / -v.z) for v in corners]
    u, v = px / W, py / H
    top = tl.lerp(tr, u)
    bottom = bl.lerp(br, u)
    return cam.matrix_world @ top.lerp(bottom, v)


def pixels_per_metre(cam, distance):
    a, b = at_pixel(cam, 0, 0, distance), at_pixel(cam, W, 0, distance)
    return W / (a - b).length


# ---------------------------------------------------------------- materials and objects


def emission_material(name, color=None, image=None, strength=1.0):
    """Unlit: shows a colour or an image exactly as it is (screens, game art, captions)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out = nt.nodes.new("ShaderNodeOutputMaterial")
    em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Strength"].default_value = strength
    if image is not None:
        tex = nt.nodes.new("ShaderNodeTexImage")
        tex.image = image
        tex.interpolation = "Cubic"
        if image.source == "MOVIE":
            tex.image_user.frame_duration = image.frame_duration
            tex.image_user.use_auto_refresh = True
        nt.links.new(tex.outputs["Color"], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (*srgb(color or (1, 1, 1)), 1.0)
    nt.links.new(em.outputs["Emission"], out.inputs["Surface"])
    return mat


def surface_material(name, color, roughness=0.5, metallic=0.0):
    """Lit: takes light and shadow (props, floors, physical objects)."""
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = (*srgb(color), 1.0)
    bsdf.inputs["Roughness"].default_value = roughness
    bsdf.inputs["Metallic"].default_value = metallic
    return mat


def load_media(path):
    """An image, or a movie (a screen recording) that plays in time with the scene."""
    img = bpy.data.images.load(os.path.abspath(path))
    if os.path.splitext(path)[1].lower() in (".mp4", ".mov", ".m4v", ".webm"):
        img.source = "MOVIE"
    return img


def link(obj):
    bpy.context.scene.collection.objects.link(obj)
    return obj


def quad(name, width, height, uv=(0, 0, 1, 1), material=None):
    """A flat rectangle facing +Z, centred on its origin, with its UVs on one region of an image."""
    mesh = bpy.data.meshes.new(name)
    w, h = width / 2, height / 2
    mesh.from_pydata([(-w, -h, 0), (w, -h, 0), (w, h, 0), (-w, h, 0)], [], [(0, 1, 2, 3)])
    u0, v0, u1, v1 = uv
    layer = mesh.uv_layers.new()
    for loop, (u, v) in zip(layer.data, [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]):
        loop.uv = (u, v)
    if material:
        mesh.materials.append(material)
    return link(bpy.data.objects.new(name, mesh))


def screen(name, media, height, safe=False, strength=1.0):
    """A product's screen or a piece of art as a flat, unlit picture `height` metres tall."""
    img = media if isinstance(media, bpy.types.Image) else load_media(media)
    w, h = img.size
    obj = quad(name, height * w / h, height, material=emission_material(name, image=img, strength=strength))
    obj["safe"] = safe
    return obj


def text(body, size, font=None, color="#ffffff", align="CENTER", extrude=0.0, safe=True, name="Text"):
    """Type as geometry. `size` is the cap-to-cap size in metres; mark it safe so the check watches it."""
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = body
    curve.size = size
    curve.align_x = align
    curve.align_y = "CENTER"
    curve.extrude = extrude
    if font and os.path.exists(font):
        curve.font = bpy.data.fonts.load(font)
    obj = link(bpy.data.objects.new(name, curve))
    obj.data.materials.append(emission_material(name + "-ink", color))
    obj["safe"] = safe
    return obj


def plate(behind, color="#000000", pad=0.25, name="Plate"):
    """A solid ground behind a text object, sized to it and parented to it (it scales and moves with it)."""
    lo, hi = local_bounds(behind)
    size = hi - lo
    p = quad(name, size.x + 2 * pad * size.y, size.y * (1 + 2 * pad), material=emission_material(name, color))
    p.parent = behind
    p.location = ((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, -0.01)
    return p


def local_bounds(obj):
    bpy.context.view_layer.update()
    ev = obj.evaluated_get(bpy.context.evaluated_depsgraph_get())
    pts = [Vector(c) for c in ev.bound_box]
    return (Vector(tuple(min(p[i] for p in pts) for i in range(3))),
            Vector(tuple(max(p[i] for p in pts) for i in range(3))))


def light(kind="AREA", location=(0, -4, 6), energy=500, size=4, color="#ffffff", look_at=(0, 0, 0)):
    data = bpy.data.lights.new(kind.lower(), kind)
    data.energy = energy
    data.color = srgb(color)
    if kind == "AREA":
        data.size = size
    obj = link(bpy.data.objects.new(kind.lower(), data))
    obj.location = location
    aim(obj, look_at)
    return obj


# ---------------------------------------------------------------- animation


def key(obj, frame, interpolation=None, easing=None, **props):
    """Set and keyframe props at frame: key(obj, 30, location=(0,0,0), interpolation='BACK', easing='EASE_OUT').

    A key's interpolation shapes the move that starts at it (Blender's rule)."""
    paths = []
    for prop, value in props.items():
        setattr(obj, prop, value)
        obj.keyframe_insert(data_path=prop, frame=frame)
        paths.append(prop)
    if interpolation or easing:
        for fc in fcurves(obj):
            if fc.data_path in paths:
                for kp in fc.keyframe_points:
                    if abs(kp.co.x - frame) < 0.5:
                        if interpolation:
                            kp.interpolation = interpolation
                        if easing:
                            kp.easing = easing


def fcurves(obj):
    """An object's F-curves on both the legacy and the layered (4.4+) action API."""
    ad = obj.animation_data
    if not ad or not ad.action:
        return []
    act = ad.action
    if hasattr(act, "layers") and len(act.layers):
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                bag = strip.channelbag(ad.action_slot) if ad.action_slot else None
                if bag:
                    out.extend(bag.fcurves)
        return out
    return list(getattr(act, "fcurves", []))


# ---------------------------------------------------------------- the safe-zone check


def _fits(box):
    x0, y0, x1, y1 = box
    s, a = ZONES["safe"], ZONES["safeAboveRail"]
    inside = lambda z: x0 >= z["x"] and y0 >= z["y"] and x1 <= z["x"] + z["width"] and y1 <= z["y"] + z["height"]
    return inside(s) or inside(a)


def frame_box(scene, cam, obj, depsgraph):
    """The pixel box (x0, y0, x1, y1, y down) an object covers on the 1080x1920 frame."""
    ev = obj.evaluated_get(depsgraph)
    xs, ys = [], []
    for corner in ev.bound_box:
        p = world_to_camera_view(scene, cam, ev.matrix_world @ Vector(corner))
        xs.append(p.x * W)
        ys.append((1 - p.y) * H)
    return (min(xs), min(ys), max(xs), max(ys))


def occluder(scene, cam, obj, depsgraph):
    """The name of whatever sits between the camera and the middle of obj, or None.

    A caption placed behind the picture still projects inside the safe box, so the box alone cannot catch it."""
    ev = obj.evaluated_get(depsgraph)
    lo, hi = local_bounds_eval(ev)
    family = {obj.name} | {c.name for c in obj.children_recursive} | ({obj.parent.name} if obj.parent else set())
    origin = cam.evaluated_get(depsgraph).matrix_world.translation
    for fx, fy in ((0.5, 0.5), (0.3, 0.5), (0.7, 0.5)):
        target = ev.matrix_world @ Vector((lo.x + (hi.x - lo.x) * fx, lo.y + (hi.y - lo.y) * fy, (lo.z + hi.z) / 2))
        ray = target - origin
        hit, _, _, _, what, _ = scene.ray_cast(depsgraph, origin, ray.normalized(), distance=ray.length + 1e-3)
        if hit and what is not None and what.original.name not in family:
            return what.original.name
    return None


def local_bounds_eval(ev):
    pts = [Vector(c) for c in ev.bound_box]
    return (Vector(tuple(min(p[i] for p in pts) for i in range(3))),
            Vector(tuple(max(p[i] for p in pts) for i in range(3))))


def safe_check(scene, cam, every=0.5):
    """Every object marked safe, every `every` seconds: inside the safe box, or the box above the rail."""
    problems, checked = [], 0
    fps = scene.render.fps
    frames = sorted({seconds_to_frame(scene, i * every) for i in range(int((scene.frame_end - 1) / fps / every) + 1)}
                    | {scene.frame_end})
    for f in frames:
        scene.frame_set(f)
        dg = bpy.context.evaluated_depsgraph_get()
        for obj in scene.objects:
            if not obj.get("safe") or obj.hide_render:
                continue
            if max(obj.evaluated_get(dg).matrix_world.to_scale()) < 1e-3:
                continue  # scaled to nothing: not on screen yet
            box = frame_box(scene, cam, obj, dg)
            checked += 1
            if not _fits(box):
                problems.append({"object": obj.name, "second": round((f - 1) / fps, 2),
                                 "box": [round(v) for v in box], "why": "outside the safe box"})
            blocker = occluder(scene, cam, obj, dg)
            if blocker:
                problems.append({"object": obj.name, "second": round((f - 1) / fps, 2),
                                 "box": [round(v) for v in box], "why": f"hidden behind {blocker}"})
    scene.frame_set(1)
    return {"checked": checked, "problems": problems,
            "safe": ZONES["safe"], "safeAboveRail": ZONES["safeAboveRail"]}


# ---------------------------------------------------------------- render


def render(scene, cam, opts):
    os.makedirs(opts.out, exist_ok=True)
    report = safe_check(scene, cam)
    with open(os.path.join(opts.out, "safe-zone.json"), "w") as f:
        json.dump(report, f, indent=2)
    for p in report["problems"]:
        print(f"SAFE-ZONE {p['object']} at {p['second']} s covers {p['box']} (x0 y0 x1 y1): {p['why']}")
    print(f"safe-zone: {report['checked']} placements checked, {len(report['problems'])} problems")
    if report["problems"] and not opts.allow_unsafe:
        sys.exit(3)
    meta = {"fps": scene.render.fps, "frames": scene.frame_end, "seconds": scene.frame_end / scene.render.fps,
            "width": W, "height": H, "preview": bool(opts.preview), "engine": scene.render.engine,
            "blender": bpy.app.version_string}
    with open(os.path.join(opts.out, "meta.json"), "w") as f:
        json.dump(meta, f, indent=2)
    if opts.check_only:
        return
    if opts.preview:
        scene.render.resolution_percentage = 50
        if scene.render.engine == "CYCLES":
            scene.cycles.samples = min(scene.cycles.samples, 16)
        else:
            scene.eevee.taa_render_samples = min(scene.eevee.taa_render_samples, 16)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGB"
    if opts.still is not None:
        scene.frame_set(seconds_to_frame(scene, opts.still))
        scene.render.filepath = os.path.join(opts.out, "still.png")
        bpy.ops.render.render(write_still=True)
        return
    scene.render.filepath = os.path.join(opts.out, "frames", "f_")
    bpy.ops.render.render(animation=True)
