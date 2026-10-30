#!/usr/bin/env python3
"""
extract_authentic_lottery_and_willy.py
Extracts Sierra SCI assets from view.340 for:
- Script 116 (Lottery ticket & scratchers) into public/assets/authentic/lottery/
- Script 114 (Wild Willy robbery animations) into public/assets/authentic/willy/
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

im340 = Image.open("original_resources/floppy/view.340.bmp")

# ==========================================
# 1. LOTTERY TICKET (Script 116)
# ==========================================
print("Extracting Lottery assets...")
LOT_DIR = "public/assets/authentic/lottery"
os.makedirs(f"{LOT_DIR}/cels", exist_ok=True)
os.makedirs(f"{LOT_DIR}/buttons", exist_ok=True)

# Main ticket backdrop (86x84)
save_crop_palette(im340, (0, 30, 86, 114), f"{LOT_DIR}/ticket.png")

# Numbers / dollar values (Loop 0, 8 cels of 44x29)
for i in range(8):
    save_crop_palette(im340, (i * 45, 0, i * 45 + 44, 29), f"{LOT_DIR}/cels/num_{i}.png")

# Silver scratch coatings (Loop 2, 8 cels of 24x25)
for i in range(8):
    save_crop_palette(im340, (i * 25, 115, i * 25 + 24, 140), f"{LOT_DIR}/cels/scratch_{i}.png")

# Copy standard Done button
src_done = "public/assets/authentic/status/buttons/done.png"
if os.path.exists(src_done):
    im_done = Image.open(src_done)
    im_done.save(f"{LOT_DIR}/buttons/done.png")

print("Lottery assets extracted successfully!")

# ==========================================
# 2. WILD WILLY (Script 114)
# ==========================================
print("Extracting Wild Willy assets...")
WILLY_DIR = "public/assets/authentic/willy"
os.makedirs(f"{WILLY_DIR}/walk", exist_ok=True)
os.makedirs(f"{WILLY_DIR}/snatch", exist_ok=True)

# Willy walking / sneaking (row at y=167..192: 6 cels of ~14x25)
for i in range(6):
    save_crop_palette(im340, (i * 15, 167, i * 15 + 14, 192), f"{WILLY_DIR}/walk/willy_walk_{i}.png")

# Willy running / fleeing (row at y=193..218: 6 cels of ~14x25)
for i in range(6):
    save_crop_palette(im340, (i * 15, 193, i * 15 + 14, 218), f"{WILLY_DIR}/walk/willy_flee_{i}.png")

# Willy mugging / snatching (rows at y=219..244 and 245..270: 19x25)
save_crop_palette(im340, (0, 219, 19, 244), f"{WILLY_DIR}/snatch/willy_snatch_0.png")
save_crop_palette(im340, (0, 245, 19, 270), f"{WILLY_DIR}/snatch/willy_snatch_1.png")

print("Wild Willy assets extracted successfully!")
