# -*- coding: utf-8 -*-
"""scythe/knife + 箭合成面 batch asset generator (批文 §二.9).

12 sprites copy from the ICPM reference set (per-metal colors are the final
art — no recolor pass, unlike gen-rusted-iron.py which recolors copper→rust).
sinew is procedural: three pale diagonal strands on transparency.

Run once from the repo root:  python testharness/textures/gen-scythe-batch.py
"""
import os

from PIL import Image

ROOT = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\item"
MODELS = os.path.join(ROOT, "models", "item")
TEX = os.path.join(ROOT, "textures", "items")

# (etim name, ICPM sprite, model parent)
COPIES = [
    ("scythe_copper", "copper_scythe.png", "item/handheld"),
    ("scythe_silver", "silver_scythe.png", "item/handheld"),
    ("scythe_mithril", "mithril_scythe.png", "item/handheld"),
    ("scythe_adamantium", "adamantium_scythe.png", "item/handheld"),
    ("scythe_ancient_metal", "ancient_metal_scythe.png", "item/handheld"),
    ("scythe_rusted_iron", "rusted_iron_scythe.png", "item/handheld"),
    ("knife_flint", "flint_knife.png", "item/handheld"),
    ("arrow_copper", "copper_arrow.png", "item/generated"),
    ("arrow_silver", "silver_arrow.png", "item/generated"),
    ("arrow_mithril", "mithril_arrow.png", "item/generated"),
    ("arrow_adamantium", "adamantium_arrow.png", "item/generated"),
    ("arrow_ancient_metal", "ancient_metal_arrow.png", "item/generated"),
]

STRANDS = [(4, (232, 222, 205)), (8, (214, 200, 178)), (12, (196, 178, 152))]


def write_model(name, parent):
    with open(os.path.join(MODELS, name + ".json"), "w") as f:
        f.write('{"parent":"minecraft:%s","textures":{"layer0":"etim:items/%s"}}' % (parent, name))


def gen_sinew(path):
    im = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for off, color in STRANDS:
        for y in range(16):
            x = (y + off) % 16
            im.putpixel((x, y), color + (255,))
            if y % 3 != 2:
                im.putpixel((x, (y + 1) % 16), color + (255,))
    im.save(path)


def main():
    for name, sprite, parent in COPIES:
        with open(os.path.join(ICPM, sprite), "rb") as src, \
             open(os.path.join(TEX, name + ".png"), "wb") as dst:
            dst.write(src.read())
        write_model(name, parent)
    gen_sinew(os.path.join(TEX, "sinew.png"))
    write_model("sinew", "item/generated")
    print("scythe-batch assets: %d copies + sinew" % len(COPIES))


if __name__ == "__main__":
    main()
