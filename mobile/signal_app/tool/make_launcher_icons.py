"""Launcher icons for the Ariyan Khan signal app.

The mark is what the app does: a neon gauge sweeping up to the signal, a
climbing trace under it, and the owner's initials at the centre. Drawn at 8x
and downsampled, which is cheaper than fighting PIL for antialiased arcs.
"""
from PIL import Image, ImageDraw, ImageFont
import os, math

S = 1024            # design canvas
FONT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

BG_OUT = (4, 33, 31)      # brand near-black teal
BG_IN  = (16, 78, 71)     # lifted centre
MINT   = (63, 224, 189)
GOLD   = (255, 196, 46)
TRACK  = (255, 255, 255, 26)


def radial_bg(size):
    """Centre-lit teal, painted per-ring so the icon has depth at 48dp."""
    img = Image.new("RGB", (size, size), BG_OUT)
    d = ImageDraw.Draw(img)
    steps = 160
    for i in range(steps, 0, -1):
        t = i / steps
        r = t * size * 0.78
        # ease so the light pools in the middle instead of banding
        k = (1 - t) ** 1.6
        col = tuple(round(BG_OUT[c] + (BG_IN[c] - BG_OUT[c]) * k) for c in range(3))
        d.ellipse([size / 2 - r, size / 2 - r, size / 2 + r, size / 2 + r], fill=col)
    return img


def draw_mark(img, inset):
    """The gauge, the trace and the monogram. `inset` leaves the safe margin
       an adaptive foreground needs; the legacy icon passes a smaller one."""
    d = ImageDraw.Draw(img, "RGBA")
    S = img.size[0]
    c = S / 2
    r = (S / 2 - inset) * 0.86
    w = int(S * 0.062)

    box = [c - r, c - r, c + r, c + r]
    # the unlit rest of the dial, so the sweep reads as progress
    d.arc(box, 145, 395, fill=TRACK, width=w)

    # the live sweep, stepped from mint into gold the way the gauge climbs
    seg, start, end = 60, 145, 340
    for i in range(seg):
        a0 = start + (end - start) * i / seg
        a1 = start + (end - start) * (i + 1) / seg + 1.2
        t = i / (seg - 1)
        col = tuple(round(MINT[k] + (GOLD[k] - MINT[k]) * t) for k in range(3))
        d.arc(box, a0, a1, fill=col + (255,), width=w)

    # the head of the sweep, glowing
    ha = math.radians(340)
    hx, hy = c + r * math.cos(ha), c + r * math.sin(ha)
    for rad, alpha in ((w * 1.55, 60), (w * 1.05, 120), (w * 0.62, 255)):
        d.ellipse([hx - rad, hy - rad, hx + rad, hy + rad], fill=GOLD + (alpha,))

    # The initials sit in the ring's clear middle. Fitting them to the inner
    # diameter is not enough — a circle narrows away from its centre, so the
    # letters are fitted to a chord well inside it, and lifted to leave the
    # trace its own band underneath.
    inner = (r - w * 0.5) * 2
    limit_w, limit_h = inner * 0.60, inner * 0.42
    size = int(limit_h * 1.4)
    while size > 8:
        f = ImageFont.truetype(FONT, size)
        tb = d.textbbox((0, 0), "AK", font=f)
        if tb[2] - tb[0] <= limit_w and tb[3] - tb[1] <= limit_h:
            break
        size -= 4
    d.text((c - (tb[2] + tb[0]) / 2, c - (tb[3] + tb[1]) / 2 - r * 0.13),
           "AK", font=f, fill=(255, 255, 255, 255))

    # The climbing trace in the band below the letters. It has to rise hard —
    # a shallow curve at launcher size reads as a smile, not a signal.
    pts, y0, x0, span = [], c + r * 0.52, c - r * 0.32, r * 0.60
    for i in range(41):
        t = i / 40
        pts.append((x0 + span * t, y0 - (t ** 2.1) * r * 0.40))
    d.line(pts, fill=GOLD + (235,), width=int(S * 0.020), joint="curve")
    # an arrowhead, so which way it is going is never in question
    tipx, tipy = pts[-1]
    a = int(S * 0.036)
    d.polygon([(tipx + a * 0.45, tipy - a * 0.55),
               (tipx - a * 0.55, tipy - a * 0.12),
               (tipx + a * 0.05, tipy + a * 0.52)], fill=GOLD + (235,))
    return img


def rounded(img, radius_frac=0.22):
    S = img.size[0]
    mask = Image.new("L", (S, S), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, S - 1, S - 1],
                                           radius=int(S * radius_frac), fill=255)
    out = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    out.paste(img.convert("RGBA"), (0, 0), mask)
    return out


# ---- legacy square icon: full bleed, rounded ----
legacy = rounded(draw_mark(radial_bg(S), inset=S * 0.10))

# ---- adaptive: flat background + foreground with the 33% safe margin ----
adaptive_fg = Image.new("RGBA", (S, S), (0, 0, 0, 0))
draw_mark(adaptive_fg, inset=S * 0.255)

RES = "android/app/src/main/res"
DENSITIES = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}

for name, px in DENSITIES.items():
    d = f"{RES}/mipmap-{name}"
    os.makedirs(d, exist_ok=True)
    legacy.resize((px, px), Image.LANCZOS).save(f"{d}/ic_launcher.png")
    # the adaptive layers are drawn at 108dp, of which 72dp is ever visible
    ad = round(px * 108 / 48)
    adaptive_fg.resize((ad, ad), Image.LANCZOS).save(f"{d}/ic_launcher_foreground.png")

# a 512 icon for the listing / anything that wants one big copy
os.makedirs("android/app/src/main/ic_launcher-playstore", exist_ok=True)
legacy.resize((512, 512), Image.LANCZOS).save(
    "android/app/src/main/ic_launcher-playstore/ic_launcher-playstore.png")
print("icons written")
