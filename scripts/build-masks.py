#!/usr/bin/env python3
"""Build the walkable areas of the picture maps (the crossroads, the beach, the town, Derik's place, the river):

  public/assets/crossroads.jpg → src/roadMask.js   the four roads at the crossroads
  public/assets/seaside.jpg    → src/beachMask.js  the village road, the sand and the jetty
  public/assets/town.jpg       → src/townMask.js   the town's paths and its square
  public/assets/derik.jpg      → src/derikMask.js  the paths at Derik's place, and his braai
  public/assets/river.jpg      → src/riverMask.js  the open ground by the river and its near sandbar

Pixels are picked by colour (the pictures are shaded, and JPEGs), with extra
boxes (the jetty's boards, a way down onto the sand), small holes (pebbles,
shells) closed over, boxes of things that share a colour (thatched roofs) left
out, and only what's connected to `start` kept.
(The farm's own path is built by scripts/build-walkmask.py.)

Re-run after changing a picture:  python3 scripts/build-masks.py
Requires Pillow and numpy.
"""
import base64
from collections import deque
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

ROOT = Path(__file__).resolve().parent.parent


def dirt(R, G, B):
    """The tan of the dirt roads."""
    return (R > G) & (G > B) & (R > 165) & (R - B > 55) & (G - B > 25) & (R - G < 70)


def road_colour(R, G, B):
    """The beach village's road (a tan a little darker than the sand)."""
    return (R >= 198) & (R <= 236) & (G >= 152) & (G <= 192) & (B >= 80) & (B <= 124) & (R - G >= 32) & (R - G <= 64)


def sand(R, G, B):
    return (R >= 228) & (G >= 192) & (G <= 228) & (B >= 116) & (B <= 170) & (R - B >= 70)


def light_path(R, G, B):
    """The paler stretch of the road out of town, between the field walls."""
    return (R > G) & (G > B) & (R > 185) & (G > 155) & (B > 100) & (R - B > 40)


def open_ground(R, G, B):
    """Grass, sand and the road, where most of the ground round about is too
    (the bushes, ferns and reeds are textured, open ground is smooth)."""
    grass = (abs(R - 124) <= 12) & (abs(G - 165) <= 12) & (abs(B - 60) <= 14)
    sandy = (R > 165) & (R > G) & (G > B) & (R - B > 45) & (G > 130)
    road = (R > 180) & (R - G > 35) & (G - B > 45)
    ground = Image.fromarray(((grass | sandy | road) * 255).astype(np.uint8))
    return np.asarray(ground.filter(ImageFilter.BoxBlur(12))) > 204


def planks(R, G, B):
    """The jetty's boards."""
    return (R >= 140) & (R <= 205) & (G >= 92) & (G <= 150) & (B >= 52) & (B <= 110) & (R - B >= 60)


MAPS = [
    {
        'image': 'public/assets/crossroads.jpg',
        'out': 'src/roadMask.js',
        'what': 'the four roads at the crossroads',
        'cell': 4,
        'start': (350, 830),  # the crossing
        'walk': lambda R, G, B: dirt(R, G, B) & ~((R > 215) & (G > 175) & (B < 100)),  # not the wheat
        'boxes': [
            ((190, 1236, 100, 64), None),     # the path off to the bottom left (to the river), joined to the road…
            ((0, 1405, 60, 30), None), ((40, 1395, 60, 28), None), ((85, 1383, 55, 27), None),  # …and its paler end, off the edge
        ],
        'exclude': [],
    },
    {
        'image': 'public/assets/seaside.jpg',
        'out': 'src/beachMask.js',
        'what': 'the village road, the sand and the jetty at the beach',
        'cell': 8,
        'start': (600, 1580),  # on the road, by the cafe
        'walk': lambda R, G, B: road_colour(R, G, B) | sand(R, G, B),
        'boxes': [
            ((250, 2290, 420, 290), planks),  # the jetty
            ((800, 2020, 140, 90), None),     # down off the road onto the sand, by the souvenir shop
        ],
        'exclude': [(940, 1050, 180, 160), (1200, 730, 208, 150)],  # thatched roofs (same colour as the road)
    },
    {
        'image': 'public/assets/town.jpg',
        'out': 'src/townMask.js',
        'what': "the town's paths and its square",
        'cell': 8,
        'close': 9,  # (the cobbles in the paths)
        'start': (760, 1500),  # below the fountain
        'walk': dirt,
        'boxes': [
            ((1000, 0, 536, 420), light_path),  # the road out, at the top right…
            ((1150, 240, 120, 80), None),       # …joined up where shadows and cobbles break it
            ((1280, 110, 130, 80), None),
            ((580, 270, 470, 60), None),        # the open grass at the top of the town (where the
            ((740, 330, 260, 100), None),       # fountain's pipe leaked), joined to the path
            # the wide, paler path right of the square, over the top of Faan's shop (the house below
            # the restaurant), and on the grass down its right side and along its front to its door
            ((900, 1290, 500, 300), lambda R, G, B: dirt(R, G, B) | light_path(R, G, B)),
            ((1316, 1470, 44, 300), None),
            ((1170, 1734, 190, 36), None),
            # and round its other side: from the path below, past the lamp and over the grass to the
            # left of its garden fence, along its front to the door
            ((860, 1850, 90, 50), None), ((900, 1800, 180, 60), None), ((1000, 1740, 90, 70), None), ((1080, 1738, 100, 32), None),
        ],
        'exclude': [
            # the houses, the cafe, the restaurant (their walls share the paths' colour) and the fountain
            (370, 330, 370, 395), (80, 600, 360, 405), (520, 750, 340, 340), (120, 1030, 360, 355),
            (1020, 400, 460, 370), (980, 880, 490, 420), (130, 1430, 460, 370),
            (930, 1560, 386, 174), (1000, 1500, 316, 60), (1080, 1462, 230, 38), (1205, 1440, 60, 22),  # (Faan's: stepped, along its roof)
            (130, 1870, 480, 420), (1020, 1980, 400, 400), (655, 1270, 230, 205),
            # paths off the sides, which the screen cuts off: only the road out at the top right leaves
            (0, 0, 140, 2752), (1396, 300, 140, 2452),
        ],
    },
    {
        'image': 'public/assets/derik.jpg',
        'out': 'src/derikMask.js',
        'what': "the paths at Derik's place, and the floor round his braai fire",
        'cell': 8,
        'close': 7,
        'start': (220, 1060),  # on the road in, below the farmhouse
        'walk': dirt,
        'boxes': [],
        'exclude': [
            (530, 300, 790, 450), (800, 750, 520, 170),  # the farmhouse and its stoep (the paths' colour), down to its steps
            (1093, 1000, 280, 280),  # the brick braai
            (927, 1287, 173, 106),  # the fire
        ],
    },
    {
        'image': 'public/assets/river.jpg',
        'out': 'src/riverMask.js',
        'what': 'the open ground by the river and its near sandbar (not the water)',
        'cell': 8,
        'close': 5,
        'start': (1060, 300),  # on the road in
        'walk': open_ground,
        'dry': lambda R, G, B: (B > R + 40) & (B > 120),  # the river: he can't wade it
        'boxes': [
            ((800, 878, 300, 27), None),    # past the lanterns, below the crates: round to the bank downstream
            ((1000, 1290, 160, 70), None),  # down the bank onto the near sandbar
            ((620, 1440, 380, 115), None),  # the near sandbar's gravel
            ((995, 600, 55, 130), None),    # past the tent's top right, between it and the fence…
            ((1060, 700, 230, 190), None),  # …onto the grass right of it, below the fence, and down
        ],
        'exclude': [
            # the camp: the tent, the crates, the bucket, the pans, a dirt pile, the sluice's top
            (850, 640, 150, 130), (950, 770, 150, 108), (705, 730, 70, 70), (685, 835, 165, 43), (555, 760, 100, 70),
            (745, 905, 130, 70),
            # fences
            (1045, 600, 235, 120), (300, 650, 230, 110), (0, 160, 210, 120), (0, 1245, 290, 150),
            # the rocker, the gravel heap beside it
            (775, 1285, 190, 130), (985, 1445, 120, 70),
            # on the far sandbar: the barrel, the bucket, the pans, a dirt pile, the sieve, the sand pile
            (355, 1650, 90, 110), (665, 1700, 80, 80), (565, 1735, 110, 50), (745, 1795, 110, 50),
            (325, 1840, 150, 75), (805, 1860, 170, 90), (530, 2000, 140, 65),
        ],
    },
]


def build(m):
    px = np.asarray(Image.open(ROOT / m['image']).convert('RGB')).astype(int)
    R, G, B = px[..., 0], px[..., 1], px[..., 2]
    walk = m['walk'](R, G, B)
    for (x, y, w, h), test in m['boxes']:  # extra colours in a box, or (None) all of it
        walk[y:y + h, x:x + w] |= True if test is None else test(R, G, B)[y:y + h, x:x + w]
    mask = Image.fromarray((walk * 255).astype(np.uint8))
    close = m.get('close', 5)
    mask = mask.filter(ImageFilter.MaxFilter(close)).filter(ImageFilter.MinFilter(close))  # close small holes
    full = np.asarray(mask) > 127
    for x, y, w, h in m['exclude']:
        full[y:y + h, x:x + w] = False
    if m.get('dry'):  # never the water itself (its blue, dilated a little)
        wet = Image.fromarray((m['dry'](R, G, B) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
        full &= np.asarray(wet) < 128

    cell = m['cell']
    h, w = full.shape
    rows, cols = h // cell, w // cell
    grid = full[:rows * cell, :cols * cell].reshape(rows, cell, cols, cell).mean((1, 3)) >= 0.5

    start = (m['start'][1] // cell, m['start'][0] // cell)
    assert grid[start], f"{m['image']}: start is not walkable"
    keep = np.zeros_like(grid)
    keep[start] = True
    q = deque([start])
    while q:
        r, c = q.popleft()
        for rr, cc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= rr < rows and 0 <= cc < cols and grid[rr, cc] and not keep[rr, cc]:
                keep[rr, cc] = True
                q.append((rr, cc))

    data = base64.b64encode(np.packbits(keep.ravel()).tobytes()).decode()
    (ROOT / m['out']).write_text(
        '// Generated by scripts/build-masks.py — do not edit by hand.\n'
        f"// Walkable cells ({m['what']}) as a row-major, MSB-first bitset, base64.\n"
        f'export const CELL = {cell};\n'
        f'export const COLS = {cols};\n'
        f'export const ROWS = {rows};\n'
        f"export const DATA = '{data}';\n"
    )
    print(f"{m['out']}: {cols}x{rows} cells, {keep.sum()} walkable")
    return keep


if __name__ == '__main__':
    for m in MAPS:
        build(m)
