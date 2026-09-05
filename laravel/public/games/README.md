# Game thumbnails

Drop artwork here and point `thumb` at it in `lib/catalogue.ts`:

```ts
g('Aviator', '✈️', 'Spribe', 'hot', '/games/aviator.webp')
```

Anything without a `thumb` falls back to the generated SVG art in
`components/GameArt.tsx`, so the grid never breaks.

## Where the art comes from

Once an aggregator is licensed, its game-list API returns official thumbnail
URLs on the provider's own CDN. Point `thumb` at those URLs (and add the host
to `images.remotePatterns` in `next.config.mjs`) — that is the licensed route
and gives the real artwork.

Do not copy thumbnails off another operator's site: that art belongs to the
game providers, not to the operator showing it.
