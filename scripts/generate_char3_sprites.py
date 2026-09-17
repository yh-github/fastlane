import os
import cv2
import numpy as np
from PIL import Image

ARTIFACT_DIR = "/home/yoavh/.gemini/antigravity/brain/3dc225ee-90ab-4667-9fb8-a9a2879f3c67"
OUTPUT_CHAR_DIR = "/home/yoavh/code/antigravity/fastlane/public/assets/chars"
OUTPUT_AVATAR_DIR = os.path.join(OUTPUT_CHAR_DIR, "avatars")
DIST_CHAR_DIR = "/home/yoavh/code/antigravity/fastlane/dist/assets/chars"
DIST_AVATAR_DIR = os.path.join(DIST_CHAR_DIR, "avatars")

TIER_CONFIGS = {
    0: {
        "name": "barrel",
        "file": os.path.join(ARTIFACT_DIR, "char3_barrel_greenscreen_1789653241544.jpg"),
        "sw": 250,
        "sh": 480,
    },
    1: {
        "name": "casual",
        "file": os.path.join(ARTIFACT_DIR, "char3_casual_greenscreen_1789653162616.jpg"),
        "sw": 210,
        "sh": 480,
    },
    2: {
        "name": "dress",
        "file": os.path.join(ARTIFACT_DIR, "char3_dress_greenscreen_1789653348040.jpg"),
        "sw": 210,
        "sh": 480,
    },
    3: {
        "name": "suit",
        "file": os.path.join(ARTIFACT_DIR, "char3_suit_greenscreen_1789653387004.jpg"),
        "sw": 220,
        "sh": 480,
    },
}

SIERRA_CHAR3_BG = (216, 200, 224)  # #d8c8e0

def key_greenscreen(img_path):
    """Applies high-fidelity chroma keying with despill on green screen photos."""
    img = cv2.imread(img_path)
    b = img[:, :, 0].astype(np.float32)
    g = img[:, :, 1].astype(np.float32)
    r = img[:, :, 2].astype(np.float32)

    diff = g - np.maximum(r, b)
    
    # Key condition: must be genuine bright green screen background (g > 140 and diff > 20)
    # This prevents darker fabrics with green bounce from getting keyed
    is_green_candidate = (g > 140) & (diff > 20)
    
    # Smooth alpha ramp for edge anti-aliasing
    alpha = np.ones_like(diff, dtype=np.float32)
    alpha[is_green_candidate] = np.clip(1.0 - (diff[is_green_candidate] - 25.0) / 30.0, 0.0, 1.0)
    
    # Despill: neutralize green reflections on edge pixels
    g_clean = np.where(diff > 12, np.maximum(r, b), g)

    rgba = np.dstack([r, g_clean, b, (alpha * 255.0).astype(np.uint8)]).astype(np.uint8)
    return rgba

def process_tier(tier):
    cfg = TIER_CONFIGS[tier]
    sw = cfg["sw"]
    sh = cfg["sh"]
    print(f"Processing Tier {tier} ({cfg['name']})...")

    rgba = key_greenscreen(cfg["file"])
    img_h, img_w, _ = rgba.shape
    qw = img_w // 4

    frames = []
    foot_positions = []
    head_positions = []

    for f in range(4):
        frame_crop = rgba[:, f * qw : (f + 1) * qw]
        alpha = frame_crop[:, :, 3]
        nz_y, nz_x = np.where(alpha > 15)

        if len(nz_y) > 0:
            head_positions.append(nz_y.min())
            foot_positions.append(nz_y.max())
        else:
            head_positions.append(0)
            foot_positions.append(img_h - 1)

        frames.append(frame_crop)

    # Standardize ground baseline across all 4 frames
    ground_y = max(foot_positions)
    top_y = min(head_positions)
    content_h = ground_y - top_y + 1

    # Desired height scaling: fit character inside sh with padding
    pad_y = 15
    target_content_h = sh - 2 * pad_y
    scale = target_content_h / content_h

    # Create master sprite sheet canvas: total width = 4 * sw + 3
    total_w = 4 * sw + 3
    sheet_rgba = Image.new("RGBA", (total_w, sh), (0, 0, 0, 0))

    for f in range(4):
        frame = frames[f]
        alpha = frame[:, :, 3]
        nz_y, nz_x = np.where(alpha > 15)

        if len(nz_y) > 0:
            min_x, max_x = nz_x.min(), nz_x.max()
            min_y, max_y = nz_y.min(), nz_y.max()

            # Crop tightly to character content
            char_crop = frame[min_y : max_y + 1, min_x : max_x + 1]
            pil_char = Image.fromarray(char_crop, "RGBA")

            # Scale proportionally
            new_w = max(1, int(round(pil_char.width * scale)))
            new_h = max(1, int(round(pil_char.height * scale)))
            scaled_char = pil_char.resize((new_w, new_h), Image.Resampling.LANCZOS)

            # Center horizontally in cell
            cell_x = f * (sw + 1)
            offset_x = cell_x + max(0, (sw - new_w) // 2)

            # Align feet to bottom baseline
            foot_offset = int(round((ground_y - max_y) * scale))
            offset_y = (sh - pad_y - new_h) + foot_offset
            offset_y = max(0, min(sh - new_h, offset_y))

            sheet_rgba.paste(scaled_char, (offset_x, offset_y), scaled_char)

    # Save RGBA PNG
    png_path = os.path.join(OUTPUT_CHAR_DIR, f"char=3_clothes={tier}.png")
    sheet_rgba.save(png_path, "PNG")
    print(f"Saved: {png_path} ({total_w}x{sh})")

    # Composite over classic Sierra #d8c8e0 background for BMP backward compatibility
    sheet_bmp = Image.new("RGB", (total_w, sh), SIERRA_CHAR3_BG)
    sheet_bmp.paste(sheet_rgba, (0, 0), sheet_rgba)

    # Draw 1-pixel separator line (matching Sierra SCI delimiter)
    for sep_f in range(3):
        sep_x = (sep_f + 1) * sw + sep_f
        for y in range(sh):
            sheet_bmp.putpixel((sep_x, y), (0, 0, 0))

    bmp_path = os.path.join(OUTPUT_CHAR_DIR, f"char=3_clothes={tier}.bmp")
    sheet_bmp.save(bmp_path, "BMP")
    print(f"Saved: {bmp_path} ({total_w}x{sh})")

    # Copy to dist if dist exists
    if os.path.exists(DIST_CHAR_DIR):
        sheet_rgba.save(os.path.join(DIST_CHAR_DIR, f"char=3_clothes={tier}.png"), "PNG")
        sheet_bmp.save(os.path.join(DIST_CHAR_DIR, f"char=3_clothes={tier}.bmp"), "BMP")

    # Generate avatar from frame 0 of Tier 1 (Casual)
    if tier == 1:
        avatar_crop = sheet_rgba.crop((0, 0, sw, sh))
        bbox = avatar_crop.getbbox()
        if bbox:
            avatar_crop = avatar_crop.crop(bbox)
        
        avatar_path = os.path.join(OUTPUT_AVATAR_DIR, "char_3.png")
        avatar_crop.save(avatar_path, "PNG")
        print(f"Saved Avatar: {avatar_path} ({avatar_crop.size})")

        if os.path.exists(DIST_AVATAR_DIR):
            avatar_crop.save(os.path.join(DIST_AVATAR_DIR, "char_3.png"), "PNG")

def main():
    os.makedirs(OUTPUT_CHAR_DIR, exist_ok=True)
    os.makedirs(OUTPUT_AVATAR_DIR, exist_ok=True)
    for tier in range(4):
        process_tier(tier)
    print("All Character 3 assets successfully generated!")

if __name__ == "__main__":
    main()
