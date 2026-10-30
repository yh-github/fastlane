#!/usr/bin/env python3
"""
extract_authentic_newspaper_and_diploma.py
Extracts Sierra SCI assets for:
- Script 215 (Newspaper) from view.603 into public/assets/authentic/newspaper/
- Script 230 (Diploma) from view.607 into public/assets/authentic/diploma/
"""

import os
from PIL import Image

def save_crop_palette(im, crop_box, out_path):
    pal = im.getpalette()
    cr = im.crop(crop_box)
    w, h = cr.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            p = cr.getpixel((x, y))
            if p != 0:
                out.putpixel((x, y), (pal[p*3], pal[p*3+1], pal[p*3+2], 255))
    out.save(out_path)

# ==========================================
# 1. NEWSPAPER (view.603)
# ==========================================
print("Extracting Newspaper assets...")
NP_DIR = "public/assets/authentic/newspaper"
os.makedirs(f"{NP_DIR}/spinning", exist_ok=True)
os.makedirs(f"{NP_DIR}/buttons", exist_ok=True)

im603 = Image.open("original_resources/floppy/view.603.bmp")

# Loop 1, Cel 0: 183x112 front page at (0, 56, 183, 168)
save_crop_palette(im603, (0, 56, 183, 168), f"{NP_DIR}/bg_newspaper.png")

# Loop 0, Cels 0..5: Spinning newspaper animation (80x55 each)
for i in range(6):
    save_crop_palette(im603, (i * 81, 0, i * 81 + 80, 55), f"{NP_DIR}/spinning/spin_{i}.png")

# Copy standard Done button
src_done = "public/assets/authentic/status/buttons/done.png"
if os.path.exists(src_done):
    im_done = Image.open(src_done)
    im_done.save(f"{NP_DIR}/buttons/done.png")

print("Newspaper assets extracted successfully!")

# ==========================================
# 2. DIPLOMA (view.607)
# ==========================================
print("Extracting Diploma assets...")
DIP_DIR = "public/assets/authentic/diploma"
os.makedirs(f"{DIP_DIR}/scroll", exist_ok=True)
os.makedirs(f"{DIP_DIR}/buttons", exist_ok=True)

im607 = Image.open("original_resources/floppy/view.607.bmp")

# Loop 1, Cel 0: 183x112 modal background at (0, 86, 183, 198)
save_crop_palette(im607, (0, 86, 183, 198), f"{DIP_DIR}/bg_diploma.png")

# Loop 0, Cels 0..4: Unrolling scroll animation (153x85 each)
for i in range(5):
    save_crop_palette(im607, (i * 154, 0, i * 154 + 153, 85), f"{DIP_DIR}/scroll/scroll_{i}.png")

# Copy standard Done button
if os.path.exists(src_done):
    im_done = Image.open(src_done)
    im_done.save(f"{DIP_DIR}/buttons/done.png")

print("Diploma assets extracted successfully!")
