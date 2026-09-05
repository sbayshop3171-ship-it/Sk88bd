Drop generated icons here, named `<slug>.png` (slugs are listed in
`docs/icon-prompts.md`), then run:

    python3 scripts/import_icons.py

Files are squared, converted to WebP, moved up into `public/games/`, and
wired into `lib/catalogue.ts`. This folder should stay empty afterwards.
