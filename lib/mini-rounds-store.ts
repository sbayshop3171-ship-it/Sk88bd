/** Where a Crash or JetX round lives between take-off and cash-out.

    Only the API route touches this. One open round per player per game:
    the stake has already left the wallet when a row appears here, so a row
    that never gets cashed out is simply a loss, and the next take-off
    clears it.

    Same file-store shape as aviator-bets-store — a serialised write queue
    over one JSON file in .data/, which is all a single-instance app needs
    and keeps the games off the critical path of a Supabase migration. */

import { mkdir, readFile } from 'node:fs/promises';
import { writeFileAtomic } from './atomic-write';
import path from 'node:path';

export interface FlightRound {
  userId: string;
  game: 'crash' | 'jetx';
  stake: number;
  /** ms since epoch, server clock — the payout is measured from here */
  startedAt: number;
  crashAt: number;
  serverSeed: string;
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
}

type Store = { version: 1; rounds: FlightRound[]; updatedAt: string };

const STORE_FILE = path.join(process.cwd(), '.data', 'mini-rounds.json');

/** A round that busted long ago is dead weight; drop it on the next write. */
const STALE_MS = 10 * 60 * 1000;

let writeQueue = Promise.resolve();

const key = (userId: string, game: string) => `${userId}:${game}`;

export function mutateRounds<T>(fn: (rounds: FlightRound[]) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store.rounds);

    const cutoff = Date.now() - STALE_MS;
    store.rounds = store.rounds.filter((r) => r.startedAt >= cutoff);
    store.updatedAt = new Date().toISOString();
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

export async function openRound(userId: string, game: string): Promise<FlightRound | null> {
  const store = await readStore();
  return store.rounds.find((r) => key(r.userId, r.game) === key(userId, game)) ?? null;
}

/** Replace whatever this player had open on this game. */
export function startRound(rounds: FlightRound[], round: FlightRound) {
  const i = rounds.findIndex((r) => key(r.userId, r.game) === key(round.userId, round.game));
  if (i >= 0) rounds.splice(i, 1);
  rounds.push(round);
}

export function endRound(rounds: FlightRound[], userId: string, game: string): FlightRound | null {
  const i = rounds.findIndex((r) => key(r.userId, r.game) === key(userId, game));
  if (i < 0) return null;
  return rounds.splice(i, 1)[0];
}

async function readStore(): Promise<Store> {
  try {
    const parsed = JSON.parse(await readFile(STORE_FILE, 'utf8')) as Store;
    if (parsed?.version === 1 && Array.isArray(parsed.rounds)) return parsed;
  } catch {
    // nothing flying yet
  }
  return { version: 1, rounds: [], updatedAt: new Date().toISOString() };
}

async function writeStore(store: Store) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFileAtomic(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}
