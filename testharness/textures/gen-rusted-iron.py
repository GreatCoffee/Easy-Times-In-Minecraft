# -*- coding: utf-8 -*-
"""B3 rusted-iron asset generator (批文 §二-9, B2 程序化重染色方案沿用).

19 gear models+textures recolor from the ETIM B2 copper set; arrow + shears
recolor from the ICPM copper set (ETIM has no copper arrow/shears). The
transform: hue shift toward rust red-brown + slight desaturation/darkening.
"""
import colorsys
import os
import struct
import zlib

from PIL import Image

ROOT = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\item"
MODELS = os.path.join(ROOT, "models", "item")
TEX = os.path.join(ROOT, "textures", "items")

GEAR = ["pickaxe", "shovel", "axe", "hoe", "hatchet", "mattock", "sword", "dagger",
        "battle_axe", "war_hammer", "helmet", "chestplate", "leggings", "boots",
        "chain_helmet", "chain_chestplate", "chain_leggings", "chain_boots", "chain"]
EXTRA = [("arrow", os.path.join(ICPM, "copper_arrow.png"), "item/generated"),
         ("shears", os.path.join(ICPM, "copper_shears.png"), "item/handheld")]


def rustify(im):
    """Copper hue (~25-30 deg orange) -> rust red-brown: hue +14 deg toward red,
    saturation x0.82, value x0.96. Alpha preserved."""
    im = im.convert("RGBA")
    px = im.load()
    for y in range(im.height):
        for x in range(im.width):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255.0, g / 255.0, b / 255.0)
            h = (h - 14.0 / 360.0) % 1.0
            s *= 0.82
            v *= 0.96
            r2, g2, b2 = colorsys.hsv_to_rgb(h, min(s, 1.0), min(v, 1.0))
            px[x, y] = (int(r2 * 255), int(g2 * 255), int(b2 * 255), a)
    return im


def main():
    made = 0
    for kind in GEAR + [k for k, _, _ in EXTRA]:
        src = os.path.join(TEX, kind + "_copper.png") if kind in GEAR else dict((k, p) for k, p, _ in EXTRA)[kind]
        dst_png = os.path.join(TEX, kind + "_rusted_iron.png")
        rustify(Image.open(src)).save(dst_png)
        made += 1
    for kind in GEAR:
        parent = "item/generated" if kind in ("chain",) else "item/handheld"
        js = '{"parent":"minecraft:%s","textures":{"layer0":"etim:items/%s_rusted_iron"}}' % (parent, kind)
        with open(os.path.join(MODELS, kind + "_rusted_iron.json"), "w", newline="\n") as f:
            f.write(js)
        made += 1
    # arrow + shears models
    with open(os.path.join(MODELS, "arrow_rusted_iron.json"), "w", newline="\n") as f:
        f.write('{"parent":"minecraft:item/generated","textures":{"layer0":"etim:items/arrow_rusted_iron"}}')
    with open(os.path.join(MODELS, "shears_rusted_iron.json"), "w", newline="\n") as f:
        f.write('{"parent":"minecraft:item/handheld","textures":{"layer0":"etim:items/shears_rusted_iron"}}')
    made += 2
    print("generated:", made, "files (21 png + 21 json)")


if __name__ == "__main__":
    main()
