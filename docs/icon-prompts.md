# Game icon prompts

60 prompts, one per game in `lib/catalogue.ts`.

## How to use

1. Paste a prompt into your image generator (Midjourney, DALL·E, 
   Leonardo, Stable Diffusion — any of them, as long as the plan you
   are on grants commercial rights to what it produces).
2. Save the result as `<slug>.png` — the slug is the first column.
3. Drop every file into `public/games/incoming/`.
4. Run `python3 scripts/import_icons.py` — it squares them, converts to
   WebP, moves them into `public/games/`, and writes the `thumb` field
   for each game in `lib/catalogue.ts`.

Anything you skip keeps the generated tile, so you can do these in
batches and the grid never breaks.

## Shared style suffix

Already appended to every prompt below:

```
mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

## Prompts

### `aviator.png` — Aviator (Spribe)

```
a vintage propeller biplane banking upward, trailing light, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `crazy-time.png` — Crazy Time (Evolution)

```
an ornate carnival fortune wheel seen head-on, jewelled rim, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `gates-of-olympus.png` — Gates of Olympus (Pragmatic)

```
a forked lightning bolt cracking through a stone arch, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `teen-patti.png` — Teen Patti (Ezugi)

```
a fanned pair of playing cards, ace and king, gilded edges, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `sweet-bonanza.png` — Sweet Bonanza (Pragmatic)

```
a wrapped hard candy and scattered fruit gems, glossy, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `dragon-tiger.png` — Dragon Tiger (Ezugi)

```
an eastern dragon head in profile, gold scales, red mane, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `andar-bahar.png` — Andar Bahar (Evolution)

```
a large ornate spade symbol with filigree scrollwork, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `mines.png` — Mines (Spribe)

```
a round black bomb with a lit sparking fuse, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `lightning-roulette.png` — Lightning Roulette (Evolution)

```
a forked lightning bolt cracking through a stone arch, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `cricket-exchange.png` — Cricket Exchange (Exchange)

```
a cricket bat crossed with a leather ball, stumps behind, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `football.png` — Football (Sportsbook)

```
a football mid-flight with motion streaks, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `tennis.png` — Tennis (Sportsbook)

```
a tennis ball and racket crossed, court lines behind, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `kabaddi.png` — Kabaddi (Sportsbook)

```
a tennis ball and racket crossed, court lines behind, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `basketball.png` — Basketball (Sportsbook)

```
a tennis ball and racket crossed, court lines behind, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `horse-racing.png` — Horse Racing (Sportsbook)

```
a racehorse at full gallop, jockey silks flying, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `baccarat-vip.png` — Baccarat VIP (Ezugi)

```
a stack of casino chips with a crown resting on top, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `blackjack-party.png` — Blackjack Party (Evolution)

```
two cards showing an ace and a jack, chips beside them, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `andar-bahar-live.png` — Andar Bahar Live (Ezugi)

```
a large ornate spade symbol with filigree scrollwork, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `dragon-tiger-live.png` — Dragon Tiger Live (Ezugi)

```
an eastern dragon head in profile, gold scales, red mane, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `monopoly-live.png` — Monopoly Live (Evolution)

```
a jewelled royal crown, rubies and sapphires set in gold, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `sic-bo.png` — Sic Bo (Ezugi)

```
two dice tumbling, pips picked out in gold, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `mega-wheel.png` — Mega Wheel (Pragmatic)

```
an ornate carnival fortune wheel seen head-on, jewelled rim, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `super-ace.png` — Super Ace (JILI)

```
a bold numeral 7 in polished gold on a burst of light, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `fortune-gems.png` — Fortune Gems (JILI)

```
a cluster of faceted jewels, one large emerald centred, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `big-bass-bonanza.png` — Big Bass Bonanza (Pragmatic)

```
a wrapped hard candy and scattered fruit gems, glossy, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `starburst.png` — Starburst (NetEnt)

```
a cluster of faceted jewels, one large emerald centred, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `wild-west-gold.png` — Wild West Gold (Pragmatic)

```
a wide-brimmed hat and revolver on weathered wood, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `fruit-party.png` — Fruit Party (Pragmatic)

```
a wrapped hard candy and scattered fruit gems, glossy, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `money-train-3.png` — Money Train 3 (Relax)

```
a steam locomotive front-on, headlamp blazing, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `sugar-rush.png` — Sugar Rush (Pragmatic)

```
a wrapped hard candy and scattered fruit gems, glossy, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `teen-patti-3d.png` — Teen Patti 3D (Ezugi)

```
a fanned pair of playing cards, ace and king, gilded edges, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `card-matka.png` — Card Matka (KingMaker)

```
a decorated clay pot spilling gold coins, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `rummy.png` — Rummy (KingMaker)

```
four playing cards fanned wide, gold filigree backs, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `call-break.png` — Call Break (KingMaker)

```
four playing cards fanned wide, gold filigree backs, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `7-up-7-down.png` — 7 Up 7 Down (Ezugi)

```
a bold numeral 7 in polished gold on a burst of light, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `32-cards.png` — 32 Cards (Ezugi)

```
four playing cards fanned wide, gold filigree backs, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `casino-holdem.png` — Casino Holdem (Evolution)

```
a stack of casino chips with a crown resting on top, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `poker-pro.png` — Poker Pro (JILI)

```
a stack of casino chips with a crown resting on top, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `baccarat.png` — Baccarat (CQ9)

```
a stack of casino chips with a crown resting on top, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `jackpot-fishing.png` — Jackpot Fishing (JILI)

```
a bright tropical fish with flowing fins, bubbles, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `dragon-fortune.png` — Dragon Fortune (Pragmatic)

```
an eastern dragon head in profile, gold scales, red mane, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `ocean-king-3.png` — Ocean King 3 (CQ9)

```
a shark head breaking the surface, spray around it, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `bombing-fishing.png` — Bombing Fishing (JILI)

```
a round black bomb with a lit sparking fuse, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `royal-fishing.png` — Royal Fishing (JILI)

```
a bright tropical fish with flowing fins, bubbles, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `mega-fishing.png` — Mega Fishing (JILI)

```
a bright tropical fish with flowing fins, bubbles, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `fish-hunter.png` — Fish Hunter (CQ9)

```
a shark head breaking the surface, spray around it, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `golden-toad.png` — Golden Toad (JDB)

```
a golden toad sitting on a pile of coins, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `boom-legend.png` — Boom Legend (JILI)

```
a shark head breaking the surface, spray around it, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `counter-strike.png` — Counter Strike (E-Sports)

```
a targeting reticle over a cracked-glass burst, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `dota-2.png` — Dota 2 (E-Sports)

```
two crossed broadswords, jewelled pommels, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `mobile-legends.png` — Mobile Legends (E-Sports)

```
a smartphone with a glowing battle scene on screen, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `valorant.png` — Valorant (E-Sports)

```
a targeting reticle over a cracked-glass burst, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `pubg-mobile.png` — PUBG Mobile (E-Sports)

```
a smartphone with a glowing battle scene on screen, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `league-of-legends.png` — League of Legends (E-Sports)

```
two crossed broadswords, jewelled pommels, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `bingo-5.png` — Bingo 5 (JILI)

```
numbered bingo balls tumbling out of a cage, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `keno-live.png` — Keno Live (Evolution)

```
numbered bingo balls tumbling out of a cage, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `lotto-instant.png` — Lotto Instant (Betgames)

```
numbered bingo balls tumbling out of a cage, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `number-king.png` — Number King (JDB)

```
a jewelled royal crown, rubies and sapphires set in gold, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `lucky-draw.png` — Lucky Draw (KingMaker)

```
an ornate carnival fortune wheel seen head-on, jewelled rim, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```

### `color-game.png` — Color Game (JILI)

```
numbered bingo balls tumbling out of a cage, mobile game app icon, centred subject, dark deep-green to black radial background, polished gold and jewel-tone rendering, strong rim light from upper left, soft contact shadow, high contrast, glossy, no text, no lettering, no logo, no watermark, square 1:1, 1024x1024
```
