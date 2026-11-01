# -*- coding: utf-8 -*-
"""metgear asset batch mechanical check (条 219 判据: 规格/SHA/形同度/残引)."""
import glob
import hashlib
import os

from PIL import Image

ETIM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\git-workspace\etim\src\main\resources\assets\etim"
ICPM = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\references\ICPM\src\main\resources\assets\icpm\textures\item"
R196 = r"D:\OpenCodeWorkspace\Easy Times In Minecraft\mite-src\decompile\src\assets\minecraft\textures\items"

NAMES = ["shears_copper", "shears_silver", "shears_gold", "shears_mithril",
         "shears_ancient_metal", "shears_adamantium",
         "chain_gold", "chain_helmet_gold", "chain_chestplate_gold",
         "chain_leggings_gold", "chain_boots_gold"]

ARM_A = {n: "shears" for n in NAMES if n.startswith("shears_")}
ARM_B = {n: os.path.join(ETIM, "textures", "items", n.replace("_gold", "_copper") + ".png")
         for n in NAMES if n.endswith("_gold")}


def mask(im):
    return [1 if a > 128 else 0 for r, g, b, a in list(im.getdata())]


def stats(path):
    raw = open(path, "rb").read()
    im = Image.open(path).convert("RGBA")
    m = mask(im)
    lums = [0.299 * r + 0.587 * g + 0.114 * b
            for r, g, b, a in list(im.getdata()) if a > 0]
    return raw, im, m, sum(m), round(max(lums) - min(lums))


shears_ref = mask(Image.open(os.path.join(ICPM, "copper_shears.png")).convert("RGBA"))
print("== 11 generated pngs ==")
for n in NAMES:
    raw, im, m, opaque, spread = stats(os.path.join(ETIM, "textures", "items", n + ".png"))
    sha = hashlib.sha256(raw).hexdigest().upper()[:16]
    spec = im.mode == "RGBA" and im.size == (16, 16)
    if n in ARM_A:
        same = "icpm_shears_mask_same=" + str(m == shears_ref)
    else:
        same = "prev_chain_mask_same=" + str(m == mask(Image.open(ARM_B[n]).convert("RGBA")))
    print("%-26s %5dB sha=%s spec16rgba=%s opaque=%d lum_spread=%d %s"
          % (n, len(raw), sha, spec, opaque, spread, same))

print("== vanilla-borrow residual in item models ==")
resid = []
for j in glob.glob(os.path.join(ETIM, "models", "item", "*.json")):
    t = open(j, encoding="utf-8").read()
    if '"minecraft:items/shears"' in t or '"minecraft:items/chainmail' in t:
        resid.append(os.path.basename(j))
print("residuals=", resid)
