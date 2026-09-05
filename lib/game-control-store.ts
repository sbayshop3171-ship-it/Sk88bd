/** Persistence for the admin's game overrides. Rows exist only for games the
    admin actually touched, so the file stays small and a catalogue update
    never has to be reconciled with it. */

import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { CATALOGUE, HOME_SECTIONS } from './catalogue';
import type {
  GameMutationResult,
  GameOverride,
  GameOverrideInput,
  GameStatus,
} from './game-control';

type ControlStore = {
  version: 1;
  overrides: GameOverride[];
  updatedAt: string;
};

const STORE_FILE = path.join(process.cwd(), '.data', 'game-control-store.json');
const ICON_DIR = path.join(process.cwd(), '.data', 'game-icons');
const TAGS = ['hot', 'new', 'top', 'none'];

let writeQueue = Promise.resolve();

const KNOWN_IDS = new Set(HOME_SECTIONS.flatMap((cat) => CATALOGUE[cat].map((g) => g.id)));

export const isKnownGame = (gameId: string) => KNOWN_IDS.has(gameId);

export async function listOverrides(): Promise<GameOverride[]> {
  return (await readStore()).overrides;
}

/** Upsert: one row per game, created the first time it is touched. */
export async function setOverride(input: GameOverrideInput): Promise<GameMutationResult> {
  const gameId = String(input.gameId ?? '');
  if (!isKnownGame(gameId)) return { ok: false, reason: 'unknown-game' };

  const clean = {
    gameId,
    status: (input.status === 'hidden' ? 'hidden' : 'active') as GameStatus,
    tag: TAGS.includes(input.tag as string) ? (input.tag as GameOverride['tag']) : null,
    sortOrder: clampOrder(input.sortOrder),
  };

  return mutateStore((store) => {
    const now = iso(Date.now());
    const existing = store.overrides.find((o) => o.gameId === gameId);

    if (existing) {
      // iconUrl is set by the upload route, not this form — keep it.
      Object.assign(existing, clean, { updatedAt: now });
    } else {
      store.overrides.push({ ...clean, iconUrl: null, updatedAt: now });
    }

    store.updatedAt = now;
    return { ok: true, overrides: store.overrides };
  });
}

/** Forget the override so the game falls back to the catalogue. */
export async function clearOverride(gameId: string): Promise<GameMutationResult> {
  return mutateStore((store) => {
    const at = store.overrides.findIndex((o) => o.gameId === gameId);
    if (at < 0) return { ok: false, reason: 'not-found' as const };

    store.overrides.splice(at, 1);
    store.updatedAt = iso(Date.now());
    return { ok: true, overrides: store.overrides };
  });
}

/**
 * Save an uploaded tile image and point the game's override at it.
 *
 * Files live in .data/game-icons/ rather than public/, so an upload survives
 * a rebuild and sits on the same persistent disk as every other store. The
 * route at /api/game-icon/<id> serves them back.
 */
export async function saveGameIcon(
  gameId: string,
  ext: string,
  bytes: Buffer,
): Promise<GameMutationResult> {
  if (!isKnownGame(gameId)) return { ok: false, reason: 'unknown-game' };

  await mkdir(ICON_DIR, { recursive: true });
  // One icon per game: drop any earlier upload in a different format first.
  await removeIconFiles(gameId);
  await writeFile(path.join(ICON_DIR, `${gameId}.${ext}`), bytes);

  return mutateStore((store) => {
    const now = iso(Date.now());
    const iconUrl = `/api/game-icon/${gameId}`;
    const existing = store.overrides.find((o) => o.gameId === gameId);

    if (existing) {
      existing.iconUrl = iconUrl;
      existing.updatedAt = now;
    } else {
      store.overrides.push({
        gameId, status: 'active', tag: null, sortOrder: null, iconUrl, updatedAt: now,
      });
    }

    store.updatedAt = now;
    return { ok: true, overrides: store.overrides };
  });
}

/** Drop the uploaded icon so the game falls back to its catalogue art. */
export async function clearGameIcon(gameId: string): Promise<GameMutationResult> {
  await removeIconFiles(gameId);

  return mutateStore((store) => {
    const existing = store.overrides.find((o) => o.gameId === gameId);
    if (!existing) return { ok: false, reason: 'not-found' as const };

    existing.iconUrl = null;
    existing.updatedAt = iso(Date.now());
    store.updatedAt = existing.updatedAt;
    return { ok: true, overrides: store.overrides };
  });
}

/** The stored image, or null when the game has no upload. */
export async function readGameIcon(
  gameId: string,
): Promise<{ bytes: Buffer; ext: string } | null> {
  if (!isKnownGame(gameId)) return null;

  for (const ext of ['png', 'jpg', 'webp', 'gif']) {
    try {
      return { bytes: await readFile(path.join(ICON_DIR, `${gameId}.${ext}`)), ext };
    } catch {
      // try the next extension
    }
  }
  return null;
}

async function removeIconFiles(gameId: string) {
  try {
    const files = await readdir(ICON_DIR);
    await Promise.all(
      files
        .filter((f) => f.replace(/\.[^.]+$/, '') === gameId)
        .map((f) => rm(path.join(ICON_DIR, f), { force: true })),
    );
  } catch {
    // no upload directory yet
  }
}

function clampOrder(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return null;
  return Math.min(999, Math.max(1, n));
}

function mutateStore<T>(fn: (store: ControlStore) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store);
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

async function readStore(): Promise<ControlStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as ControlStore;
    if (parsed?.version === 1 && Array.isArray(parsed.overrides)) return parsed;
  } catch {
    // First run: no game has been touched yet.
  }
  return { version: 1, overrides: [], updatedAt: iso(Date.now()) };
}

async function writeStore(store: ControlStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
