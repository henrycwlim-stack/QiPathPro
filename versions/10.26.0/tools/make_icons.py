#!/usr/bin/env python3
"""
Generates the QiPath Pro launcher icons.

The mark: a cinnabar seal (朱文印) carrying 氣, ringed by a brass luopan band with
eight trigram ticks for the eight directions. It reuses the app's own palette —
lacquer ground, cinnabar seal, gold-leaf ring — so the icon and the interface read
as one thing.

Outputs
  android/app/src/main/res/mipmap-*/ic_launcher.png            legacy, API < 26
  android/app/src/main/res/mipmap-*/ic_launcher_round.png      legacy round
  android/app/src/main/res/mipmap-*/ic_launcher_foreground.png adaptive foreground
  android/app/src/main/res/drawable/ic_launcher_foreground.xml adaptive vector
  www/img/logo.svg                                             in-app banner mark

Run:  python tools/make_icons.py
"""

import math
import os
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
RES = os.path.join(ROOT, "android", "app", "src", "main", "res")
WWW = os.path.join(ROOT, "www")

LACQUER = (23, 18, 14, 255)
LACQUER_HI = (40, 31, 24, 255)
CINNABAR = (200, 69, 47, 255)
CINNABAR_DK = (150, 48, 32, 255)
BRASS = (200, 162, 74, 255)
RICE = (242, 236, 222, 255)

# Legacy launcher densities, in px
LEGACY = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
# Adaptive foreground is 108dp with a 72dp safe zone; content must stay inside it
ADAPTIVE = {"mdpi": 108, "hdpi": 162, "xhdpi": 216, "xxhdpi": 324, "xxxhdpi": 432}

FONT_CANDIDATES = [
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Bold.ttc",
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Black.ttc",
    "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc",
]


def cjk_font(size: int):
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            for index in (0, 1, 2, 3):
                try:
                    f = ImageFont.truetype(path, size, index=index)
                    if f.getbbox("氣"):
                        return f
                except Exception:
                    continue
    return None


# Eight trigrams as three lines each, read bottom-to-top; 1 solid, 0 broken.
TRIGRAMS = [
    (1, 1, 1),  # 乾 heaven      N
    (0, 1, 1),  # 兑 lake        NE
    (1, 0, 1),  # 离 fire        E
    (0, 0, 1),  # 震 thunder     SE
    (1, 1, 0),  # 巽 wind        S
    (0, 1, 0),  # 坎 water       SW
    (1, 0, 0),  # 艮 mountain    W
    (0, 0, 0),  # 坤 earth       NW
]


def draw_mark(size: int, with_ground: bool, inset: float = 1.0) -> Image.Image:
    """
    Render the mark at `size` px. `inset` scales the artwork down inside the canvas,
    which is how the adaptive foreground keeps clear of the 108dp crop.
    """
    ss = 4  # supersample for clean curves at every density
    S = size * ss
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    c = S / 2
    R = (S / 2) * inset

    if with_ground:
        # Warm lacquer ground with a soft centre lift, so the seal does not sit flat.
        d.rounded_rectangle([0, 0, S, S], radius=int(S * 0.22), fill=LACQUER)
        steps = 34
        for i in range(steps, 0, -1):
            t = i / steps
            rr = R * 0.98 * t
            k = (1 - t) * 0.5
            col = (
                int(LACQUER[0] + (LACQUER_HI[0] - LACQUER[0]) * k),
                int(LACQUER[1] + (LACQUER_HI[1] - LACQUER[1]) * k),
                int(LACQUER[2] + (LACQUER_HI[2] - LACQUER[2]) * k),
                255,
            )
            d.ellipse([c - rr, c - rr, c + rr, c + rr], fill=col)

    # --- brass luopan ring ---
    ring_r = R * 0.90
    ring_w = max(2, int(R * 0.045))
    d.ellipse([c - ring_r, c - ring_r, c + ring_r, c + ring_r], outline=BRASS, width=ring_w)

    inner_r = R * 0.62
    d.ellipse([c - inner_r, c - inner_r, c + inner_r, c + inner_r],
              outline=(BRASS[0], BRASS[1], BRASS[2], 120), width=max(1, int(R * 0.015)))

    # --- eight trigrams around the ring ---
    bar_len = R * 0.155
    bar_gap = R * 0.075
    bar_w = max(2, int(R * 0.026))
    # Seat the three bars so the outermost clears the ring's inner edge. Letting them touch
    # fuses the outer line into the ring and a trigram reads as two lines instead of three.
    band = R * 0.76
    for i, tri in enumerate(TRIGRAMS):
        ang = -math.pi / 2 + i * (2 * math.pi / 8)
        ca, sa = math.cos(ang), math.sin(ang)
        # perpendicular direction, along which the three bars stack
        px, py = -sa, ca
        for li, solid in enumerate(tri):
            off = (li - 1) * bar_gap
            bx = c + ca * (band + off)
            by = c + sa * (band + off)
            if solid:
                d.line([bx - px * bar_len / 2, by - py * bar_len / 2,
                        bx + px * bar_len / 2, by + py * bar_len / 2],
                       fill=BRASS, width=bar_w)
            else:
                seg = bar_len * 0.38
                for s in (-1, 1):
                    mx = bx + px * s * (bar_len / 2 - seg / 2)
                    my = by + py * s * (bar_len / 2 - seg / 2)
                    d.line([mx - px * seg / 2, my - py * seg / 2,
                            mx + px * seg / 2, my + py * seg / 2],
                           fill=BRASS, width=bar_w)

    # --- cinnabar seal ---
    seal = R * 0.42
    d.rounded_rectangle([c - seal, c - seal, c + seal, c + seal],
                        radius=int(seal * 0.20), fill=CINNABAR)
    d.rounded_rectangle([c - seal, c - seal, c + seal, c + seal],
                        radius=int(seal * 0.20), outline=CINNABAR_DK,
                        width=max(1, int(R * 0.018)))

    # --- 氣 ---
    f = cjk_font(int(seal * 1.60))
    if f:
        bbox = d.textbbox((0, 0), "氣", font=f)
        w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
        d.text((c - w / 2 - bbox[0], c - h / 2 - bbox[1]), "氣", font=f, fill=RICE)
    else:
        # Geometric fallback so the build never depends on a font being installed.
        lw = max(2, int(seal * 0.13))
        for i, y in enumerate((-0.42, -0.10, 0.22)):
            half = seal * (0.52 - i * 0.06)
            d.line([c - half, c + seal * y, c + half, c + seal * y], fill=RICE, width=lw)
        d.line([c, c - seal * 0.42, c, c + seal * 0.55], fill=RICE, width=lw)

    return img.resize((size, size), Image.LANCZOS)


def write_rgb(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")


def write(img: Image.Image, path: str) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.save(path, "PNG")


def circular(img: Image.Image) -> Image.Image:
    size = img.size[0]
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).ellipse([0, 0, size * 4, size * 4], fill=255)
    mask = mask.resize((size, size), Image.LANCZOS)
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(img, (0, 0), mask)
    return out


SVG = """<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" role="img"
     aria-label="QiPath Pro">
  <circle cx="50" cy="50" r="49" fill="#17120E"/>
  <circle cx="50" cy="50" r="44" fill="none" stroke="#C8A24A" stroke-width="2.2"/>
  <circle cx="50" cy="50" r="30" fill="none" stroke="#C8A24A" stroke-width="0.8" opacity=".5"/>
  <g stroke="#C8A24A" stroke-width="1.3" stroke-linecap="round">%s</g>
  <rect x="29.5" y="29.5" width="41" height="41" rx="4.5" fill="#C8452F" stroke="#963020" stroke-width="1.2"/>
  <text x="50" y="50" text-anchor="middle" dominant-baseline="central"
        font-family="'Noto Serif CJK SC','Noto Serif SC','Songti SC',serif"
        font-size="31" fill="#F2ECDE">氣</text>
</svg>
"""


def svg_trigrams() -> str:
    """Same eight trigrams, emitted as SVG line elements."""
    out = []
    band, bar_len, bar_gap = 37.0, 7.6, 3.7
    for i, tri in enumerate(TRIGRAMS):
        ang = -math.pi / 2 + i * (2 * math.pi / 8)
        ca, sa = math.cos(ang), math.sin(ang)
        px, py = -sa, ca
        for li, solid in enumerate(tri):
            off = (li - 1) * bar_gap
            bx, by = 50 + ca * (band + off), 50 + sa * (band + off)
            if solid:
                out.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"/>' % (
                    bx - px * bar_len / 2, by - py * bar_len / 2,
                    bx + px * bar_len / 2, by + py * bar_len / 2))
            else:
                seg = bar_len * 0.38
                for s in (-1, 1):
                    mx = bx + px * s * (bar_len / 2 - seg / 2)
                    my = by + py * s * (bar_len / 2 - seg / 2)
                    out.append('<line x1="%.2f" y1="%.2f" x2="%.2f" y2="%.2f"/>' % (
                        mx - px * seg / 2, my - py * seg / 2,
                        mx + px * seg / 2, my + py * seg / 2))
    return "\n    ".join(out)


SPLASH = {
    "drawable":            (480, 320),
    "drawable-port-mdpi":  (320, 480),  "drawable-land-mdpi":  (480, 320),
    "drawable-port-hdpi":  (480, 800),  "drawable-land-hdpi":  (800, 480),
    "drawable-port-xhdpi": (720, 1280), "drawable-land-xhdpi": (1280, 720),
    "drawable-port-xxhdpi":(960, 1600), "drawable-land-xxhdpi":(1600, 960),
    "drawable-port-xxxhdpi":(1280, 1920),"drawable-land-xxxhdpi":(1920, 1280),
}


def draw_splash(w: int, h: int) -> Image.Image:
    """Launch screen: the mark centred on the lacquer ground, with the wordmark under it."""
    img = Image.new("RGB", (w, h), LACQUER[:3])
    d = ImageDraw.Draw(img)
    cx, cy = w / 2, h / 2

    # Soft centre lift so the flat ground does not read as dead space.
    m = min(w, h)
    # A circular lift centred on the mark. Concentric ellipses of differing aspect leave a
    # visible seam, so this keeps a true circle and oversizes it past the canvas edge.
    for i in range(60, 0, -1):
        t = i / 60
        rr = max(w, h) * 0.62 * t
        k = (1 - t) * 0.30
        d.ellipse([cx - rr, cy - rr, cx + rr, cy + rr],
                  fill=(int(LACQUER[0] + (LACQUER_HI[0] - LACQUER[0]) * k),
                        int(LACQUER[1] + (LACQUER_HI[1] - LACQUER[1]) * k),
                        int(LACQUER[2] + (LACQUER_HI[2] - LACQUER[2]) * k)))

    mark_px = int(m * 0.34)
    mark = draw_mark(mark_px, with_ground=False)
    img.paste(mark, (int(cx - mark_px / 2), int(cy - mark_px * 0.72)), mark)

    # Wordmark
    label_size = max(14, int(m * 0.062))
    f = None
    for path in ["/usr/share/fonts/truetype/liberation/LiberationSerif-Regular.ttf",
                 "/usr/share/fonts/opentype/noto/NotoSerifCJK-Regular.ttc"]:
        if os.path.exists(path):
            try:
                f = ImageFont.truetype(path, label_size)
                break
            except Exception:
                continue
    if f:
        text = "QiPath Pro"
        bb = d.textbbox((0, 0), text, font=f)
        tw = bb[2] - bb[0]
        ty = cy + mark_px * 0.46
        d.text((cx - tw / 2 - bb[0], ty), text, font=f, fill=RICE[:3])
        # Hairline rule beneath, in gold leaf
        d.line([cx - tw * 0.55, ty + label_size * 1.7, cx + tw * 0.55, ty + label_size * 1.7],
               fill=BRASS[:3], width=max(1, int(m * 0.003)))
    return img


def main() -> None:
    font = cjk_font(64)
    print("CJK font:", "found" if font else "NOT found — using the geometric fallback")

    for dens, px in LEGACY.items():
        base = draw_mark(px, with_ground=True)
        write(base, os.path.join(RES, f"mipmap-{dens}", "ic_launcher.png"))
        write(circular(base), os.path.join(RES, f"mipmap-{dens}", "ic_launcher_round.png"))
        print(f"  mipmap-{dens}/ic_launcher.png  {px}x{px}")

    for dens, px in ADAPTIVE.items():
        # 0.62 keeps the mark inside the 72/108 safe zone through any mask shape.
        fg = draw_mark(px, with_ground=False, inset=0.62)
        write(fg, os.path.join(RES, f"mipmap-{dens}", "ic_launcher_foreground.png"))
    print("  adaptive foregrounds written at 5 densities")

    # Play Store listing icon
    write(draw_mark(512, with_ground=True), os.path.join(ROOT, "tools", "playstore-icon-512.png"))
    print("  tools/playstore-icon-512.png  512x512")

    for folder, (w, h) in SPLASH.items():
        write_rgb(draw_splash(w, h), os.path.join(RES, folder, "splash.png"))
    print(f"  {len(SPLASH)} splash images written")

    svg = SVG % svg_trigrams()
    os.makedirs(os.path.join(WWW, "img"), exist_ok=True)
    with open(os.path.join(WWW, "img", "logo.svg"), "w", encoding="utf-8") as fh:
        fh.write(svg)
    print("  www/img/logo.svg")


if __name__ == "__main__":
    main()
