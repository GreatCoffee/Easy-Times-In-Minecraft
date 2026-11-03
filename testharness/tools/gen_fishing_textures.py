# -*- coding: utf-8 -*-
"""Batch five (fishing, audit20 条 268-271) texture generation.

Nine tinted rod textures (uncast + cast bases from the R196 asset tree,
whole-image luminance-preserving multiply) + the two worm items drawn
raw (proto-green) and cooked (roast-brown). Regenerable tool — the visual
face is NOT a judgment surface; the judgement ships in [FishLog].

Run:  python testharness/tools/gen_fishing_textures.py
"""
import os
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
R196 = os.path.join(ROOT, 'mitesrc_placeholder')  # replaced below
R196 = os.path.abspath(os.path.join(ROOT, '..', '..', 'mite-src', 'decompile', 'src',
    'assets', 'minecraft', 'textures', 'items'))
OUT = os.path.join(ROOT, 'src', 'main', 'resources', 'assets', 'etim', 'textures', 'items')

METALS = {
    'flint': (105, 115, 122),
    'obsidian': (58, 40, 78),
    'copper': (208, 112, 52),
    'silver': (205, 205, 216),
    'gold': (245, 199, 79),
    'iron': (219, 219, 219),
    'mithril': (66, 199, 224),
    'adamantium': (77, 172, 104),
    'ancient_metal': (172, 137, 92),
}


def tinted(src, metal):
    m = METALS[metal]
    out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    px = src.load()
    d = out.load()
    for y in range(16):
        for x in range(16):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            luma = (r + g + b) / 3.0 / 255.0
            d[x, y] = (min(255, int(m[0] * (0.45 + 0.75 * luma))),
                       min(255, int(m[1] * (0.45 + 0.75 * luma))),
                       min(255, int(m[2] * (0.45 + 0.75 * luma))), a)
    return out


def worm(cooked):
    out = Image.new('RGBA', (16, 16), (0, 0, 0, 0))
    d = out.load()
    body = (94, 148, 62, 255) if not cooked else (150, 100, 52, 255)
    dark = (60, 100, 40, 255) if not cooked else (104, 68, 34, 255)
    path = [(2, 12), (4, 10), (6, 9), (7, 7), (9, 6), (11, 6), (13, 8)]
    for i, (x, y) in enumerate(path):
        col = body if i % 2 == 0 else dark
        d[x, y] = col
        if x + 1 < 16:
            d[x + 1, y] = col
        d[x, y - 1] = col
    d[13, 9] = dark  # tail tip
    d[2, 13] = dark
    return out


def main():
    if not os.path.isdir(R196):
        raise SystemExit('R196 asset tree missing: ' + R196)
    uncast = Image.open(os.path.join(R196, 'fishing_rod_uncast.png')).convert('RGBA')
    cast = Image.open(os.path.join(R196, 'fishing_rod_cast.png')).convert('RGBA')
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    for metal in METALS:
        tinted(uncast, metal).save(os.path.join(OUT, 'rod_%s_uncast.png' % metal))
        tinted(cast, metal).save(os.path.join(OUT, 'rod_%s_cast.png' % metal))
    worm(False).save(os.path.join(OUT, 'worm_raw.png'))
    worm(True).save(os.path.join(OUT, 'worm_cooked.png'))
    print('fishing textures written:', 9 * 2 + 2, 'files ->', OUT)


if __name__ == '__main__':
    main()
