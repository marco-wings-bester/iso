#!/usr/bin/env python3
"""Cut the beach's boats out of its picture so they can move, and take its
people out (they're played by villagers now, src/villagers.js).

From art/beach-source.jpg (the beach picture, with everything in it):
  public/assets/seaside.jpg          the picture without its boats and
                                     people (or the fisherman's rod and line),
                                     the background filled in behind them
  public/assets/seaside-sprites.png  the boats, packed side by side
  public/assets/seaside-overhead.png the umbrellas' canopies, over the
                                     picture at their places (the game draws
                                     them in front of whoever's under them)
  src/seasideSprites.js              where each boat is in that sheet and in
                                     the picture, and each canopy's box and
                                     the ground under it (base)

Boats are cut from the sea by colour; people by GrabCut, filled out to their
dark pixel-art outline.

Re-run after changing the picture, then scripts/build-masks.py.
Requires numpy and opencv-python.
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/beach-source.jpg'

# Boats: (x0, y0, x1, y1) in the picture.
BOATS = {
    'sail1': (0, 862, 120, 1040),
    'sail2': (416, 2652, 556, 2852),
    'row1': (132, 776, 284, 880),
    'row2': (0, 2206, 112, 2298),
    'row3': (60, 2566, 228, 2690),
}
# People, taken out of the picture.
PEOPLE = {
    'girl': (600, 1450, 660, 1556),
    'man': (990, 1950, 1050, 2060),
    'child': (326, 2430, 374, 2514),
    'fisher': (262, 2398, 328, 2508),
    'guest1': (742, 1586, 802, 1660),
    'guest2': (836, 1600, 894, 1684),
    'guest3': (1160, 1670, 1224, 1780),
    'sun1': (850, 2384, 934, 2470),
    'sun2': (1004, 2660, 1100, 2782),
}
# Umbrella canopies: the box round each, and the ground under its pole (base).
CANOPIES = {
    'pink': ((866, 2312, 1006, 2402), 2466),
    'blue': ((948, 2570, 1078, 2662), 2696),
    'cafe1': ((750, 1532, 886, 1606), 1680),
    'cafe2': ((976, 1668, 1108, 1748), 1808),
    'sand': ((350, 1816, 484, 1906), 1950),
}
# Not part of a canopy, though touching it: the sunbather's head under the pink one.
NOT_CANOPY = [(868, 2389, 914, 2410)]
# Taken out whole (a box), where cutting round them leaves bits behind.
WHOLE = ['guest1', 'sun1', 'sun2']
# The fisherman's rod (its tip to his hands), his line (the tip down to the
# float) and the ring round the float: lines of (points, width).
ROD = [([(211, 2413), (284, 2461)], 8), ([(213, 2416), (212, 2468), (203, 2572)], 6), ([(193, 2570), (221, 2570)], 14)]
PAD = 8


def water(px):
    b, g, r = (px[..., i].astype(int) for i in range(3))
    return (b > r + 30) & (g > r)


def outline_fill(crop):
    """Shapes enclosed by the dark pixel-art outlines."""
    dark = cv2.dilate((crop.mean(axis=2) < 75).astype(np.uint8), np.ones((2, 2), np.uint8))
    h, w = dark.shape
    flood = dark * 255
    ff = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(w):
        for y in (0, h - 1):
            if flood[y, x] == 0:
                cv2.floodFill(flood, ff, (x, y), 128)
    for y in range(h):
        for x in (0, w - 1):
            if flood[y, x] == 0:
                cv2.floodFill(flood, ff, (x, y), 128)
    return flood != 128


def canopy(crop):
    """An umbrella's canopy in `crop`: what's inside its dark outline, found
    from the middle out, with the outline. The outline is lighter in places,
    so the darkest cut-off that keeps the inside sealed off from the edges of
    the crop is the one used; failing that (on the sand), by colour."""
    h, w = crop.shape[:2]
    lum = crop.mean(axis=2)
    for cutoff in (80, 95, 110, 125, 140):
        for close in (3, 5):
            dark = cv2.morphologyEx((lum < cutoff).astype(np.uint8), cv2.MORPH_CLOSE, np.ones((close, close), np.uint8))
            n, lab = cv2.connectedComponents(1 - dark)
            inside = lab == lab[h // 2, w // 2]
            edges = inside[0].any() or inside[-1].any() or inside[:, 0].any() or inside[:, -1].any()
            if not edges and inside.sum() > h * w * 0.3:
                return cv2.dilate(inside.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
    # on the sand, whose colour runs into the canopy's where its outline is
    # faint: everything not sand-coloured (sand has much less blue than green)
    b, g = crop[..., 0].astype(int), crop[..., 1].astype(int)
    canopy_ish = ((b > g - 25) | (lum < 120)).astype(np.uint8)
    canopy_ish = cv2.morphologyEx(canopy_ish, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # cut thin joins to whatever touches it (a head under it, the pole), keep
    # the middle piece, fill its holes (cream stripes), then its outline again
    canopy_ish = cv2.morphologyEx(canopy_ish, cv2.MORPH_OPEN, np.ones((5, 5), np.uint8))
    n, lab = cv2.connectedComponents(canopy_ish)
    inside = (lab == lab[h // 2, w // 2]).astype(np.uint8)
    flood = inside.copy()
    cv2.floodFill(flood, np.zeros((h + 2, w + 2), np.uint8), (0, 0), 2)
    inside = (flood != 2).astype(np.uint8)
    if inside.sum() > h * w * 0.3:
        return cv2.dilate(inside, np.ones((5, 5), np.uint8)).astype(bool)
    raise SystemExit('no canopy found')


def cut(img, box, how):
    x0, y0, x1, y1 = box
    H, W = img.shape[:2]
    X0, Y0, X1, Y1 = max(0, x0 - PAD), max(0, y0 - PAD), min(W, x1 + PAD), min(H, y1 + PAD)
    crop = img[Y0:Y1, X0:X1]
    inside = np.zeros(crop.shape[:2], bool)
    inside[y0 - Y0:y1 - Y0, x0 - X0:x1 - X0] = True
    if how == 'water':
        fg = ~water(crop) & inside
    else:
        mask = np.zeros(crop.shape[:2], np.uint8)
        bgd = np.zeros((1, 65), np.float64)
        fgd = np.zeros((1, 65), np.float64)
        cv2.grabCut(crop, mask, (x0 - X0, y0 - Y0, x1 - x0, y1 - y0), bgd, fgd, 6, cv2.GC_INIT_WITH_RECT)
        fg = (mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD)
        n, lab = cv2.connectedComponents(outline_fill(crop).astype(np.uint8))
        for i in range(1, n):
            comp = lab == i
            if (comp & fg).sum() > comp.sum() * 0.25:
                fg |= comp
        fg &= inside
    fg = cv2.morphologyEx(fg.astype(np.uint8), cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    keep = np.zeros(fg.shape, bool)
    if n > 1:
        areas = stats[1:, cv2.CC_STAT_AREA]
        for i, a in enumerate(areas, 1):
            if a >= areas.max() * 0.15:
                keep |= lab == i
    full = np.zeros((H, W), bool)
    full[Y0:Y1, X0:X1] = keep
    return full


def main():
    img = cv2.imread(str(SRC))
    sprites = {}
    holes = np.zeros(img.shape[:2], np.uint8)
    for name, box in BOATS.items():
        m = cut(img, box, 'water')
        ys, xs = np.nonzero(m)
        x, y, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        rgba = cv2.cvtColor(img[y:y2, x:x2], cv2.COLOR_BGR2BGRA)
        rgba[..., 3] = m[y:y2, x:x2] * 255
        sprites[name] = {'img': rgba, 'at': [int(x), int(y)]}
        holes |= cv2.dilate(m.astype(np.uint8), np.ones((7, 7), np.uint8))
    for name, (x0, y0, x1, y1) in PEOPLE.items():
        if name in WHOLE:
            holes[y0:y1, x0:x1] = 1
        else:
            holes |= cv2.dilate(cut(img, (x0, y0, x1, y1), 'person').astype(np.uint8), np.ones((7, 7), np.uint8))
    for points, width in ROD:
        cv2.polylines(holes, [np.array(points)], False, 1, width)

    # the background behind them, with the canopies kept whole
    background = cv2.inpaint(img, holes * 255, 9, cv2.INPAINT_TELEA)
    overhead = np.zeros((*img.shape[:2], 4), np.uint8)
    canopies = {}
    for name, ((x0, y0, x1, y1), base) in CANOPIES.items():
        crop = img[y0:y1, x0:x1]
        m = canopy(crop)
        for nx0, ny0, nx1, ny1 in NOT_CANOPY:
            m[max(0, ny0 - y0):max(0, ny1 - y0), max(0, nx0 - x0):max(0, nx1 - x0)] = False
        background[y0:y1, x0:x1][m] = crop[m]
        overhead[y0:y1, x0:x1][m] = np.dstack([crop, np.full(crop.shape[:2], 255, np.uint8)])[m]
        ys, xs = np.nonzero(m)
        canopies[name] = ([int(x0 + xs.min()), int(y0 + ys.min()), int(xs.max() - xs.min() + 1), int(ys.max() - ys.min() + 1)], base)
    cv2.imwrite(str(ROOT / 'public/assets/seaside.jpg'), background, [cv2.IMWRITE_JPEG_QUALITY, 92])
    cv2.imwrite(str(ROOT / 'public/assets/seaside-overhead.png'), overhead)

    # pack the boats into one sheet, in rows
    order = sorted(sprites, key=lambda n: -sprites[n]['img'].shape[0])
    sheet_w, x, y, row_h, frames = 512, 0, 0, 0, {}
    for name in order:
        h, w = sprites[name]['img'].shape[:2]
        if x + w > sheet_w:
            x, y, row_h = 0, y + row_h + 2, 0
        frames[name] = [x, y, w, h]
        x += w + 2
        row_h = max(row_h, h)
    sheet = np.zeros((y + row_h, sheet_w, 4), np.uint8)
    for name, (fx, fy, w, h) in frames.items():
        sheet[fy:fy + h, fx:fx + w] = sprites[name]['img']
    cv2.imwrite(str(ROOT / 'public/assets/seaside-sprites.png'), sheet)

    over = ''.join(f"  {name}: {{ box: {json.dumps(box)}, base: {base} }},\n" for name, (box, base) in canopies.items())
    rows = ''.join(f"  {name}: {{ frame: {json.dumps(frames[name])}, at: {json.dumps(sprites[name]['at'])} }},\n" for name in BOATS)
    (ROOT / 'src/seasideSprites.js').write_text(
        '// Generated by scripts/cut-seaside.py — do not edit by hand.\n'
        '// The beach\'s boats: where each is in public/assets/seaside-sprites.png\n'
        '// (frame: x, y, w, h) and where its top left goes in the picture (at: x, y).\n'
        f'export const SPRITES = {{\n{rows}}};\n'
        '\n'
        '// The umbrellas\' canopies in public/assets/seaside-overhead.png (box: x, y, w, h,\n'
        '// in the picture) and the y of the ground under each (drawn in front of\n'
        '// whoever\'s behind that).\n'
        f'export const OVERHEAD = {{\n{over}}};\n'
    )
    print('seaside.jpg, seaside-sprites.png', sheet.shape[1::-1], len(frames), 'boats')


if __name__ == '__main__':
    main()
