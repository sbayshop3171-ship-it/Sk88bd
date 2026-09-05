#!/usr/bin/env python3
"""
Import generated game icons.

Drop any images into public/games/incoming/ named after the game slug
(see docs/icon-prompts.md), then run this. For each match it:

  * cover-crops to the square tile ratio and resizes to 640x640
  * saves as WebP into public/games/
  * sets that game's `thumb` in lib/catalogue.ts

Idempotent: re-running only touches what changed. Games you have not
generated yet keep the built-in generated tile, so the grid never breaks.

    python3 scripts/import_icons.py            # import
    python3 scripts/import_icons.py --status   # just report coverage
"""
from PIL import Image
import pathlib, re, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INBOX = ROOT / "public/games/incoming"
OUT = ROOT / "public/games"
CATALOGUE = ROOT / "lib/catalogue.ts"
# Tiles are square now that the icon pack supplies the art (see
# public/games/README.md); keep this in step with .game__art in globals.css.
OUT_W, OUT_H = 640, 640
EXTS = {".png", ".jpg", ".jpeg", ".webp"}


def slug(name: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def games(src: str):
    """(name, slug, has_thumb) for every g(...) entry in the catalogue."""
    out = []
    for m in re.finditer(r"g\('((?:[^'\\]|\\.)+)'([^)]*)\)", src):
        name, rest = m.group(1), m.group(2)
        out.append((name, slug(name), "/games/" in rest))
    return out


def edge_colour(img: Image.Image):
    """Average of the four corners — the ground the artwork sits on."""
    w, h = img.size
    pts = [(1, 1), (w - 2, 1), (1, h - 2), (w - 2, h - 2)]
    px = img.convert("RGB").load()
    cols = [px[x, y] for x, y in pts]
    return tuple(sum(c[i] for c in cols) // len(cols) for i in range(3))


def fit(img: Image.Image) -> Image.Image:
    """
    Letterbox onto the tile ratio rather than cropping to it.

    These icons carry the game name inside the artwork, so a cover-crop
    silently eats the lettering — and the sources arrive at whatever ratio
    the generator produced. Scaling to fit and padding with the artwork's
    own ground colour keeps every pixel and still hands back an exact 4:3.
    """
    img = img.convert("RGB")
    w, h = img.size
    scale = min(OUT_W / w, OUT_H / h)
    nw, nh = max(1, round(w * scale)), max(1, round(h * scale))
    canvas = Image.new("RGB", (OUT_W, OUT_H), edge_colour(img))
    canvas.paste(img.resize((nw, nh), Image.LANCZOS), ((OUT_W - nw) // 2, (OUT_H - nh) // 2))
    return canvas


def set_thumb(src: str, name: str, path: str) -> str:
    """Add or replace the 5th argument of this game's g(...) call."""
    esc = re.escape(name)
    pat = re.compile(r"(g\('" + esc + r"',\s*'[^']*',\s*'[^']*')([^)]*)\)")

    def repl(m):
        head, rest = m.group(1), m.group(2)
        # rest is one of: "" | ", 'tag'" | ", 'tag', '/games/x.webp'" | ", undefined, '...'"
        parts = [p.strip() for p in rest.split(",") if p.strip()]
        tag = parts[0] if parts and parts[0] != "undefined" else "undefined"
        return f"{head}, {tag}, '{path}')"

    new, n = pat.subn(repl, src, count=1)
    return new if n else src


def main() -> int:
    src = CATALOGUE.read_text()
    catalogue = games(src)
    by_slug = {s: (n, t) for n, s, t in catalogue}

    if "--status" in sys.argv:
        have = [n for n, s, t in catalogue if t]
        print(f"{len(have)}/{len(catalogue)} games have artwork")
        missing = [s for n, s, t in catalogue if not t]
        if missing:
            print("\nstill generated-art:")
            for s in missing:
                print(f"  {s}")
        return 0

    INBOX.mkdir(parents=True, exist_ok=True)
    files = sorted(p for p in INBOX.iterdir() if p.suffix.lower() in EXTS)
    if not files:
        print(f"nothing in {INBOX.relative_to(ROOT)} — see docs/icon-prompts.md")
        return 0

    imported, unknown = [], []
    for f in files:
        s = slug(f.stem)
        if s not in by_slug:
            unknown.append(f.name)
            continue
        dest = OUT / f"{s}.webp"
        fit(Image.open(f)).save(dest, "WEBP", quality=88, method=6)
        src = set_thumb(src, by_slug[s][0], f"/games/{s}.webp")
        f.unlink()
        imported.append((s, dest.stat().st_size))

    CATALOGUE.write_text(src)

    for s, size in imported:
        print(f"  imported  {s:28} {size // 1024:>4} KB")
    for n in unknown:
        print(f"  SKIPPED   {n} — no game with that slug")

    done = sum(1 for _, _, t in games(src) if t)
    print(f"\n{len(imported)} imported · {done}/{len(catalogue)} games now have artwork")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
