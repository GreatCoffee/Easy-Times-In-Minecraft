# -*- coding: utf-8 -*-
"""Shared luminance-structure remap engine (asset-batch methodology, 条 218
D-1 用户裁定的程序生成本体; reused by gen-metgear-assets.py and the
sourcereset hot-fix, 2026-11-01)."""
from PIL import Image  # noqa: F401  (kept import parity with callers)

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
