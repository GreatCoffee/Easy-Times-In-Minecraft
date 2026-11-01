# -*- coding: utf-8 -*-
"""metgear 批 asset generator (条 218 D-1: same-engine luminance-structure remap).

11 missing sprites from B-新① (条 217): six metal shears + gold chain +
gold chain-armor four. Two arms, one remap engine (keep the base sprite's
shape + luminance structure, project it onto a per-metal tone ramp):

- Arm A (six shears):   shape base = ICPM copper_shears (the shears family
  silhouette — etim shears_rusted_iron rides the same shape); target ramp =
  etim chain_helmet_<m>.png (all-metal, full 7-band shading) for the five
  ETIM metals, R196 vanilla gold_ingot.png for gold.
- Arm B (chain gold):   shape base = etim chain_copper.png / chain_<piece>_
  copper.png (the etim chain family silhouette, ICPM mask-identical —
  条 218 出身核); target ramp = R196 vanilla gold_ingot.png.

Precedents: gen-scythe-batch.py (asset generator style) and
gen-rusted-iron.py (recolor pass, HSV variant) in the same directory.

Run once from the repo root:  python testharness/textures/gen-metgear-assets.py
"""
import json
import os

from PIL import Image

ROOT = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\item"
R196 = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\decompile\src\assets\minecraft\textures\items"
MODELS = os.path.join(ROOT, "models", "item")
TEX = os.path.join(ROOT, "textures", "items")

# Arm A: (etim name, target ramp source png)
SHEARS = [
    ("shears_copper", os.path.join(TEX, "chain_helmet_copper.png")),
    ("shears_silver", os.path.join(TEX, "chain_helmet_silver.png")),
    ("shears_gold", os.path.join(R196, "gold_ingot.png")),
    ("shears_mithril", os.path.join(TEX, "chain_helmet_mithril.png")),
    ("shears_ancient_metal", os.path.join(TEX, "chain_helmet_ancient_metal.png")),
    ("shears_adamantium", os.path.join(TEX, "chain_helmet_adamantium.png")),
]
SHEARS_SHAPE = os.path.join(ICPM, "copper_shears.png")

# Arm B: (etim name, shape-base png)
CHAIN_GOLD = [
    ("chain_gold", os.path.join(TEX, "chain_copper.png")),
    ("chain_helmet_gold", os.path.join(TEX, "chain_helmet_copper.png")),
    ("chain_chestplate_gold", os.path.join(TEX, "chain_chestplate_copper.png")),
    ("chain_leggings_gold", os.path.join(TEX, "chain_leggings_copper.png")),
    ("chain_boots_gold", os.path.join(TEX, "chain_boots_copper.png")),
]
GOLD_RAMP = os.path.join(R196, "gold_ingot.png")

BANDS = 8


def ramp(path):
    """Collect opaque pixels, bucket by luminance band, return sorted anchors
    [(mean_luminance, (r, g, b)), ...] — a per-metal tone ramp."""
    im = Image.open(path).convert("RGBA")
    px = [(r, g, b) for r, g, b, a in list(im.getdata()) if a > 0]
    lums = [0.299 * r + 0.587 * g + 0.114 * b for r, g, b in px]
    lo, hi = min(lums), max(lums)
    if hi - lo < 1e-6:
        hi = lo + 1.0
    buckets = b = {}
    for (r, g, bb), l in zip(px, lums):
        b.setdefault(int(min((l - lo) / (hi - lo), 0.999) * BANDS), []).append(((r, g, bb), l))
    anchors = []
    for k in sorted(buckets):
        vals = buckets[k]
        n = len(vals)
        mean = tuple(round(sum(v[0][i] for v in vals) / n) for i in range(3))
        ml = round(sum(v[1] for v in vals) / n)
        anchors.append((ml, mean))
    return anchors


def project(im, targets):
    """Recolor every opaque pixel of im: keep its position in the sprite's own
    luminance range, sample the target ramp at the same relative position."""
    anchors = ramp(targets)
    t_lo, t_hi = anchors[0][0], anchors[-1][0]
    im = im.convert("RGBA")
    px = im.load()
    lums = [0.299 * r + 0.587 * g + 0.114 * b
            for r, g, b, a in list(im.getdata()) if a > 0]
    if not lums:
        raise ValueError("no opaque pixels in base")
    lo, hi = min(lums), max(lums)
    if hi - lo < 1e-6:
        hi = lo + 1.0
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            l = 0.299 * r + 0.587 * g + 0.114 * b
            t = min(max((l - lo) / (hi - lo), 0.0), 1.0)
            tl = t_lo + t * (t_hi - t_lo)
            # piecewise-linear over target anchors
            for i in range(len(anchors) - 1):
                (l0, c0), (l1, c1) = anchors[i], anchors[i + 1]
                if tl <= l1 or i == len(anchors) - 2:
                    f = 0.0 if l1 - l0 < 1e-6 else min(max((tl - l0) / (l1 - l0), 0.0), 1.0)
                    px[x, y] = (round(c0[0] + (c1[0] - c0[0]) * f),
                                round(c0[1] + (c1[1] - c0[1]) * f),
                                round(c0[2] + (c1[2] - c0[2]) * f), a)
                    break
    return im


def patch_model(name, parent):
    path = os.path.join(MODELS, name + ".json")
    with open(path, "r", encoding="utf-8") as f:
        model = json.load(f)
    if model.get("parent") != "minecraft:" + parent:
        raise ValueError("unexpected parent in %s: %r" % (path, model.get("parent")))
    old = model["textures"]["layer0"]
    model["textures"]["layer0"] = "etim:items/" + name
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(model, f, separators=(",", ":"))
        f.write("\n")
    return old


def main():
    made = []
    shears_base = Image.open(SHEARS_SHAPE)
    for name, target in SHEARS:
        dst = os.path.join(TEX, name + ".png")
        project(shears_base.copy(), target).save(dst)
        made.append(name)
    for name, base_path in CHAIN_GOLD:
        dst = os.path.join(TEX, name + ".png")
        project(Image.open(base_path), GOLD_RAMP).save(dst)
        made.append(name)
    patched = []
    for name in made:
        parent = "item/handheld" if name.startswith("shears_") else "item/generated"
        patched.append((name, parent, patch_model(name, parent)))
    print("assets: %d png + %d json patched" % (len(made), len(patched)))
    for name, parent, old in patched:
        print("  %-26s layer0 %r -> etim:items/%s" % (name, old, name))


if __name__ == "__main__":
    main()
