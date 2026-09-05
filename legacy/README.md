# TK420 — Mobile Gaming Platform (Demo UI)

Client preview build. Static site — pure HTML/CSS/JS, no build step, no backend.

## Pages
| File | Purpose |
|---|---|
| `index.html` | Home — banners, jackpot, game lobbies, sports odds, winners feed |
| `promotion.html` | Bonus / promotion list |
| `invite.html` | Referral program + agent leaderboard |
| `reward.html` | Daily check-in, missions, VIP tiers |
| `member.html` | Account / wallet menu |

## Structure
- `assets/css/style.css` — all styling. Brand colours are CSS variables in `:root`.
- `assets/js/app.js` — game catalogue, section renderers, and shared chrome
  (drawer, bottom nav, footer, auth modal, FABs) injected into every page.

## Re-branding
1. Name: change `BRAND` in `assets/js/app.js` and the `.logo__mark` text in each `.html`.
2. Colours: edit `--bg`, `--gold`, `--mint` in `assets/css/style.css`.
3. Games: edit the `CATALOGUE` object in `assets/js/app.js` — thumbnails are
   CSS gradients + a glyph, so no image assets are needed.

## Local preview
```bash
npx serve .        # or: python3 -m http.server 8080
```

## Deploy to Vercel
Import the folder — framework preset **Other**, no build command, output dir `.`.
Or from the CLI:
```bash
npx vercel --prod
```

## Note
Demo only. No payments, no accounts, no real games; all data is sample data.
