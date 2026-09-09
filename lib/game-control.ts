/** Admin overrides on top of the shipped game catalogue.

    lib/catalogue.ts stays the source of truth for what games exist — it is
    regenerated from the icon pack. The admin panel only layers decisions on
    top: hide a game, change its badge, pin it higher. Storing overrides
    instead of copying the catalogue means a catalogue regeneration never
    wipes the operator's choices.

    Pure module: the client hook and the server store both import it. */

import type { Game, Tag } from './catalogue';

export type GameStatus = 'active' | 'hidden';

export type GameOverride = {
  gameId: string;
  status: GameStatus;
  /** null keeps the catalogue's own tag; 'none' clears it. */
  tag: Tag | 'none' | null;
  /** null keeps catalogue order; lower numbers float to the top. */
  sortOrder: number | null;
  /** an icon the admin uploaded, served from /api/game-icon/<id> */
  iconUrl: string | null;
  updatedAt: string;
};

export type GameOverrideInput = {
  gameId: string;
  status: GameStatus;
  tag: Tag | 'none' | null;
  sortOrder: number | null;
};

export const ICON_MAX_BYTES = 2 * 1024 * 1024;

export const ICON_TYPES: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type OverrideMap = Record<string, GameOverride>;

export type GameMutationReason =
  | 'unknown-game'
  | 'not-found'
  | 'no-file'
  | 'bad-type'
  | 'too-large';

export type GameMutationResult =
  | { ok: true; overrides: GameOverride[] }
  | { ok: false; reason: GameMutationReason };

export const TAG_LABEL: Record<Tag, string> = {
  hot: 'HOT',
  new: 'NEW',
  top: 'TOP',
};

export const STATUS_LABEL: Record<GameStatus, string> = {
  active: 'Showing',
  hidden: 'Hidden',
};

export const byId = (overrides: GameOverride[]): OverrideMap =>
  Object.fromEntries(overrides.map((o) => [o.gameId, o]));

/**
 * Drop hidden games, swap in overridden tags, and float pinned games to the
 * top. Catalogue order is preserved for everything without a sortOrder.
 */
export function applyOverrides(games: Game[], overrides: OverrideMap): Game[] {
  const visible = games.filter((g) => overrides[g.id]?.status !== 'hidden');

  const withArt = visible.map((g) => {
    const o = overrides[g.id];
    if (!o) return g;

    const tag = o.tag;
    const next = { ...g };
    if (tag !== undefined && tag !== null) next.tag = tag === 'none' ? undefined : tag;
    // An uploaded icon replaces the catalogue thumbnail; GameArt only ever
    // sees a URL, so it renders it the same way either route.
    if (o.iconUrl) next.thumb = o.iconUrl;
    return next;
  });

  return withArt
    .map((g, i) => ({ g, i, pin: overrides[g.id]?.sortOrder }))
    .sort((a, b) => {
      if (a.pin != null && b.pin != null) return a.pin - b.pin || a.i - b.i;
      if (a.pin != null) return -1;
      if (b.pin != null) return 1;
      return a.i - b.i;
    })
    .map((row) => row.g);
}
