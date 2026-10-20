#!/usr/bin/env python3
"""Dry up the fountain in the town's square (public/assets/town.jpg): it has
stopped working (src/derikHouse.js). Its water, and the jets from its spouts,
become a dry stone basin floor, stained where the water stood.

Runs on the picture in place; once it's dry there's no water left to take
out, so running it again changes nothing. Re-run scripts/build-masks.py after
(the fountain isn't walkable either way).
Requires numpy and opencv-python.
"""
from pathlib import Path

import cv2
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
PIC = ROOT / 'public/assets/town.jpg'
BOX = (686, 1300, 170, 130)  # round the fountain's basin and spouts (x, y, w, h)
FLOOR = 1350                 # below this, inside the basin, is where the water stood

img = cv2.imread(str(PIC))
x, y, w, h = BOX
crop = img[y:y + h, x:x + w]
b, g, r = (crop[..., i].astype(int) for i in range(3))
water = (b > r + 25) & (b > 120)
foam = (r > 225) & (g > 230) & (b > 230)  # the white of the jets and splashes
m = cv2.dilate((water | foam).astype(np.uint8), np.ones((3, 3), np.uint8))
out = cv2.inpaint(crop, m * 255, 5, cv2.INPAINT_TELEA)

# the basin floor, dry: weathered stone, a darker tide line, a few dry leaves
rows = np.arange(h)[:, None]
basin = (m > 0) & (rows + y >= FLOOR)
rnd = np.random.default_rng(5)
n = basin.sum()
tone = rnd.integers(-10, 10, n)
out[basin] = np.stack([128 + tone, 146 + tone, 160 + tone], axis=1).clip(0, 255)
edge = basin & ~cv2.erode(basin.astype(np.uint8), np.ones((5, 5), np.uint8)).astype(bool)
out[edge] = (out[edge] * 0.78).astype(np.uint8)
ys, xs = np.nonzero(basin)
for i in rnd.choice(len(ys), 7, replace=False):
    cv2.rectangle(out, (int(xs[i]), int(ys[i])), (int(xs[i]) + 2, int(ys[i]) + 1), (40, 92, 150), -1)
img[y:y + h, x:x + w] = out
cv2.imwrite(str(PIC), img, [cv2.IMWRITE_JPEG_QUALITY, 92])
print(f'{PIC.relative_to(ROOT)}: fountain dried up ({int(m.sum())} px)')
