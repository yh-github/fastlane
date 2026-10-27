#!/usr/bin/env python3
"""
extract_all_authentic_buildings.py
Extracts background, talker cels (Floppy and CD-ROM), buttons, and dialogue strings
for all remaining Sierra SCI rooms in Jones in the Fast Lane.
"""

import os
import json
from PIL import Image

BASE_OUT = "public/assets/authentic/buildings"

def parse_strings(fn):
    with open(fn, 'rb') as f:
        data = f.read()
    res, cur = [], []
    for b in data:
        if 32 <= b <= 126 or b in (10, 13):
            cur.append(chr(b))
        else:
            if len(cur) >= 2:
                res.append(''.join(cur))
            cur = []
    return res

def extract_talkers(floppy_fn, cdrom_fn, out_dir, cel_w=68, cel_h=55):
    os.makedirs(f"{out_dir}/talker_floppy", exist_ok=True)
    os.makedirs(f"{out_dir}/talker_cdrom", exist_ok=True)

    # Floppy (6 cels)
    im_fl = Image.open(floppy_fn)
    pal_fl = im_fl.getpalette()
    for c in range(6):
        cx = c * (cel_w + 1)
        cel = Image.new("RGBA", (cel_w, cel_h))
        for py in range(cel_h):
            for px in range(cel_w):
                if cx + px < im_fl.size[0] and py < im_fl.size[1]:
                    p = im_fl.getpixel((cx + px, py))
                    if p != 0:
                        r, g, b = pal_fl[p*3 : p*3+3]
                        cel.putpixel((px, py), (r, g, b, 255))
        cel.save(f"{out_dir}/talker_floppy/talker_{c}.png")

    # CD-ROM (11 cels)
    im_cd = Image.open(cdrom_fn)
    pal_cd = im_cd.getpalette()
    for c in range(11):
        cx = c * (cel_w + 1)
        cel = Image.new("RGBA", (cel_w, cel_h))
        for py in range(cel_h):
            for px in range(cel_w):
                if cx + px < im_cd.size[0] and py < im_cd.size[1]:
                    p = im_cd.getpixel((cx + px, py))
                    if p != 0:
                        r, g, b = pal_cd[p*3 : p*3+3]
                        cel.putpixel((px, py), (r, g, b, 255))
        cel.save(f"{out_dir}/talker_cdrom/talker_{c}.png")

def extract_bg(bmp_path, crop_box, out_path):
    im = Image.open(bmp_path)
    cropped = im.crop(crop_box)
    pal = im.getpalette()
    out = Image.new("RGBA", cropped.size)
    w, h = cropped.size
    for py in range(h):
        for px in range(w):
            p = cropped.getpixel((px, py))
            r, g, b = pal[p*3 : p*3+3]
            out.putpixel((px, py), (r, g, b, 255))
    out.save(out_path)

def copy_standard_buttons(out_dir, buttons=("done", "work")):
    b_dir = f"{out_dir}/buttons"
    os.makedirs(b_dir, exist_ok=True)
    src_dir = "public/assets/authentic/buildings/monolith_burgers/buttons"
    for btn in buttons:
        if os.path.exists(f"{src_dir}/{btn}.png"):
            im = Image.open(f"{src_dir}/{btn}.png")
            im.save(f"{b_dir}/{btn}.png")

def main():
    # 1. Black's Market (Room 203)
    print("Extracting Black's Market (Room 203)...")
    d203 = f"{BASE_OUT}/blacks_market"
    os.makedirs(d203, exist_ok=True)
    extract_bg("original_resources/floppy/view.803.bmp", (0, 0, 183, 112), f"{d203}/bg.png")
    extract_talkers("original_resources/floppy/view.353.bmp", "original_resources/cdrom/353.v56.bmp", d203)
    copy_standard_buttons(d203, ["work", "done"])
    s203 = parse_strings("original_resources/floppy/text.203")
    with open(f"{d203}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s203[0:14],
            "clerkBanter": s203[14:44],
            "notEnoughCash": "You do not have enough cash."
        }, f, indent=2)

    # 2. QT Clothing (Room 209)
    print("Extracting QT Clothing (Room 209)...")
    d209 = f"{BASE_OUT}/qt_clothing"
    os.makedirs(d209, exist_ok=True)
    extract_bg("original_resources/floppy/view.809.bmp", (0, 0, 183, 112), f"{d209}/bg.png")
    extract_talkers("original_resources/floppy/view.359.bmp", "original_resources/cdrom/359.v56.bmp", d209)
    copy_standard_buttons(d209, ["work", "done"])
    s209 = parse_strings("original_resources/floppy/text.209")
    with open(f"{d209}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s209[0:9],
            "clerkBanter": s209[9:30],
            "notEnoughCash": "You do not have enough cash."
        }, f, indent=2)

    # 3. Socket City (Room 208)
    print("Extracting Socket City (Room 208)...")
    d208 = f"{BASE_OUT}/socket_city"
    os.makedirs(d208, exist_ok=True)
    extract_bg("original_resources/floppy/view.808.bmp", (0, 0, 183, 112), f"{d208}/bg.png")
    extract_talkers("original_resources/floppy/view.358.bmp", "original_resources/cdrom/358.v56.bmp", d208)
    copy_standard_buttons(d208, ["work", "done"])
    s208 = parse_strings("original_resources/floppy/text.208")
    with open(f"{d208}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s208[0:8],
            "clerkBanter": s208[8:47],
            "notEnoughCash": "You do not have enough cash."
        }, f, indent=2)

    # 4. Z-Mart (Room 211)
    print("Extracting Z-Mart (Room 211)...")
    d211 = f"{BASE_OUT}/z_mart"
    os.makedirs(d211, exist_ok=True)
    extract_bg("original_resources/floppy/view.811.bmp", (0, 0, 183, 112), f"{d211}/bg.png")
    extract_talkers("original_resources/floppy/view.361.bmp", "original_resources/cdrom/361.v56.bmp", d211)
    copy_standard_buttons(d211, ["work", "done"])
    s211 = parse_strings("original_resources/floppy/text.211")
    with open(f"{d211}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s211[0:11],
            "clerkBanter": s211[11:27],
            "notEnoughCash": "You do not have enough cash."
        }, f, indent=2)

    # 5. Pawn Shop (Room 212)
    print("Extracting Pawn Shop (Room 212)...")
    d212 = f"{BASE_OUT}/pawn_shop"
    os.makedirs(d212, exist_ok=True)
    extract_bg("original_resources/floppy/view.712.bmp", (0, 0, 183, 112), f"{d212}/bg.png")
    extract_talkers("original_resources/floppy/view.362.bmp", "original_resources/cdrom/362.v56.bmp", d212)
    copy_standard_buttons(d212, ["work", "done"])
    # Copy buy, sell from broker buttons
    broker_btn = "public/assets/authentic/buildings/broker/buttons"
    for b in ["buy", "sell"]:
        if os.path.exists(f"{broker_btn}/{b}.png"):
            Image.open(f"{broker_btn}/{b}.png").save(f"{d212}/buttons/{b}.png")
    s212 = parse_strings("original_resources/floppy/text.212")
    with open(f"{d212}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s212[0:8],
            "clerkBanter": s212[8:16],
            "notEnoughCash": "You do not have enough cash.",
            "noItemsToSell": "You don't have anything to sell.",
            "noRedeemable": "No Redeemable Items.",
            "noPawned": "No Pawned Items For Sale."
        }, f, indent=2)

    # 6. Hi-Tech U / University (Room 207)
    print("Extracting Hi-Tech U (Room 207)...")
    d207 = f"{BASE_OUT}/university"
    os.makedirs(d207, exist_ok=True)
    extract_bg("original_resources/floppy/view.807.bmp", (0, 0, 183, 112), f"{d207}/bg.png")
    extract_talkers("original_resources/floppy/view.357.bmp", "original_resources/cdrom/357.v56.bmp", d207)
    copy_standard_buttons(d207, ["work", "done"])
    s207 = parse_strings("original_resources/floppy/text.207")
    with open(f"{d207}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s207[0:11],
            "clerkBanter": s207[11:25],
            "notEnoughCash": "You do not have enough cash."
        }, f, indent=2)

    # 7. Employment Office (Room 206)
    print("Extracting Employment Office (Room 206)...")
    d206 = f"{BASE_OUT}/employment_office"
    os.makedirs(d206, exist_ok=True)
    extract_bg("original_resources/floppy/view.706.bmp", (0, 0, 183, 112), f"{d206}/bg.png")
    extract_talkers("original_resources/floppy/view.356.bmp", "original_resources/cdrom/356.v56.bmp", d206)
    copy_standard_buttons(d206, ["done"])
    s206 = parse_strings("original_resources/floppy/text.206")
    with open(f"{d206}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s206[6:11],
            "congratsJob": "Congratulations.  You got the job.",
            "congratsRaise": "Congratulations. You have been given a raise.",
            "requestDenied": "Sorry. We cannot grant your request at this time.",
            "closing": "Sorry. We're closing. You'll have to come back next week."
        }, f, indent=2)

    # 8. Factory (Room 205)
    print("Extracting Factory (Room 205)...")
    d205 = f"{BASE_OUT}/factory"
    os.makedirs(d205, exist_ok=True)
    extract_bg("original_resources/floppy/view.705.bmp", (0, 0, 183, 112), f"{d205}/bg.png")
    extract_talkers("original_resources/floppy/view.355.bmp", "original_resources/cdrom/355.v56.bmp", d205)
    copy_standard_buttons(d205, ["work", "done"])
    s205 = parse_strings("original_resources/floppy/text.205")
    with open(f"{d205}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s205[0:8]
        }, f, indent=2)

    # 9. Rent Office (Room 201)
    print("Extracting Rent Office (Room 201)...")
    d201 = f"{BASE_OUT}/rent_office"
    os.makedirs(d201, exist_ok=True)
    extract_bg("original_resources/floppy/view.701.bmp", (0, 31, 183, 143), f"{d201}/bg.png")
    extract_talkers("original_resources/floppy/view.351.bmp", "original_resources/cdrom/351.v56.bmp", d201)
    copy_standard_buttons(d201, ["work", "done"])
    s201 = parse_strings("original_resources/floppy/text.201")
    with open(f"{d201}/dialogue.json", "w") as f:
        json.dump({
            "welcomeGreetings": s201[0:8],
            "clerkBanter": s201[8:23],
            "notEnoughCash": "You do not have enough cash.",
            "extensionYes": "Sure, you can pay your rent next week.",
            "extensionNo": "Sorry, your rent must be paid now.",
            "paidThankYou": "Thank you. See you soon."
        }, f, indent=2)

    # 10. Home (Room 200)
    print("Extracting Home (Room 200)...")
    d200 = f"{BASE_OUT}/home"
    os.makedirs(d200, exist_ok=True)
    extract_bg("original_resources/floppy/view.700.bmp", (0, 0, 183, 112), f"{d200}/bg_low_cost.png")
    extract_bg("original_resources/floppy/view.699.bmp", (0, 0, 183, 112), f"{d200}/bg_security.png")
    copy_standard_buttons(d200, ["done"])
    # Relax button from view.250 loop 3
    im250 = Image.open("original_resources/floppy/view.250.bmp")
    pal250 = im250.getpalette()
    relax_cel = Image.new("RGBA", (30, 7))
    for py in range(7):
        for px in range(30):
            p = im250.getpixel((px + 1, py + 25))
            if p != 0:
                r, g, b = pal250[p*3 : p*3+3]
                relax_cel.putpixel((px, py), (r, g, b, 255))
    relax_cel.save(f"{d200}/buttons/relax.png")
    with open(f"{d200}/dialogue.json", "w") as f:
        json.dump({
            "noTime": "No time is left to relax."
        }, f, indent=2)

    print("All remaining building assets successfully extracted!")

if __name__ == "__main__":
    main()
