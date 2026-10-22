#!/usr/bin/env python3
"""
extract_authentic_assets.py
Extracts and converts original Sierra SCI resources into web-friendly transparent PNGs
and metadata manifests for the authentic GUI.
"""

import os
import json
from PIL import Image

OUT_DIR = "public/assets/authentic"
os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(f"{OUT_DIR}/homes", exist_ok=True)
os.makedirs(f"{OUT_DIR}/doors", exist_ok=True)

print("1. Extracting Board...")
board = Image.open("original_resources/floppy/pic.011.bmp")
board.save(f"{OUT_DIR}/board.png")

print("2. Extracting Rooms 1-5...")
for i in range(1, 6):
    room = Image.open(f"original_resources/floppy/pic.00{i}.bmp")
    room.save(f"{OUT_DIR}/homes/room_{i}.png")

print("3. Extracting Building Places & Doors...")
BUILDING_PLACES = {
    "low_cost_housing": { "doorLoop": 0, "doorX": 144, "doorY": 30, "hitbox": [10, 130, 43, 190], "place": [134, 2] },
    "rent_office":      { "doorLoop": 1, "doorX": 105, "doorY": 29, "hitbox": [10, 68, 43, 129],  "place": [85, 3] },
    "security":         { "doorLoop": 2, "doorX": 29,  "doorY": 44, "hitbox": [10, 7, 43, 67],    "place": [9, 2] },
    "blacks_market":    { "doorLoop": 3, "doorX": 46,  "doorY": 105, "hitbox": [69, 24, 114, 67],  "place": [26, 70] },
    "bank":             { "doorLoop": 4, "doorX": 20,  "doorY": 147, "hitbox": [119, 7, 154, 67],  "place": [11, 92] },
    "factory":          { "doorLoop": 5, "doorX": 50,  "doorY": 181, "hitbox": [155, 7, 192, 67],  "place": [25, 134] },
    "employment_office":{ "doorLoop": 6, "doorX": 97,  "doorY": 183, "hitbox": [168, 68, 192, 128],"place": [79, 151] },
    "university":       { "doorLoop": 7, "doorX": 220, "doorY": 179, "hitbox": [158, 190, 192, 250],"place": [190, 141] },
    "socket_city":      { "doorLoop": 8, "doorX": 277, "doorY": 183, "hitbox": [133, 251, 192, 311],"place": [256, 133] },
    "qt_clothing":      { "doorLoop": 9, "doorX": 277, "doorY": 113, "hitbox": [82, 251, 118, 311],"place": [257, 80] },
    "burger_palace":    { "doorLoop": 10, "doorX": 288, "doorY": 75, "hitbox": [44, 251, 81, 311], "place": [264, 32] },
    "z_mart":           { "doorLoop": 11, "doorX": 282, "doorY": 34, "hitbox": [10, 251, 43, 311], "place": [258, 2] },
    "pawn_shop":        { "doorLoop": 12, "doorX": 221, "doorY": 34, "hitbox": [10, 191, 43, 250], "place": [201, 4] },
}

with open(f"{OUT_DIR}/places.json", "w") as f:
    json.dump(BUILDING_PLACES, f, indent=2)

doors_bmp = Image.open("original_resources/floppy/view.751.bmp")
y_starts = [0, 9, 21, 34, 49, 62, 74, 88, 101, 116, 128, 139, 151]
widths = [8, 7, 12, 14, 9, 10, 10, 10, 14, 9, 14, 25, 10]
heights = [8, 11, 12, 14, 12, 11, 13, 12, 14, 11, 10, 11, 12]

door_manifest = {}
pal751 = doors_bmp.getpalette()

for b_id, info in BUILDING_PLACES.items():
    loop = info["doorLoop"]
    y = y_starts[loop]
    w = widths[loop]
    h = heights[loop]
    
    cels = []
    for c in range(4):
        cx = c * (w + 1)
        cel_im = Image.new("RGBA", (w, h))
        for py in range(h):
            for px in range(w):
                p = doors_bmp.getpixel((cx + px, y + py))
                if p != 255 and p != 0:
                    r, g, b = pal751[p*3 : p*3+3]
                    cel_im.putpixel((px, py), (r, g, b, 255))
        cel_filename = f"doors/{b_id}_cel_{c}.png"
        cel_im.save(f"{OUT_DIR}/{cel_filename}")
        cels.append(cel_filename)
        
    door_manifest[b_id] = {
        "width": w,
        "height": h,
        "doorX": info["doorX"],
        "doorY": info["doorY"],
        "cels": cels
    }

with open(f"{OUT_DIR}/doors.json", "w") as f:
    json.dump(door_manifest, f, indent=2)

print("4. Extracting Rooftop Occluder (picPatch)...")
view0_bmp = Image.open("original_resources/floppy/view.000.bmp")
pal0 = view0_bmp.getpalette()
roof_im = Image.new("RGBA", (183, 25))
for py in range(25):
    for px in range(183):
        p = view0_bmp.getpixel((px, 114 + py))
        if p != 255 and p != 0:
            r, g, b = pal0[p*3 : p*3+3]
            roof_im.putpixel((px, py), (r, g, b, 255))
roof_im.save(f"{OUT_DIR}/roof_patch.png")

os.makedirs(f"{OUT_DIR}/marbles", exist_ok=True)
marbles_info = []
# Loop 2 in view.000 contains the authentic 9x8 spherical shaded player marbles (publicmarble in script.001)
for c in range(4):
    cx = c * 10
    m_im = Image.new("RGBA", (9, 8))
    for py in range(8):
        for px in range(9):
            p = view0_bmp.getpixel((cx + px, 139 + py))
            if p != 255 and p != 0:
                r, g, b = pal0[p*3 : p*3+3]
                m_im.putpixel((px, py), (r, g, b, 255))
    m_file = f"marbles/marble_{c}.png"
    m_im.save(f"{OUT_DIR}/{m_file}")
    marbles_info.append(m_file)

print("5. Extracting Robber Sprites (view.340)...")
os.makedirs(f"{OUT_DIR}/robber", exist_ok=True)
robber_bmp = Image.open("original_resources/floppy/view.340.bmp")
pal340 = robber_bmp.getpalette()

print("6. Extracting Workplace Punch Card (view.750)...")
punch_bmp = Image.open("original_resources/floppy/view.750.bmp")
pal750 = punch_bmp.getpalette()
os.makedirs(f"{OUT_DIR}/punch_card", exist_ok=True)
punch_cels = []
for c in range(4):
    cx = c * 69
    p_im = Image.new("RGBA", (68, 55))
    for py in range(55):
        for px in range(68):
            p = punch_bmp.getpixel((cx + px, py))
            if p != 255 and p != 0:
                r, g, b = pal750[p*3 : p*3+3]
                p_im.putpixel((px, py), (r, g, b, 255))
    p_file = f"punch_card/punch_{c}.png"
    p_im.save(f"{OUT_DIR}/{p_file}")
    punch_cels.append(p_file)

with open(f"{OUT_DIR}/punch_card.json", "w") as f:
    json.dump({ "width": 68, "height": 55, "cels": punch_cels }, f, indent=2)

print("7. Extracting Durables (view.702)...")
view702_bmp = Image.open("original_resources/floppy/view.702.bmp")
pal702 = view702_bmp.getpalette()
durables = {}
d_specs = {
    "tv": { "w": 21, "h": 33, "cx": 184, "cy": 0 },
    "vcr": { "w": 21, "h": 16, "cx": 206, "cy": 0 },
    "books": { "w": 16, "h": 21, "cx": 228, "cy": 0 },
    "stereo": { "w": 15, "h": 28, "cx": 245, "cy": 0 },
}
for name, spec in d_specs.items():
    d_im = Image.new("RGBA", (spec["w"], spec["h"]))
    for py in range(spec["h"]):
        for px in range(spec["w"]):
            if spec["cx"] + px < view702_bmp.size[0] and spec["cy"] + py < view702_bmp.size[1]:
                p = view702_bmp.getpixel((spec["cx"] + px, spec["cy"] + py))
                if p != 255 and p != 0:
                    r, g, b = pal702[p*3 : p*3+3]
                    d_im.putpixel((px, py), (r, g, b, 255))
    d_file = f"homes/durable_{name}.png"
    d_im.save(f"{OUT_DIR}/{d_file}")
    durables[name] = d_file

with open(f"{OUT_DIR}/durables.json", "w") as f:
    json.dump(durables, f, indent=2)

print("8. Extracting Building Rooftop Occluders (Bank, Factory, Socket City, QT, Clock)...")
os.makedirs(f"{OUT_DIR}/occluders", exist_ok=True)
board_rgba = board.convert("RGBA")
occluders_meta = {
    "bank_roof": { "x": 7, "y": 119, "w": 61, "h": 35, "doorCutout": { "x": 9, "y": 17, "w": 9, "h": 12 } },
    "factory_roof": { "x": 7, "y": 134, "w": 61, "h": 47, "doorCutout": { "x": 38, "y": 37, "w": 10, "h": 11 } },
    "socket_city_roof": { "x": 251, "y": 133, "w": 61, "h": 48, "doorCutout": { "x": 19, "y": 37, "w": 14, "h": 14 } },
    "qt_roof": { "x": 251, "y": 82, "w": 61, "h": 36, "doorCutout": { "x": 22, "y": 21, "w": 9, "h": 11 } },
    "clock": { "x": 147, "y": 153, "w": 24, "h": 30 },
}
for name, spec in occluders_meta.items():
    crop = board_rgba.crop((spec["x"], spec["y"], spec["x"] + spec["w"], spec["y"] + spec["h"]))
    if "doorCutout" in spec:
        dc = spec["doorCutout"]
        for dy in range(dc["y"], min(crop.height, dc["y"] + dc["h"])):
            for dx in range(dc["x"], min(crop.width, dc["x"] + dc["w"])):
                crop.putpixel((dx, dy), (0, 0, 0, 0))
    crop.save(f"{OUT_DIR}/occluders/{name}.png")

with open(f"{OUT_DIR}/occluders.json", "w") as f:
    json.dump(occluders_meta, f, indent=2)

print("All authentic assets extracted successfully!")
