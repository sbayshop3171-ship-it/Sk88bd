#!/usr/bin/env python3
"""
Regenerate lib/catalogue.ts from the icon pack manifest.

The pack lives outside the repo (`game rate/icons/`): a manifest.csv plus one
folder per section holding the tile art. `scripts/sync_icons.sh` copies the art
into public/games/icons/; this writes the catalogue rows that point at it.

Everything above the "Demo previews" comment in lib/catalogue.ts is rewritten;
the demo map below it is hand-kept and preserved verbatim, so run this freely.

    python3 scripts/gen_catalogue.py
"""
import collections, csv, html, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get('ICON_PACK', os.path.join(os.path.dirname(ROOT), 'game rate', 'icons'))
SRC = os.path.join(SRC, 'manifest.csv')
OUT = os.path.join(ROOT, 'lib', 'catalogue.ts')

if not os.path.exists(SRC):
    sys.exit(f'icon manifest not found: {SRC}\n'
             'point ICON_PACK at the folder holding manifest.csv')

SECTION_KEY = {
    'HOT': 'hot', 'SPORTS': 'sports', 'LIVE CASINO': 'live', 'SLOTS': 'slot',
    'POKER': 'poker', 'FISH': 'fish', 'LOTTERY': 'lottery', 'JACKPOT': 'jackpot',
    'PRAGMATIC': 'slot',
}
ORDER = ['hot', 'sports', 'live', 'slot', 'poker', 'fish', 'lottery', 'jackpot']

def clean(n):
    n = html.unescape(n).replace('’', "'")
    if n.upper() == n and any(c.isalpha() for c in n):
        n = ' '.join(w if w.isdigit() else w.capitalize() for w in n.split())
    return re.sub(r'\s+', ' ', n).strip()

def slug(n):
    return re.sub(r'^-|-$', '', re.sub(r'[^a-z0-9]+', '-', n.lower()))

rows = [r for r in csv.DictReader(open(SRC)) if '(site-local art)' not in r['name']]

# id assignment: name slug, disambiguated by provider when two games share it
by_slug = collections.defaultdict(list)
for r in rows:
    by_slug[slug(clean(r['name']))].append(r)

games = {}          # id -> dict
member = collections.defaultdict(list)   # category -> [id]

taken = set()
for s, group in by_slug.items():
    for r in group:
        gid = s if len(group) == 1 else f'{s}-{slug(r["provider"])}'
        if gid in taken:                      # same name AND same provider
            n = 2
            while f'{gid}-{n}' in taken:
                n += 1
            gid = f'{gid}-{n}'
        taken.add(gid)
        name = clean(r['name'])
        games[gid] = {
            'id': gid, 'name': name, 'provider': r['provider'],
            'thumb': '/games/icons/' + r['file'],
            'tag': 'hot' if r['is_hot'] == 'True' else None,
            'code': r.get('game_code', '').strip() or None,
            'demo': r.get('supports_demo', '') == 'True',
        }
        for sec in r['all_sections'].split('|'):
            key = SECTION_KEY[sec]
            if gid not in member[key]:
                member[key].append(gid)

# JACKPOT-only membership reads as a "top" game rather than a plain one
for gid in member['jackpot']:
    if games[gid]['tag'] is None:
        games[gid]['tag'] = 'top'

# Every game in the catalogue comes from the pack, so every tile has real
# artwork. Games with no icon are not carried as hand-written rows any more —
# a generated placeholder next to 199 real tiles read as a broken card.
EXTRA = []
for gid, name, prov, tag, cats in EXTRA:
    games[gid] = {'id': gid, 'name': name, 'provider': prov, 'thumb': None, 'tag': tag}
    for c in cats:
        if gid not in member[c]:
            member[c].append(gid)

def lit(v):
    if v is None:
        return 'undefined'
    return "'" + v.replace('\\', '\\\\').replace("'", "\\'") + "'"

lines = []
for key in ORDER:
    ids = member[key]
    lines.append(f'  {key}: [')
    for gid in ids:
        g = games[gid]
        lines.append(
            f'    g({lit(g["name"])}, {lit(g["provider"])}, {lit(g["tag"])}, {lit(g["thumb"])}, '
            f'{lit(g["id"])}, {lit(g["code"])}, {"true" if g["demo"] else "false"}),'
        )
    lines.append('  ],')

blocks = '\n'.join(lines)
counts = ', '.join(f'{k} {len(member[k])}' for k in ORDER)

header = '''/* ============================================================
   Game catalogue.

   GENERATED from the icon pack manifest
   (`game rate/icons/manifest.csv`) — every entry points at a real
   thumbnail under public/games/icons/<SECTION>/. Regenerate rather
   than hand-editing rows; the demo map at the bottom is hand-kept.

   Once an aggregator is licensed this is replaced by a Supabase
   `games` table with the same shape, so nothing above this layer
   has to change.
   ============================================================ */

import { CLIPS } from './clips';

export type Tag = 'hot' | 'new' | 'top';

export interface Game {
  /** slug used in the URL: /casino/<slug> */
  id: string;
  name: string;
  provider: string;
  tag?: Tag;
  /** Tile artwork under public/games/. Omitted -> GameArt draws the tile. */
  thumb?: string;
  /** Aggregator game code — what a launch call is keyed on. */
  code?: string;
  /** The provider publishes a trial/fun mode for this game. */
  demo?: boolean;
}

export type CategoryKey =
  | 'hot' | 'sports' | 'live' | 'slot'
  | 'poker' | 'fish' | 'lottery' | 'jackpot';

/** Two games can share a name across providers, so the id is passed in
    explicitly by the generator instead of being derived here. */
const g = (
  name: string, provider: string, tag?: Tag, thumb?: string,
  id?: string, code?: string, demo = false,
): Game => ({
  id: id ?? name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
  name, provider, tag, thumb, code, demo,
});

/** %COUNTS% */
export const CATALOGUE: Record<CategoryKey, Game[]> = {
%BLOCKS%
};

/** Tabs in the sticky rail, in the order the reference site uses. */
export const TAB_ORDER: CategoryKey[] = [
  'hot', 'slot', 'live', 'poker', 'fish', 'sports',
];

/** Every section rendered on the home page, top to bottom — the reference
    lobby's order, with jackpot last. */
export const HOME_SECTIONS: CategoryKey[] = [
  'hot', 'slot', 'live', 'poker', 'fish', 'sports', 'lottery', 'jackpot',
];

export const PROVIDERS = [
%PROVIDERS%
];

export const PAYMENT_METHODS = ['bKash', 'Nagad', 'Rocket', 'Upay', 'Bank Transfer', 'USDT'];
'''

provs = sorted({g['provider'].upper() for g in games.values()})
prov_lines = []
for i in range(0, len(provs), 5):
    prov_lines.append('  ' + ', '.join(lit(p) for p in provs[i:i + 5]) + ',')

tail = open(OUT).read()
tail = tail[tail.index('/* ============================================================\n   Demo previews'):]

body = (header.replace('%BLOCKS%', blocks)
              .replace('%COUNTS%', counts)
              .replace('%PROVIDERS%', '\n'.join(prov_lines))) + '\n' + tail

open(OUT, 'w').write(body)
print(counts)
print('total unique games:', len(games))
