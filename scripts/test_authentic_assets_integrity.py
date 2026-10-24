#!/usr/bin/env python3
"""
test_authentic_assets_integrity.py
Automated validation of authentic Sierra VGA resources:
1. Marble Dimensions & Circular Alpha Mask (Loop 2 in view.000, 9x8, not square 25x24 badge)
2. Roof Patch Alignment at (68, 139) with >90% correlation (not misaligned y=131)
3. 100% Pixel Match for all 13 building doors using bottom-center anchor formula
"""

import sys
import json
from PIL import Image

def test_marbles():
    print("Testing Marbles (Point 6)...")
    for c in range(4):
        path = f"public/assets/authentic/marbles/marble_{c}.png"
        im = Image.open(path)
        w, h = im.size
        assert (w, h) == (9, 8), f"Marble {c} size must be (9, 8), got ({w}, {h})"
        # Verify corners are transparent (it is circular, not a square badge)
        corners = [(0, 0), (8, 0), (0, 7), (8, 7)]
        for px, py in corners:
            alpha = im.getpixel((px, py))[3]
            assert alpha == 0, f"Marble {c} corner ({px}, {py}) should be transparent, got alpha={alpha}"
        # Verify it has solid center
        center_alpha = im.getpixel((4, 4))[3]
        assert center_alpha > 0, f"Marble {c} center (4, 4) should be opaque"
    print("  -> All 4 marbles verified: 9x8 spherical with transparent corners.")

def test_doors_alignment():
    print("Testing Door Alignment (Point 2)...")
    board = Image.open("public/assets/authentic/board.png").convert("RGB")
    with open("public/assets/authentic/places.json") as f:
        places = json.load(f)

    for b_id, info in places.items():
        door_path = f"public/assets/authentic/doors/{b_id}_cel_0.png"
        cel0 = Image.open(door_path).convert("RGBA")
        w, h = cel0.size
        dx, dy = info["doorX"], info["doorY"]
        
        # Sierra SCI Bottom-Center Anchor:
        # left = doorX - floor(width / 2)
        # top = doorY - height + 1
        sci_x = dx - (w // 2)
        sci_y = dy - h + 1

        match = 0
        total = 0
        for y in range(h):
            for x in range(w):
                cp = cel0.getpixel((x, y))
                if cp[3] > 0:
                    total += 1
                    bp = board.getpixel((sci_x + x, sci_y + y))
                    if cp[:3] == bp[:3]:
                        match += 1
        pct = (match / total * 100) if total > 0 else 0
        assert pct == 100.0, f"Door for {b_id} at ({sci_x}, {sci_y}) match is {pct:.1f}%, expected 100.0%"
    print(f"  -> All {len(places)} building doors match background 100.0% pixel-perfect.")

def test_roof_patch_alignment():
    print("Testing Roof Patch Alignment (Point 3)...")
    board = Image.open("public/assets/authentic/board.png").convert("RGB")
    roof = Image.open("public/assets/authentic/roof_patch.png").convert("RGBA")
    rw, rh = roof.size
    assert (rw, rh) == (183, 25), f"Roof patch size must be (183, 25), got ({rw}, {rh})"

    # Test alignment at true coordinates (68, 139)
    match_139 = 0
    total = 0
    for y in range(rh):
        for x in range(rw):
            rp = roof.getpixel((x, y))
            if rp[3] > 128:
                total += 1
                bp = board.getpixel((68 + x, 139 + y))
                if rp[:3] == bp[:3]:
                    match_139 += 1
    pct_139 = (match_139 / total) * 100
    assert pct_139 > 90.0, f"Roof patch correlation at y=139 is {pct_139:.1f}%, expected > 90%"

    # Test that the old buggy y=131 fails miserably
    match_131 = 0
    for y in range(rh):
        for x in range(rw):
            rp = roof.getpixel((x, y))
            if rp[3] > 128:
                bp = board.getpixel((68 + x, 131 + y))
                if rp[:3] == bp[:3]:
                    match_131 += 1
    pct_131 = (match_131 / total) * 100
    assert pct_131 < 25.0, f"Buggy y=131 should fail (<25%), but got {pct_131:.1f}%"
    print(f"  -> Roof patch verified: {pct_139:.1f}% match at y=139 (vs {pct_131:.1f}% at buggy y=131).")

def test_occluders_alignment():
    print("Testing Occluders Alignment (Bank, QT, Clock)...")
    board = Image.open("public/assets/authentic/board.png").convert("RGB")
    with open("public/assets/authentic/occluders.json") as f:
        occluders = json.load(f)

    for name, spec in occluders.items():
        occ_im = Image.open(f"public/assets/authentic/occluders/{name}.png").convert("RGBA")
        ow, oh = occ_im.size
        assert (ow, oh) == (spec["w"], spec["h"]), f"Occluder {name} size mismatch: got ({ow}, {oh}), expected ({spec['w']}, {spec['h']})"
        match = 0
        total = 0
        for y in range(oh):
            for x in range(ow):
                op = occ_im.getpixel((x, y))
                if op[3] > 0:
                    total += 1
                    bp = board.getpixel((spec["x"] + x, spec["y"] + y))
                    if op[:3] == bp[:3]:
                        match += 1
        pct = (match / total * 100) if total > 0 else 0
        assert pct == 100.0, f"Occluder {name} at ({spec['x']}, {spec['y']}) match is {pct:.1f}%, expected 100.0%"
    print(f"  -> All {len(occluders)} rooftop occluders match background 100.0% pixel-perfect.")

def test_authentic_waypoints():
    print("Testing Authentic 170 Waypoints & Building Sidewalk Stops (Point 1 & 2)...")
    import re
    with open("original_resources/floppy/script.101.txt") as f:
        text101 = f.read()

    locals_dict = {}
    for m in re.finditer(r"local(\d+)\s*=\s*\$([0-9a-fA-F]+)", text101):
        locals_dict[int(m.group(1))] = int(m.group(2), 16)

    sci_wp = {i: (locals_dict[i], locals_dict[i + 171]) for i in range(1, 171)}
    assert len(sci_wp) == 170, f"Expected 170 waypoints, got {len(sci_wp)}"

    with open("public/assets/authentic/waypoints.json") as f:
        wp_data = json.load(f)
    assert wp_data["totalWaypoints"] == 170
    for pt in wp_data["waypoints"]:
        idx = pt["index"]
        assert (pt["x"], pt["y"]) == sci_wp[idx], f"Waypoint {idx} mismatch in waypoints.json"

    with open("public/campaigns/1990_classic_floppy/map.json") as f:
        map_data = json.load(f)

    # Building mapping
    b_to_node = {
        "apartmentsP": "node_low_cost",
        "pawnShopP": "node_pawn_shop",
        "discountP": "node_z_mart",
        "fastFoodP": "node_burger",
        "clothingP": "node_qt",
        "applianceP": "node_socket",
        "universityP": "node_university",
        "employmentP": "node_employment",
        "factoryP": "node_factory",
        "bankP": "node_bank",
        "marketP": "node_blacks_market",
        "securityP": "node_security",
        "rentOfficeP": "node_rent",
    }
    with open("original_resources/floppy/script.001.txt") as f:
        text001 = f.read()
    places = {}
    for m in re.finditer(r"\(instance\s+(\w+)\s+of\s+Place\b(.*?)\n\)", text001, re.DOTALL):
        name = m.group(1)
        body = m.group(2)
        def gp(p):
            pm = re.search(r"\b" + p + r"\s+\$([0-9a-fA-F]+)", body)
            return int(pm.group(1), 16) if pm else None
        places[name] = (gp("index"), gp("doorX"), gp("doorY"))

    node_to_idx = {b_to_node[k]: places[k][0] for k in places}

    for nid, pt in map_data["authenticNodes"].items():
        idx = node_to_idx[nid]
        expected_x = round(sci_wp[idx][0] * 3.75, 2)
        expected_y = round(sci_wp[idx][1] * 3.75, 2)
        assert abs(pt["x"] - expected_x) < 0.01 and abs(pt["y"] - expected_y) < 0.01, f"authenticNode {nid} ({pt}) does not match expected ({expected_x}, {expected_y})"

    total_edge_waypoints = 0
    for edge in map_data["edges"]:
        total_edge_waypoints += edge["waypoints"]
        from_idx = node_to_idx[edge["from"]]
        to_idx = node_to_idx[edge["to"]]
        curr = from_idx
        path_indices = []
        while True:
            curr = (curr % 170) + 1
            if curr == to_idx:
                break
            path_indices.append(curr)
        assert len(path_indices) + 1 == edge["waypoints"], f"Edge {edge['from']}->{edge['to']} count mismatch"
        for i, pt in enumerate(edge["path"]):
            w_idx = path_indices[i]
            assert pt["index"] == w_idx
            exp_x = round(sci_wp[w_idx][0] * 3.75, 2)
            exp_y = round(sci_wp[w_idx][1] * 3.75, 2)
            assert abs(pt["x"] - exp_x) < 0.01 and abs(pt["y"] - exp_y) < 0.01

    assert total_edge_waypoints == 170, f"Total edge waypoints must be 170, got {total_edge_waypoints}"
    print("  -> All 170 waypoints and 13 building sidewalk destinations verified 100.0% authentic.")

def test_authentic_monolith_burgers():
    print("Testing Authentic Monolith Burgers Assets (Room 210)...")
    base = "public/assets/authentic/buildings/monolith_burgers"
    bg = Image.open(f"{base}/bg.png")
    assert bg.size == (183, 112), f"bg.png size mismatch: {bg.size}"

    # Floppy talker (6 cels)
    for i in range(6):
        t_im = Image.open(f"{base}/talker_floppy/talker_{i}.png")
        assert t_im.size == (68, 55), f"talker_floppy/talker_{i}.png size mismatch: {t_im.size}"

    # CD-ROM talker (11 cels)
    for i in range(11):
        t_im = Image.open(f"{base}/talker_cdrom/talker_{i}.png")
        assert t_im.size == (68, 55), f"talker_cdrom/talker_{i}.png size mismatch: {t_im.size}"

    # Counter cels
    idle = Image.open(f"{base}/counter/idle_0.png")
    assert idle.size == (68, 55), f"counter/idle_0.png size mismatch: {idle.size}"
    for i in range(3):
        h = Image.open(f"{base}/counter/handoff_{i}.png")
        assert h.size == (68, 55), f"counter/handoff_{i}.png size mismatch: {h.size}"
    foods = ["food_hamburger", "food_cheeseburger", "food_chicken", "food_fries", "food_shake", "food_cola"]
    for f in foods:
        f_im = Image.open(f"{base}/counter/{f}.png")
        assert f_im.size == (68, 55), f"counter/{f}.png size mismatch: {f_im.size}"

    # Buttons
    work = Image.open(f"{base}/buttons/work.png")
    done = Image.open(f"{base}/buttons/done.png")
    assert work.size == (30, 7), f"buttons/work.png size mismatch: {work.size}"
    assert done.size == (30, 7), f"buttons/done.png size mismatch: {done.size}"

    # Punch card
    for i in range(4):
        p_im = Image.open(f"public/assets/authentic/punch_card/punch_{i}.png")
        assert p_im.size == (68, 55), f"punch_{i}.png size mismatch: {p_im.size}"

    # Dialogue JSON
    with open(f"{base}/dialogue.json") as f:
        d = json.load(f)
    assert len(d["welcomeGreetings"]) == 20, f"Expected 20 greetings, got {len(d['welcomeGreetings'])}"
    assert len(d["clerkBanter"]) == 35, f"Expected 35 banter lines, got {len(d['clerkBanter'])}"
    assert d["notEnoughCash"] == "You do not have enough cash."
    print("  -> Monolith Burgers assets, talker cels, counter animations, buttons and dialogue verified 100.0% authentic.")

if __name__ == "__main__":
    try:
        test_marbles()
        test_doors_alignment()
        test_roof_patch_alignment()
        test_occluders_alignment()
        test_authentic_waypoints()
        test_authentic_monolith_burgers()
        print("ALL AUTHENTIC ASSET INTEGRITY TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
