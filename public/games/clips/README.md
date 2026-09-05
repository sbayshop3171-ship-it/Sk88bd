# Gameplay clips

Drop a short recording here named after the game's id — the slug in
`/casino/<id>` — then run `./scripts/sync_clips.py`. The fullscreen player
starts playing it; no code or catalogue change.

    public/games/clips/bikini-paradise.mp4   ->  /play/bikini-paradise

Ids are listed in `lib/catalogue.ts` (the last argument to each `g(...)`).

Keep them short (20-40s), muted, H.264, under ~6 MB — they are served straight
from `public/` with no transcoding.
