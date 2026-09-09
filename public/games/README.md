# Game thumbnails

`icons/` holds the tile artwork the catalogue ships with — 178 files laid out
as `icons/<SECTION>/<Provider>__<Game-Name>.<ext>`, exactly the layout of the
icon pack's `manifest.csv`. `lib/catalogue.ts` is **generated** from that
manifest, so a game's `thumb` already points into this folder:

```ts
g('3 Charge Buffalo', 'JILI', 'hot', '/games/icons/HOT/JILI__3-Charge-Buffalo.avif', '3-charge-buffalo')
```

Anything without a `thumb` falls back to the generated SVG art in
`components/GameArt.tsx`, so the grid never breaks.

## How a tile is fitted

Tiles are 4:5, 12px radius, laid out three across — the reference lobby's grid.
Each one stacks four layers (`components/GameArt.tsx`):

| layer     | what it does |
| --------- | ------------ |
| `blur`    | a zoomed, blurred copy of the art filling the tile edge to edge |
| `fit`     | the art itself, whole, biased up so the unfilled strip lands at the bottom |
| `shimmer` | a slow light sweep, offset per game so a grid does not pulse in unison |
| `scrim`   | the bottom 44% fading into the card colour, so the tile melts into the surface |

The pack mixes square, 3:4 and 3:2 artwork and every piece has the game's own
name baked into the image, so a cover-crop would shave the lettering off —
fitting it and letting the blur take the leftover keeps the art intact with no
letterbox bars. Both image layers use the same `src`, so it is one download.

On top of the art sit the HOT/TOP pill (top-left), the favourite heart
(top-right, `components/useFavourites.ts`) and the provider chip (bottom-centre).

## Gameplay clips

`clips/` is how a game with no fun mode still gets shown. Most providers here
publish no trial at all — every Evolution live table, and most of the Asian
studios — so a short self-hosted recording is the only honest way to show what
the game looks like. It plays muted, looping and takes no input, exactly like a
demo frame.

    public/games/clips/<game id>.mp4     # the id is the slug in /casino/<id>
    ./scripts/sync_clips.py              # indexes them into lib/clips.ts

Nothing else changes: `/play/<id>` picks the clip up, and the tile starts
opening it. A game with neither a clip nor a launchable URL shows its own
artwork full-bleed instead — never a deposit wall.

Keep them short (20-40s), muted, and encoded for mobile (H.264, <6 MB); they
are served straight from `public/`.

## Free-trial art

`icons/TRIAL/` is generated, not curated — one `<game id>.webp` for every game
in `lib/demo-library.ts`, which is itself built from Pragmatic Play's own game
list:

    python3 scripts/gen_trial_library.py            # library + art
    python3 scripts/gen_trial_library.py --no-art   # library only

The key art is the studio's own, taken from each game's page on
pragmaticplay.com and re-encoded to 480px webp (~18 KB a tile, ~12 MB for the
set). The script prunes art whose game has left the library, so the folder
never outlives it. Do not hand-edit either the folder or `lib/demo-library.ts`
— re-run the script.

A game that also has an entry in `lib/catalogue.ts` keeps the icon pack's
artwork; the library only supplies its demo URL.

## Where the art comes from

Once an aggregator is licensed, its game-list API returns official thumbnail
URLs on the provider's own CDN. Point `thumb` at those URLs (and add the host
to `images.remotePatterns` in `next.config.mjs`) — that is the licensed route
and gives the real artwork.

Do not copy thumbnails off another operator's site: that art belongs to the
game providers, not to the operator showing it.
