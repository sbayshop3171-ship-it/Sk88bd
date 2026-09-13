/** Where a Crash or JetX round lives between take-off and cash-out.

    Only the API route touches this. One open round per player per game:
    the stake has already left the wallet when a row appears here, so a row
    that never gets cashed out is simply a loss, and the next take-off
    clears it.

    One JSON file in .data/, held in memory (lib/json-store.ts): the screen
    asks twice a second while a round flies, and each ask used to read the
    file from disk. Changes still go through one queue and are on disk
    before the caller hears back. */

import path from 'node:path';
import { jsonStore } from './json-store';

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

const cache = jsonStore<Store>(
  STORE_FILE,
  (raw) => {
    const parsed = raw as Store;
    return parsed?.version === 1 && Array.isArray(parsed.rounds) ? parsed : null;
  },
  () => ({ version: 1, rounds: [], updatedAt: new Date().toISOString() }),
);

const key = (userId: string, game: string) => `${userId}:${game}`;

export function mutateRounds<T>(fn: (rounds: FlightRound[]) => T): Promise<T> {
  return cache.mutate((store) => {
    const result = fn(store.rounds);
    const cutoff = Date.now() - STALE_MS;
    store.rounds = store.rounds.filter((r) => r.startedAt >= cutoff);
    store.updatedAt = new Date().toISOString();
    return result;
  });
}

export async function openRound(userId: string, game: string): Promise<FlightRound | null> {
  const store = await cache.read();
  const round = store.rounds.find((r) => key(r.userId, r.game) === key(userId, game));
  return round ? { ...round } : null;
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
