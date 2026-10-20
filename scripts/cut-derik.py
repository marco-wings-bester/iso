#!/usr/bin/env python3
"""Cut the cows and sheep out of Derik's place so they can move.

From art/derik-source.jpg (the picture with its animals in it):
  public/assets/derik.jpg          the picture without its animals, the grass
                                   filled in behind them
  public/assets/derik-sprites.png  the animals, packed side by side, and the
                                   fire pit gone cold (no flames: the fire
                                   only burns on the day of the braai)
  src/derikSprites.js              where each is in that sheet and in the picture

The animals are cut from the grass by colour (what isn't green), and the grass
behind them (and their shadows) filled in from round them; they stay about
where they were, so they mostly cover that.

Re-run after changing the picture, then scripts/build-masks.py.
Requires numpy and opencv-python.
"""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'art/derik-source.jpg'

# The animals: (x, y, w, h) in the picture.
ANIMALS = {
    'cow1': (66, 232, 96, 108),
    'sheep1': (38, 348, 84, 102),
    'cow2': (357, 650, 104, 112),
    'sheep2': (203, 728, 96, 78),
    'sheep3': (338, 1500, 80, 70),
    'sheep4': (305, 1730, 80, 80),
    'cow3': (130, 1738, 114, 130),
    'sheep5': (778, 1868, 60, 92),
    'sheep6': (842, 1956, 70, 76),
    'sheep7': (298, 2090, 90, 70),
}


# The fire in the boma: a box round its flames (x, y, w, h).
FIRE = (966, 1218, 100, 132)


def flames(px):
    """The fire's orange, yellow and red."""
    b, g, r = (px[..., i].astype(int) for i in range(3))
    return (r > 215) & ((b < 65) | (g > 195))  # (the floor's tan is darker, and bluer)


def cold_fire(src):
    """The box round the fire with its flames gone: above the stone ring, the
    floor filled in where they were; inside it, grey ash and a few charred
    sticks."""
    x, y, w, h = FIRE
    crop = src[y:y + h, x:x + w].copy()
    ring = int(h * 0.62)  # where the ring's back edge is, in the box
    b, g, r = (crop[..., i].astype(int) for i in range(3))
    rows = np.arange(h)[:, None]
    warm = ((r > 204) & (r - b > 80)) | flames(crop)  # flames, and their glow on the floor (not the grey stones)
    m = cv2.dilate(warm.astype(np.uint8), np.ones((5, 5), np.uint8))
    out = cv2.inpaint(crop, m * 255, 5, cv2.INPAINT_TELEA)
    # in the ring: ash where the fire was, charred sticks across it
    cx, cy = w // 2, int(h * 0.78)
    cols = np.arange(w)[None, :]
    inside = ((cols - cx) / (w * 0.3)) ** 2 + ((rows - cy) / (h * 0.12)) ** 2 < 1
    rnd = np.random.default_rng(3).integers(-12, 12, inside.sum())
    out[inside] = np.stack([52 + rnd, 56 + rnd, 62 + rnd], axis=1).clip(0, 255).astype(np.uint8)
    for (dx0, dy0, dx1, dy1) in ((-22, -4, 14, 6), (-12, 8, 20, -6), (-4, -8, 6, 10)):
        cv2.line(out, (cx + dx0, cy + dy0), (cx + dx1, cy + dy1), (30, 34, 40), 5)
        cv2.line(out, (cx + dx0, cy + dy0 - 1), (cx + dx1, cy + dy1 - 1), (52, 58, 66), 2)
    return cv2.cvtColor(out, cv2.COLOR_BGR2BGRA)


def grass(px):
    b, g, r = (px[..., i].astype(int) for i in range(3))
    return (g > r + 8) & (g > b + 20)


def animal(crop):
    """The animal in `crop`: what isn't grass, its biggest piece and what's
    right by it (its legs), holes filled."""
    fg = (~grass(crop)).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg)
    body = (lab == 1 + np.argmax(stats[1:, cv2.CC_STAT_AREA])).astype(np.uint8)
    near = cv2.dilate(body, np.ones((7, 7), np.uint8)).astype(bool)
    keep = body.copy()
    for i in range(1, n):
        if (near & (lab == i)).any():
            keep[lab == i] = 1
    h, w = keep.shape
    flood = keep.copy()
    ff = np.zeros((h + 2, w + 2), np.uint8)
    for x in range(w):
        for y in (0, h - 1):
            if flood[y, x] == 0:
                cv2.floodFill(flood, ff, (x, y), 2)
    for y in range(h):
        for x in (0, w - 1):
            if flood[y, x] == 0:
                cv2.floodFill(flood, ff, (x, y), 2)
    return cv2.dilate((flood != 2).astype(np.uint8), np.ones((3, 3), np.uint8)).astype(bool)


def hole(img, x, y, w, h, m):
    """Where the animal at (x, y, w, h) and its shadow were (`m`: the animal in
    that box): its own pixels, and the grass darker than the grass round it
    just under it."""
    x0, y0, x1, y1 = max(0, x - 6), max(0, y - 4), x + w + 6, y + h + 14
    area = img[y0:y1, x0:x1]
    lum = area.mean(axis=2)
    ring = grass(area)
    shadow = ring & (lum < np.median(lum[ring]) * 0.94)
    shadow[: (y + h // 2) - y0] = False  # only under it
    out = np.zeros(img.shape[:2], np.uint8)
    out[y0:y1, x0:x1] = shadow
    out[y:y + h, x:x + w] |= m.astype(np.uint8)
    out = cv2.morphologyEx(out, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
    return cv2.dilate(out, np.ones((5, 5), np.uint8))


def main():
    src = cv2.imread(str(SRC))
    holes = np.zeros(src.shape[:2], np.uint8)
    sprites = {}
    for name, (x, y, w, h) in ANIMALS.items():
        crop = src[y:y + h, x:x + w]
        m = animal(crop)
        ys, xs = np.nonzero(m)
        x0, y0, x1, y1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
        rgba = cv2.cvtColor(crop[y0:y1, x0:x1], cv2.COLOR_BGR2BGRA)
        rgba[..., 3] = m[y0:y1, x0:x1] * 255
        sprites[name] = {'img': rgba, 'at': [int(x + x0), int(y + y0)]}
        holes |= hole(src, x, y, w, h, m)
    # the grass filled in behind them (the game draws a shadow under each)
    img = cv2.inpaint(src, holes * 255, 5, cv2.INPAINT_TELEA)
    cv2.imwrite(str(ROOT / 'public/assets/derik.jpg'), img, [cv2.IMWRITE_JPEG_QUALITY, 92])

    # pack them (and the cold fire) into one sheet, in a row
    sprites['coldFire'] = {'img': cold_fire(src), 'at': [FIRE[0], FIRE[1]]}
    x, frames = 0, {}
    sheet_h = max(s['img'].shape[0] for s in sprites.values())
    sheet_w = sum(s['img'].shape[1] + 2 for s in sprites.values())
    sheet = np.zeros((sheet_h, sheet_w, 4), np.uint8)
    for name, s in sprites.items():
        h, w = s['img'].shape[:2]
        sheet[:h, x:x + w] = s['img']
        frames[name] = [x, 0, w, h]
        x += w + 2
    cv2.imwrite(str(ROOT / 'public/assets/derik-sprites.png'), sheet)

    lines = [
        '// Generated by scripts/cut-derik.py — do not edit by hand.',
        "// The animals at Derik's place: where each is in public/assets/derik-sprites.png",
        '// (frame: x, y, w, h) and where its top left goes in the picture (at: x, y);',
        '// and the fire pit gone cold, to lie over the fire when it is out.',
        'export const ANIMALS = {',
        *[f'  {n}: {{ frame: [{", ".join(map(str, frames[n]))}], at: [{", ".join(map(str, sprites[n]["at"]))}] }},' for n in sprites if n != 'coldFire'],
        '};',
        f'export const COLD_FIRE = {{ frame: [{", ".join(map(str, frames["coldFire"]))}], at: [{", ".join(map(str, sprites["coldFire"]["at"]))}] }};',
        '',
    ]
    (ROOT / 'src/derikSprites.js').write_text('\n'.join(lines))
    print('\n'.join(lines))


main()
