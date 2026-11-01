# -*- coding: utf-8 -*-
"""plate worn-face generator (plate 穿戴位扩展批 2026-11-01, D-1 a):
per-metal plate armor layers copied from the ICPM reference set —
direct-copy face, same precedent as gen-metgear-worn.py (chain suite).
6 TOOL_METALS x layer_1/layer_2 = 12 pngs -> assets/etim/textures/models/armor/.

Run once from the repo root:  python testharness/textures/gen-metgear-plate.py
"""
import os
import shutil

ETIM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM_ARMOR = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\models\armor"
OUT = os.path.join(ETIM, "textures", "models", "armor")

# ETIMMetals.TOOL_METALS order (gold/iron keep vanilla — no plate items).
METALS = ["copper", "silver", "ancient_metal", "mithril", "adamantium", "rusted_iron"]


def main():
    os.makedirs(OUT, exist_ok=True)
    made = 0
    for metal in METALS:
        for layer in ("layer_1", "layer_2"):
            name = "%s_%s.png" % (metal, layer)
            src = os.path.join(ICPM_ARMOR, name)
            dst = os.path.join(OUT, name)
            shutil.copyfile(src, dst)
            made += 1
    print("plate worn-face assets: %d png -> %s" % (made, OUT))


if __name__ == "__main__":
    main()
