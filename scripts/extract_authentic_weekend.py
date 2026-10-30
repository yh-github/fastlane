#!/usr/bin/env python3
"""
extract_authentic_weekend.py
Extracts Sierra SCI assets for Script 232 (Weekend Screen) from view.608 and view.250
into public/assets/authentic/weekend/
"""

import os
from PIL import Image

OUT_DIR = "public/assets/authentic/weekend"
os.makedirs(f"{OUT_DIR}/buttons", exist_ok=True)

# 1. Open view.608
im608 = Image.open("original_resources/floppy/view.608.bmp")
pal608 = im608.getpalette()

def save_crop_608(crop_box, out_path):
    cr = im608.crop(crop_box)
    w, h = cr.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            p = cr.getpixel((x, y))
            if p != 0:
                out.putpixel((x, y), (pal608[p*3], pal608[p*3+1], pal608[p*3+2], 255))
    out.save(out_path)

# Loop 0, Cel 0: Desk Calendar Backdrop (183x112)
print("Extracting bg_weekend.png...")
save_crop_608((0, 0, 183, 112), f"{OUT_DIR}/bg_weekend.png")

# 2. Copy standard Done button from view.250
src_done = "public/assets/authentic/status/buttons/done.png"
if os.path.exists(src_done):
    im_done = Image.open(src_done)
    im_done.save(f"{OUT_DIR}/buttons/done.png")
    print("Copied done.png successfully.")

print("All authentic weekend assets extracted successfully!")
