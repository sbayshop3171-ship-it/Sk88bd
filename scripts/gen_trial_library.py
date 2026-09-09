#!/usr/bin/env python3
"""Generate lib/demo-library.ts — every Pragmatic Play game that has a
PUBLIC free-trial page, with its tile art.

Why only Pragmatic Play: a trial on JILI / JDB / PG / Evolution is a token
minted against an operator account (see lib/launch.ts). It is that
operator's credential, it expires in minutes and it bills their contract,
so there is nothing public to point at — those games stay on the
AGGREGATOR_* path. Pragmatic is the one studio that runs an open demo host:

    demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=<symbol>

…which mints its own anonymous session on first load, needs no operator,
never expires and allows framing. The symbol for each game is published on
the game's own page at pragmaticplay.com, so this script walks the studio's
full game list, reads the symbol off each game's page, and writes the
library out.

Discovery is the list the studio's own /en/games/ grid pages through —
`?ajax=1&page=N`, nine cards a page until a page comes back empty. That is
the whole back catalogue, name and key art included; their XML sitemap
carries only the recent releases and misses Gates of Olympus, Sweet Bonanza,
Sugar Rush and most other classics, so it is not used.

    python3 scripts/gen_trial_library.py            # full run
    python3 scripts/gen_trial_library.py --no-art   # data only, keep art

Re-run it to pick up new releases; the output is generated, not hand-edited.
"""

from __future__ import annotations

import argparse
import html
import io
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT_TS = ROOT / "lib" / "demo-library.ts"
ART_DIR = ROOT / "public" / "games" / "icons" / "TRIAL"
ART_WEB = "/games/icons/TRIAL"

SITE = "https://www.pragmaticplay.com"
LIST_PAGE = SITE + "/en/games/?ajax=1&page={n}"
MAX_PAGES = 200  # the grid ends well short of this; a guard, not a target
UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/124 Safari/537.36"

# Tiles are small; 480px wide webp keeps the art sharp at a fraction of the
# 125KB PNG the press page serves.
ART_WIDTH = 480
ART_QUALITY = 78

RE_SYMBOL = re.compile(r"gameSymbol=([A-Za-z0-9_]+)")
RE_OG = re.compile(r'<meta property="og:(title|image)" content="([^"]*)"')
RE_TITLE = re.compile(r"^Play\s+(.*?)\s*(?:Slot\s+)?Demo by Pragmatic Play", re.I)

# One card in the grid fragment: the game's own page, its title and its key
# art (lazy-loaded, so the real file is in data-src, not src).
RE_CARD = re.compile(
    r'<a class="game__thumbnail" title="([^"]*)"\s*\n?\s*'
    r'href="https://www\.pragmaticplay\.com/en/games/([a-z0-9-]+)/[^"]*"'
    r'(?:.|\n){0,600}?data-src="([^"]+)"',
)


def get(url: str, tries: int = 3) -> bytes:
    # Art filenames carry the trademark sign and other non-ASCII; urllib will
    # not send those raw, so percent-encode everything outside the host.
    url = urllib.parse.quote(url, safe=":/?=&%#")
    last: Exception | None = None
    for _ in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=30) as res:
                return res.read()
        except Exception as exc:  # network flake — worth one more go
            last = exc
    raise RuntimeError(f"{url}: {last}")


def listing() -> list[dict]:
    """Every game in the studio's grid: slug, title and key art, one page of
    nine at a time until a page comes back with no cards on it."""
    found: dict[str, dict] = {}
    for n in range(1, MAX_PAGES + 1):
        try:
            page = get(LIST_PAGE.format(n=n), tries=2).decode("utf-8", "replace")
        except RuntimeError as exc:
            print(f"  ! list page {n}: {exc}", file=sys.stderr)
            break
        cards = RE_CARD.findall(page)
        if not cards:
            break
        for title, slug, art in cards:
            found.setdefault(slug, {"slug": slug, "title": title, "image": html.unescape(art)})
    return list(found.values())


def clean_name(raw: str) -> str:
    """"Play 5 Lions Dance&#x2122; Slot Demo by Pragmatic Play" -> "5 Lions Dance"."""
    text = html.unescape(raw).replace("™", "").replace("®", "")
    hit = RE_TITLE.match(text)
    name = hit.group(1) if hit else text
    return re.sub(r"\s+", " ", name).strip(" -–—")


def slugify(name: str) -> str:
    """Same id rule as scripts/gen_catalogue.py, so a game the catalogue
    already carries resolves to one id and not two."""
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", name.lower()))


def scrape(card: dict) -> dict | None:
    """The symbol only lives on the game's own page — the grid does not carry
    it. No symbol on the page means no public trial, so the game is dropped."""
    slug = card["slug"]
    try:
        page = get(f"{SITE}/en/games/{slug}/").decode("utf-8", "replace")
    except RuntimeError as exc:
        print(f"  ! {slug}: {exc}", file=sys.stderr)
        return None

    sym = RE_SYMBOL.search(page)
    if not sym:
        return None

    og = dict((k, v) for k, v in RE_OG.findall(page))
    name = (
        clean_name(og.get("title", ""))
        or clean_name(card["title"])
        or slugify(slug).replace("-", " ").title()
    )
    return {
        "slug": slug,
        "symbol": sym.group(1),
        "name": name,
        "id": slugify(name),
        # The grid's art is the same file the game page advertises; keep the
        # grid's, since a game page occasionally points og:image at a banner.
        "image": card["image"] or html.unescape(og.get("image", "")),
    }


class NoRedirect(urllib.request.HTTPRedirectHandler):
    """openGame.do answers a valid symbol with a 302 to the game and an
    unknown one with a plain page, so the redirect itself is the signal."""

    def redirect_request(self, req, fp, code, msg, headers, newurl):  # noqa: D102
        raise RedirectTo(newurl)


class RedirectTo(Exception):
    def __init__(self, url: str):
        super().__init__(url)
        self.url = url


NO_REDIRECT = urllib.request.build_opener(NoRedirect)


def playable(symbol: str) -> bool:
    """Does the demo host actually serve this game?

    A game page can advertise a symbol the open host has never had — a
    studio-exclusive, or a title pulled from fun mode. Both steps of a real
    launch are run here: the session mint, then the game's own init call. A
    symbol the host does not know mints nothing and answers `unlogged`.
    """
    launch = f"https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol={symbol}&lang=en&cur=USD"
    try:
        NO_REDIRECT.open(urllib.request.Request(launch, headers={"User-Agent": UA}), timeout=30)
        return False  # answered without a redirect: no session, no game
    except RedirectTo as hop:
        key = urllib.parse.parse_qs(urllib.parse.urlparse(hop.url).query).get("mgckey", [""])[0]
    except Exception:
        return False

    body = urllib.parse.urlencode({
        "action": "doInit", "symbol": symbol, "index": "1",
        "counter": "1", "repeat": "0", "mgckey": key,
    }).encode()
    try:
        req = urllib.request.Request(
            "https://demogamesfree.pragmaticplay.net/gs2c/ge/v3/gameService",
            data=body,
            headers={"User-Agent": UA, "Content-Type": "application/x-www-form-urlencoded"},
        )
        with urllib.request.urlopen(req, timeout=30) as res:
            return "balance=" in res.read().decode("utf-8", "replace")
    except Exception:
        return False


def save_art(game: dict) -> bool:
    """Key art as webp, resized. Returns True when the file is on disk."""
    dest = ART_DIR / f"{game['id']}.webp"
    if dest.exists():
        return True
    if not game["image"]:
        return False
    try:
        raw = get(game["image"], tries=2)
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        if img.width > ART_WIDTH:
            img = img.resize((ART_WIDTH, round(img.height * ART_WIDTH / img.width)), Image.LANCZOS)
        img.save(dest, "WEBP", quality=ART_QUALITY, method=5)
        return True
    except Exception as exc:
        print(f"  ! art {game['id']}: {exc}", file=sys.stderr)
        return False


def render(games: list[dict]) -> str:
    rows = "\n".join(
        "  d('{id}', '{name}', '{symbol}'{art}),".format(
            id=g["id"],
            name=g["name"].replace("\\", "").replace("'", "\\'"),
            symbol=g["symbol"],
            art=", true" if g["art"] else "",
        )
        for g in games
    )
    return f"""/* ============================================================
   Free-trial library — GENERATED by scripts/gen_trial_library.py.
   Do not hand-edit; re-run the script.

   {len(games)} Pragmatic Play games that each have a public demo on the
   studio's own open host, so they play with no operator account, no
   token and no expiry:

     demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=<symbol>

   That host mints its own anonymous play-money session on first load and
   allows framing, which is why these are the games /free-trial can
   actually open today. Every other studio in the catalogue mints trials
   against an operator account — see lib/launch.ts — so they light up on
   the AGGREGATOR_* path instead.
   ============================================================ */

export interface TrialGame {{
  /** Same id rule as the catalogue, so a game both carry shares one id. */
  id: string;
  name: string;
  /** Pragmatic's own game symbol — what the demo host is keyed on. */
  symbol: string;
  /** Key art at public/games/icons/TRIAL/<id>.webp. */
  art?: boolean;
}}

const d = (id: string, name: string, symbol: string, art = false): TrialGame =>
  ({{ id, name, symbol, art }});

export const TRIAL_PROVIDER = 'Pragmatic Play';

/** Where the trial art lives, for the rare entry that has none. */
export const trialArt = (g: TrialGame): string | undefined =>
  g.art ? `{ART_WEB}/${{g.id}}.webp` : undefined;

/** A play-money URL for one symbol. Anonymous session, no token, no expiry. */
export const trialUrl = (symbol: string): string =>
  `https://demogamesfree.pragmaticplay.net/gs2c/openGame.do?gameSymbol=${{symbol}}&lang=en&cur=USD`;

export const TRIAL_GAMES: TrialGame[] = [
{rows}
];
"""


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--no-art", action="store_true", help="skip artwork download")
    ap.add_argument("--no-verify", action="store_true", help="skip the launch check")
    args = ap.parse_args()

    ART_DIR.mkdir(parents=True, exist_ok=True)

    cards = listing()
    print(f"studio list: {len(cards)} games")

    with ThreadPoolExecutor(max_workers=8) as pool:
        scraped = [g for g in pool.map(scrape, cards) if g]
    print(f"public trial: {len(scraped)} games")

    # One entry per id — two slugs can point at the same game (a re-release,
    # or a localised duplicate); the first wins, as in the catalogue.
    unique: dict[str, dict] = {}
    for g in sorted(scraped, key=lambda g: g["name"].lower()):
        unique.setdefault(g["id"], g)
    games = list(unique.values())

    if not args.no_verify:
        with ThreadPoolExecutor(max_workers=6) as pool:
            ok = list(pool.map(playable, [g["symbol"] for g in games]))
        dropped = [g["id"] for g, good in zip(games, ok) if not good]
        games = [g for g, good in zip(games, ok) if good]
        print(f"playable: {len(games)} (dropped {len(dropped)})")
        for gid in dropped:
            print(f"  - {gid}")

    if args.no_art:
        for g in games:
            g["art"] = (ART_DIR / f"{g['id']}.webp").exists()
    else:
        with ThreadPoolExecutor(max_workers=8) as pool:
            for g, ok in zip(games, pool.map(save_art, games)):
                g["art"] = ok
    print(f"art: {sum(1 for g in games if g['art'])}/{len(games)}")

    # A renamed or pulled game leaves its art behind; the folder is generated,
    # so nothing in it should outlive the library.
    keep = {f"{g['id']}.webp" for g in games}
    stale = [p for p in ART_DIR.iterdir() if p.name not in keep]
    for p in stale:
        p.unlink()
    if stale:
        print(f"pruned {len(stale)} stale art files")

    OUT_TS.write_text(render(games), encoding="utf-8")
    print(f"wrote {OUT_TS.relative_to(ROOT)} ({len(games)} games)")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
