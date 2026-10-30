#!/usr/bin/env python3
"""
extract_authentic_status.py
Extracts Sierra SCI assets for Script 231 (Inventory/Status) and Script 238 (Goals)
from view.505 and view.501 into public/assets/authentic/status/
"""

import os
from PIL import Image

OUT_DIR = "public/assets/authentic/status"
os.makedirs(f"{OUT_DIR}/thermometers", exist_ok=True)
os.makedirs(f"{OUT_DIR}/players", exist_ok=True)
os.makedirs(f"{OUT_DIR}/buttons", exist_ok=True)

# 1. Open view.505
im505 = Image.open("original_resources/floppy/view.505.bmp")
pal505 = im505.getpalette()

def save_crop_505(crop_box, out_path):
    cr = im505.crop(crop_box)
    w, h = cr.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            p = cr.getpixel((x, y))
            if p != 0:
                out.putpixel((x, y), (pal505[p*3], pal505[p*3+1], pal505[p*3+2], 255))
    out.save(out_path)

# Loop 0, Cel 0: Goals backdrop (183x112)
print("Extracting bg_goals.png...")
save_crop_505((0, 0, 183, 112), f"{OUT_DIR}/bg_goals.png")

# Loop 4, Cel 0: Inventory backdrop (183x112)
print("Extracting bg_inventory.png...")
save_crop_505((0, 186, 183, 298), f"{OUT_DIR}/bg_inventory.png")

# Loop 1: Thermometers (11 cels, 9x52)
print("Extracting thermometers...")
for c in range(11):
    save_crop_505((c * 10, 113, c * 10 + 9, 113 + 52), f"{OUT_DIR}/thermometers/therm_{c}.png")

# Loop 2: Fine thermometers (5 cels, 7x4)
print("Extracting fine thermometers...")
for c in range(5):
    save_crop_505((c * 8, 166, c * 8 + 7, 166 + 4), f"{OUT_DIR}/thermometers/fine_therm_{c}.png")

# Loop 3: Player Badges (4 cels, 15x14)
print("Extracting player badges...")
for c in range(4):
    save_crop_505((c * 16, 171, c * 16 + 15, 171 + 14), f"{OUT_DIR}/players/player_{c+1}.png")

# 2. Extract detailed goals backdrop from view.501
im501 = Image.open("original_resources/floppy/view.501.bmp")
pal501 = im501.getpalette()

def save_crop_501(crop_box, out_path):
    cr = im501.crop(crop_box)
    w, h = cr.size
    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        for x in range(w):
            p = cr.getpixel((x, y))
            if p != 0:
                out.putpixel((x, y), (pal501[p*3], pal501[p*3+1], pal501[p*3+2], 255))
    out.save(out_path)

print("Extracting bg_detailed_goals.png...")
save_crop_501((0, 210, 183, 322), f"{OUT_DIR}/bg_detailed_goals.png")

# 3. Copy standard Done button from view.250
src_done = "public/assets/authentic/buildings/monolith_burgers/buttons/done.png"
if os.path.exists(src_done):
    im_done = Image.open(src_done)
    im_done.save(f"{OUT_DIR}/buttons/done.png")
    print("Copied done.png successfully.")

print("All status and goals assets extracted successfully!")
