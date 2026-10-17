#!/usr/bin/env python3
"""Cut the beach's people and boats out of its picture, so they can move.

From art/beach-source.jpg (the beach picture, with everything in it):
  public/assets/seaside.jpg          the picture with the things that move
                                     about (boats, the two people strolling,
                                     the hopping child) taken out and the
                                     background filled in behind them
  public/assets/seaside-sprites.png  every cut-out, packed side by side
  src/seasideSprites.js              where each one is in that sheet and in
                                     the picture

Things that only move on the spot (the fisherman, cafe guests, sunbathers)
stay in the picture too, under their cut-outs. Boats are cut from the sea by
colour; people by GrabCut, filled out to their dark pixel-art outline.

Re-run after changing the picture, then scripts/build-masks.py.
Requires numpy and opencv-python.
"""
import json
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/beach-source.jpg'

# name: (x0, y0, x1, y1) in the picture, how to cut it, and whether it moves
# away from its spot (then the background behind it is filled in)
THINGS = {
    'sail1': ((0, 862, 120, 1040), 'water', True),
    'sail2': ((416, 2652, 556, 2852), 'water', True),
    'row1': ((132, 776, 284, 880), 'water', True),
    'row2': ((0, 2206, 112, 2298), 'water', True),
    'row3': ((60, 2566, 228, 2690), 'water', True),
    'girl': ((600, 1450, 660, 1556), 'person', True),
    'man': ((990, 1950, 1050, 2060), 'person', True),
    'child': ((326, 2430, 374, 2514), 'person', True),
    'fisher': ((262, 2398, 328, 2508), 'person', False),
    'guest2': ((836, 1600, 894, 1684), 'person', False),
    'guest3': ((1160, 1670, 1224, 1780), 'person', False),
    'sun1': ((850, 2384, 934, 2470), 'person', False),
    'sun2': ((1010, 2664, 1074, 2756), 'person', False),
}
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
    for name, (box, how, moves) in THINGS.items():
        m = cut(img, box, how)
        ys, xs = np.nonzero(m)
        x, y, x2, y2 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        rgba = cv2.cvtColor(img[y:y2, x:x2], cv2.COLOR_BGR2BGRA)
        rgba[..., 3] = m[y:y2, x:x2] * 255
        sprites[name] = {'img': rgba, 'at': [int(x), int(y)]}
        if moves:
            holes |= cv2.dilate(m.astype(np.uint8), np.ones((7, 7), np.uint8))

    # the background behind the things that move away
    background = cv2.inpaint(img, holes * 255, 9, cv2.INPAINT_TELEA)
    cv2.imwrite(str(ROOT / 'public/assets/seaside.jpg'), background, [cv2.IMWRITE_JPEG_QUALITY, 90])

    # pack the cut-outs into one sheet, in rows
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

    rows = ''.join(f"  {name}: {{ frame: {json.dumps(frames[name])}, at: {json.dumps(sprites[name]['at'])} }},\n" for name in THINGS)
    (ROOT / 'src/seasideSprites.js').write_text(
        '// Generated by scripts/cut-seaside.py — do not edit by hand.\n'
        '// The beach\'s people and boats: where each is in public/assets/seaside-sprites.png\n'
        '// (frame: x, y, w, h) and where its top left goes in the picture (at: x, y).\n'
        f'export const SPRITES = {{\n{rows}}};\n'
    )
    print('seaside.jpg, seaside-sprites.png', sheet.shape[1::-1], len(frames), 'sprites')


if __name__ == '__main__':
    main()
