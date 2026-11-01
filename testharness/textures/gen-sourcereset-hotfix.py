# -*- coding: utf-8 -*-
"""资产正源化 hot-fix generator (条 224/225, 2026-11-01):
replaces every external-art-derived sprite still in serve with self-sourced
or vanilla-domain-derivative art (user rulings 2026-11-01: vanilla-domain
form bases are allowed; third-party finished art is not).

- shears x7  (vanilla shears.png form + per-metal tone ramps: the five
  ETIM metals via etim chain_helmet_<m> vanilla-tint ramps, gold via the
  R196 vanilla gold_ingot ramp, rusted via the etim rusted chain helmet
  ramp) — engine = the asset-batch luminance-structure remap.
- arrows x6  (five craft metals + rusted): vanilla arrow.png form, same
  ramps.
- scythe x6 + knife_flint: procedural first-pass self-drawn silhouettes
  (16x16, no third-party reference bytes) — 正源化批-01 refines with
  user art review.

Run once from the repo root:  python testharness/textures/gen-sourcereset-hotfix.py
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from gen_sourcereset_engine import project  # noqa: E402  (shared remap engine)

from PIL import Image  # noqa: E402

TEX = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim\textures\items"
R196 = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\decompile\src\assets\minecraft\textures\items"

SHEARS_BASE = os.path.join(R196, "shears.png")
ARROW_BASE = os.path.join(R196, "arrow.png")

RAMP_FIVE = {
    "copper": "chain_helmet_copper.png",
    "silver": "chain_helmet_silver.png",
    "ancient_metal": "chain_helmet_ancient_metal.png",
    "mithril": "chain_helmet_mithril.png",
    "adamantium": "chain_helmet_adamantium.png",
}
RAMP_RUST = "chain_helmet_rusted_iron.png"


def ramp_path(metal):
    if metal == "gold":
        return os.path.join(R196, "gold_ingot.png")
    name = RAMP_FIVE.get(metal, RAMP_RUST)
    return os.path.join(TEX, name)


# --- procedural scythe (blade crescent + diagonal staff) ------------------
SCYTHE_BLADE = [  # (x, y) along the crescent, upper-left arc
    (2, 6), (2, 5), (3, 4), (4, 3), (5, 2), (6, 2), (7, 1), (8, 1),
    (9, 1), (10, 1), (11, 2), (12, 2), (13, 3), (13, 4), (14, 5), (14, 6),
]
STAFF = [(4, 6), (5, 7), (6, 8), (7, 9), (8, 10), (9, 11), (10, 12), (11, 13)]
WOOD = [(120, 84, 48), (104, 72, 40)]


def gen_scythe(path, metal):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    # blade: brightest ramp tone at the outer edge, mid tone inside
    ramp = project(Image.new("RGBA", (1, len(SCYTHE_BLADE) * 2), (0, 0, 0, 0)), ramp_path(metal)) \
        if False else None
    anchors = None
    # sample ramp directly: build a 2-px-wide luminance spread and recolor it
    base = Image.new("RGBA", (len(SCYTHE_BLADE), 2), (255, 255, 255, 255))
    for i, (x, y) in enumerate(SCYTHE_BLADE):
        t = i / max(len(SCYTHE_BLADE) - 1, 1)
        lum = int(90 + 110 * t)  # dark root -> bright tip
        base.putpixel((i, 0), (lum, lum, lum, 255))
    blade_colors = project(base, ramp_path(metal)).load()
    for i, (x, y) in enumerate(SCYTHE_BLADE):
        c = blade_colors[i, 0]
        px[x, y] = (c[0], c[1], c[2], 255)
    for i, (x, y) in enumerate(STAFF):
        px[x, y] = WOOD[i % 2] + (255,)
    # staff-to-blade joint
    px[3, 6] = WOOD[0] + (255,)
    im.save(path)


def gen_knife(path):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    flint = [(126, 132, 140), (104, 110, 118), (86, 92, 100)]
    handle = [(120, 84, 48), (104, 72, 40)]
    # blade: small parallel-flake wedge from (3,3) to (8,8)
    blade = [(3, 4), (4, 3), (5, 3), (6, 3), (7, 4), (3, 5), (4, 4), (5, 4),
             (6, 4), (7, 5), (8, 5), (4, 5), (5, 5), (6, 5), (7, 6), (8, 6),
             (9, 6), (5, 6), (6, 6), (8, 7), (9, 7)]
    for i, (x, y) in enumerate(blade):
        px[x, y] = flint[i % len(flint)] + (255,)
    for i, (x, y) in enumerate([(10, 8), (11, 9), (12, 10), (13, 11)]):
        px[x, y] = handle[i % 2] + (255,)
    im.save(path)


def main():
    made = []
    shears_base = Image.open(SHEARS_BASE)
    for metal in ("copper", "silver", "gold", "ancient_metal", "mithril",
                  "adamantium", "rusted_iron"):
        dst = os.path.join(TEX, "shears_%s.png" % metal)
        project(shears_base.copy(), ramp_path(metal)).save(dst)
        made.append(os.path.basename(dst))
    arrow_base = Image.open(ARROW_BASE)
    for metal in ("copper", "silver", "mithril", "adamantium", "ancient_metal",
                  "rusted_iron"):
        dst = os.path.join(TEX, "arrow_%s.png" % metal)
        project(arrow_base.copy(), ramp_path(metal)).save(dst)
        made.append(os.path.basename(dst))
    for metal in ("copper", "silver", "mithril", "adamantium", "ancient_metal",
                  "rusted_iron"):
        gen_scythe(os.path.join(TEX, "scythe_%s.png" % metal), metal)
        made.append("scythe_%s.png" % metal)
    gen_knife(os.path.join(TEX, "knife_flint.png"))
    made.append("knife_flint.png")
    print("sourcereset hot-fix: %d sprites" % len(made))
    for n in made:
        print("  " + n)


if __name__ == "__main__":
    main()
