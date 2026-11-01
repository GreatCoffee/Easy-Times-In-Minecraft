# -*- coding: utf-8 -*-
"""资产正源化 v2 generator (hot-fix 批两遍, 2026-11-01):
user review of the first pass rejected the placeholder states — this pass
rebuilds every face on vanilla-domain form bases + etim-owned tone ramps
(user rulings: borrowing the *method* is fine, third-party finished art is not).

Faces:
- worn chain  x14: vanilla chainmail_layer_{1,2} forms + per-metal ramps
  (CHAIN_METALS) -> <metal>_chainmail_layer_{1,2}.png
- worn plate  x12: vanilla iron_layer_{1,2} forms + per-metal ramps
  (TOOL_METALS) -> <metal>_layer_{1,2}.png
- tool sprites x60: vanilla same-type forms (pickaxe/shovel/axe/hoe/sword)
  + vanilla analog flipped combos for the no-vanilla-analog types
  (hatchet=axe flip, mattock=hoe flip, dagger=sword, battle_axe=axe,
  war_hammer=pickaxe flip)
- scythe x6 + knife_flint x1: procedural redraw with the vanilla-tool icon
  orientation (head top-right, handle bottom-left) — first pass drew the
  head mirrored and rainbow-banded; this pass fixes orientation and pins
  blade colors to the ramp's top anchors (no gradient sampling).

Run once from the repo root:  python testharness/textures/gen-sourcereset-v2.py
"""
import os
from PIL import ImageOps

import gen_sourcereset_engine as engine
from PIL import Image

TEX = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim\textures\items"
ARMOR = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim\textures\models\armor"
R196_ITEMS = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\decompile\src\assets\minecraft\textures\items"
R196_ARMOR = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\decompile\src\assets\minecraft\textures\models\armor"

CHAIN_METALS = ["copper", "silver", "gold", "ancient_metal", "mithril", "adamantium", "rusted_iron"]
TOOL_METALS = ["copper", "silver", "ancient_metal", "mithril", "adamantium", "rusted_iron"]

RAMP_FIVE = {
    "copper": "chain_helmet_copper.png",
    "silver": "chain_helmet_silver.png",
    "ancient_metal": "chain_helmet_ancient_metal.png",
    "mithril": "chain_helmet_mithril.png",
    "adamantium": "chain_helmet_adamantium.png",
}


def ramp_path(metal):
    """Per-metal tone ramp: etim vanilla-tint helmet icons for the five
    metals; R196 vanilla gold_ingot for gold; the rusted helmet tint for
    rusted_iron."""
    if metal == "gold":
        return os.path.join(R196_ITEMS, "gold_ingot.png")
    return os.path.join(TEX, RAMP_FIVE.get(metal, "chain_helmet_rusted_iron.png"))


# vanilla same-type tool bases; no-analog types ride flipped analog bases
TOOL_BASES = {
    "pickaxe": "iron_pickaxe", "shovel": "iron_shovel", "axe": "iron_axe",
    "hoe": "iron_hoe", "sword": "iron_sword",
    "hatchet": ("iron_axe", True), "mattock": ("iron_hoe", True),
    "dagger": "iron_sword", "battle_axe": "iron_axe",
    "war_hammer": ("iron_pickaxe", True),
}


def load_base(spec):
    flip = False
    name = spec
    if isinstance(spec, tuple):
        name, flip = spec
    im = Image.open(os.path.join(R196_ITEMS, name + ".png")).convert("RGBA")
    return ImageOps.mirror(im) if flip else im


def remap(base, metal):
    return engine.project(base.copy(), ramp_path(metal))


def gen_worn():
    os.makedirs(ARMOR, exist_ok=True)
    for m in CHAIN_METALS:
        for layer in ("layer_1", "layer_2"):
            base = Image.open(os.path.join(R196_ARMOR, "chainmail_%s.png" % layer))
            remap(base, m).save(os.path.join(ARMOR, "%s_chainmail_%s.png" % (m, layer)))
    for m in TOOL_METALS:
        for layer in ("layer_1", "layer_2"):
            base = Image.open(os.path.join(R196_ARMOR, "iron_%s.png" % layer))
            remap(base, m).save(os.path.join(ARMOR, "%s_%s.png" % (m, layer)))


def gen_tools():
    for kind, base_spec in TOOL_BASES.items():
        base = load_base(base_spec)
        for m in TOOL_METALS:
            remap(base, m).save(os.path.join(TEX, "%s_%s.png" % (kind, m)))


# --- procedural scythe/knife, vanilla-tool icon orientation ---------------
# Composition learned from the reference project's scythe layout (shape only,
# self-drawn pixels — 条 224 user ruling): wide blade band across the top with
# the opening facing DOWN and the tip drooping at the left end; a thick staff
# descends from the blade's right end toward the bottom-left. The handheld
# mirror then presents the sweep to the player's right — the previously
# approved in-hand pose.
SCYTHE_RIDGE = ([(x, 1) for x in range(5, 10)]
                + [(x, 2) for x in range(4, 11)]
                + [(x, 3) for x in range(3, 14)])
SCYTHE_BODY = ([(3, 4), (4, 4)] + [(x, 4) for x in range(10, 14)]
               + [(3, 5)] + [(x, 5) for x in range(10, 14)])
SCYTHE_STAFF = ([(x, 6) for x in range(9, 13)]
                + [(x, 7) for x in range(8, 11)]
                + [(x, 8) for x in range(7, 10)]
                + [(x, 9) for x in range(6, 9)]
                + [(x, 10) for x in range(5, 8)]
                + [(x, 11) for x in range(4, 7)]
                + [(x, 12) for x in range(3, 6)]
                + [(x, 13) for x in range(2, 5)]
                + [(2, 14), (3, 14)])
SCYTHE_JOINT = [(9, 6), (10, 6)]
WOOD = [(122, 88, 46), (100, 70, 36)]


def top_anchor_colors(path, count=3):
    colors = [c for _, c in engine.ramp(path)]
    return list(reversed(colors))[0:count]


def gen_scythe(path, metal):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    bright = top_anchor_colors(ramp_path(metal), 2)
    for pt in SCYTHE_RIDGE:
        px[pt] = bright[0] + (255,)
    for pt in SCYTHE_BODY:
        px[pt] = bright[-1] + (255,)
    for i, pt in enumerate(SCYTHE_STAFF):
        if pt in SCYTHE_JOINT:
            px[pt] = bright[0] + (255,)
        else:
            px[pt] = WOOD[(pt[0] + pt[1]) % 2] + (255,)
    im.save(path)


def gen_knife(path):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    px = im.load()
    edge = [(176, 180, 186), (148, 152, 158)]
    body = [(120, 126, 134), (100, 106, 114)]
    # blade wedge (tip top-right, spine grows toward the handle)
    wedge = [
        (10, 1), (9, 2), (8, 3), (7, 4), (6, 5), (5, 6),
        (9, 3), (8, 4), (7, 5), (6, 6), (5, 7), (4, 8),
        (6, 6), (5, 7), (4, 8), (3, 9), (5, 8), (4, 9),
    ]
    for i, pt in enumerate(wedge[:6]):
        px[pt] = edge[i % 2] + (255,)
    for i, pt in enumerate(wedge[6:]):
        px[pt] = body[i % 2] + (255,)
    for i, pt in enumerate([(2, 10), (3, 11)]):
        px[pt] = WOOD[i % 2] + (255,)
    im.save(path)


def main():
    gen_worn()
    gen_tools()
    for m in TOOL_METALS:
        gen_scythe(os.path.join(TEX, "scythe_%s.png" % m), m)
    gen_knife(os.path.join(TEX, "knife_flint.png"))
    print("sourcereset v2: worn 26 + tools 60 + scythe 6 + knife 1")


if __name__ == "__main__":
    main()
