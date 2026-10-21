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

if __name__ == "__main__":
    try:
        test_marbles()
        test_doors_alignment()
        test_roof_patch_alignment()
        print("ALL AUTHENTIC ASSET INTEGRITY TESTS PASSED SUCCESSFULLY!")
    except AssertionError as e:
        print(f"TEST FAILED: {e}", file=sys.stderr)
        sys.exit(1)
