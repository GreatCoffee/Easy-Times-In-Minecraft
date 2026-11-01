# -*- coding: utf-8 -*-
"""metgear worn-face generator (目检批 fix 2026-11-01 ③, D-1 修订位):
chain-suite per-metal armor layers copied from the ICPM reference set —
same precedent as gen-scythe-batch.py (per-metal colors are final art).
7 chain metals x layer_1/layer_2 = 14 pngs -> assets/etim/textures/models/armor/.

Run once from the repo root:  python testharness/textures/gen-metgear-worn.py
"""
import os
import shutil

ETIM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM_ARMOR = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\models\armor"
OUT = os.path.join(ETIM, "textures", "models", "armor")

METALS = ["copper", "silver", "gold", "ancient_metal", "mithril", "adamantium", "rusted_iron"]


def main():
    os.makedirs(OUT, exist_ok=True)
    made = 0
    for metal in METALS:
        for layer in ("layer_1", "layer_2"):
            name = "%s_chainmail_%s.png" % (metal, layer)
            src = os.path.join(ICPM_ARMOR, name)
            dst = os.path.join(OUT, name)
            shutil.copyfile(src, dst)
            made += 1
    print("worn-face assets: %d png -> %s" % (made, OUT))


if __name__ == "__main__":
    main()
