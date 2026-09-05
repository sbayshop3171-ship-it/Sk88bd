#!/usr/bin/env bash
# Copy the icon pack's tile art into public/games/icons/, then regenerate
# lib/catalogue.ts from its manifest.
#
#   ./scripts/sync_icons.sh                 # pack at ../game rate/icons
#   ICON_PACK=/path/to/icons ./scripts/sync_icons.sh
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
pack="${ICON_PACK:-$(dirname "$root")/game rate/icons}"

[ -f "$pack/manifest.csv" ] || { echo "no manifest.csv in $pack" >&2; exit 1; }

mkdir -p "$root/public/games/icons"
cp -r "$pack"/*/ "$root/public/games/icons/"
ICON_PACK="$pack" python3 "$root/scripts/gen_catalogue.py"
python3 "$root/scripts/sync_clips.py"
echo "icons: $(find "$root/public/games/icons" -type f | wc -l) files"
