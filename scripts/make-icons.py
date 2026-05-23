#!/usr/bin/env python3
"""Generate PWA icons. Dev-time only; not a runtime dep of the app.

Outputs:
  icons/icon-192.png        (any-purpose, transparent bg)
  icons/icon-512.png        (any-purpose, transparent bg)
  icons/maskable-192.png    (maskable, opaque bg with safe area)
  icons/maskable-512.png    (maskable, opaque bg with safe area)
  icons/apple-touch-icon.png (180×180, opaque bg)

Style: a stylized "20" numeral in a circle — the default starting life,
warm cream background, deep ink. Matches the pastel default skin so the
install icon reads as the same app.
"""
from PIL import Image, ImageDraw, ImageFont
import os, sys

OUT = os.path.join(os.path.dirname(__file__), "..", "icons")
os.makedirs(OUT, exist_ok=True)

# Brand colors (match pastel tokens)
INK = (28, 26, 22, 255)
CREAM = (244, 237, 224, 255)
PANEL = (255, 249, 238, 255)
ACCENT = (185, 227, 182, 255)

def font_for_size(px):
    candidates = [
        "/System/Library/Fonts/SFNS.ttf",
        "/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf",
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
    ]
    for c in candidates:
        if os.path.exists(c):
            try:
                return ImageFont.truetype(c, px)
            except Exception:
                pass
    return ImageFont.load_default()

def draw_icon(size, maskable=False, transparent_bg=False):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0) if transparent_bg else CREAM)
    d = ImageDraw.Draw(img)
    # Safe area for maskable: 80% of canvas. Background fills entire canvas.
    if maskable:
        bg_inset = 0  # bg covers full canvas
        circle_inset = int(size * 0.10)
    else:
        bg_inset = int(size * 0.04)
        circle_inset = int(size * 0.06)
    # Outer "panel" circle
    d.ellipse(
        (circle_inset, circle_inset, size - circle_inset, size - circle_inset),
        fill=PANEL,
        outline=INK,
        width=max(2, size // 64),
    )
    # The "20"
    txt = "20"
    fsize = int(size * 0.5)
    font = font_for_size(fsize)
    # Center the text
    bbox = d.textbbox((0, 0), txt, font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    tx = (size - tw) // 2 - bbox[0]
    ty = (size - th) // 2 - bbox[1] - int(size * 0.02)
    d.text((tx, ty), txt, font=font, fill=INK)
    return img

# Standard (any-purpose) — opaque cream bg for visibility on dark/light home screens
for sz in (192, 512):
    img = draw_icon(sz, maskable=False, transparent_bg=False)
    img.save(os.path.join(OUT, f"icon-{sz}.png"))
    print(f"wrote icons/icon-{sz}.png")

# Maskable — opaque bg fills the canvas; content stays inside 80% safe zone
for sz in (192, 512):
    img = draw_icon(sz, maskable=True, transparent_bg=False)
    img.save(os.path.join(OUT, f"maskable-{sz}.png"))
    print(f"wrote icons/maskable-{sz}.png")

# Apple touch icon
img = draw_icon(180, maskable=False, transparent_bg=False)
img.save(os.path.join(OUT, "apple-touch-icon.png"))
print("wrote icons/apple-touch-icon.png")

# Also write favicon.ico-style PNG at 32x32 for non-PWA browser tab use,
# but we already have the cb-shapes favicon doing that job. Skip.
