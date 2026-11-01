# -*- coding: utf-8 -*-
"""plate worn-face mechanical check (plate 穿戴位扩展批 2026-11-01, D-3 a):
byte-identical copy face — SHA-256 per file vs the ICPM reference source,
plus the RGBA 64x32 spec.
"""
import hashlib
import os

from PIL import Image

OUT = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim\textures\models\armor"
ICPM_ARMOR = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\models\armor"

METALS = ["copper", "silver", "ancient_metal", "mithril", "adamantium", "rusted_iron"]


def sha(p):
    return hashlib.sha256(open(p, "rb").read()).hexdigest().upper()


fail = 0
for m in METALS:
    for l in ("layer_1", "layer_2"):
        name = "%s_%s.png" % (m, l)
        src = os.path.join(ICPM_ARMOR, name)
        dst = os.path.join(OUT, name)
        s, d = sha(src), sha(dst)
        im = Image.open(dst)
        ok = (s == d) and im.size == (64, 32) and im.mode == "RGBA"
        fail += 0 if ok else 1
        print("%-34s icpm=%s etim=%s spec64x32rgba=%s %s"
              % (name, s[:16], d[:16], im.size == (64, 32) and im.mode == "RGBA",
                 "PASS" if ok else "FAIL"))
print("plate worn face: %d %s" % (12, "FAIL" if fail else "PASS"))
