/** Where Aviator bets are kept between placing and settling.

    Only the API routes touch this. The signal store that decides when a round
    flies and where it busts is left completely alone — this reads it, never
    writes it. */

import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { AviatorBet } from './aviator-bets';

type BetStore = {
  version: 1;
  bets: AviatorBet[];
  updatedAt: string;
};

const STORE_FILE = path.join(process.cwd(), '.data', 'aviator-bets-store.json');

/** Keep a short tail so the file cannot grow without bound. */
const KEEP = 500;

let writeQueue = Promise.resolve();

export function newBet(input: {
  userId: string;
  roundId: number;
  slot: 0 | 1;
  stake: number;
}): AviatorBet {
  return {
    id: randomBytes(8).toString('hex'),
    ...input,
    cashedAt: null,
    payout: 0,
    placedAt: iso(Date.now()),
    settledAt: null,
  };
}

/** The player's bets on one round. */
export async function betsFor(userId: string, roundId: number): Promise<AviatorBet[]> {
  const store = await readStore();
  return store.bets.filter((b) => b.userId === userId && b.roundId === roundId);
}

export function mutateBets<T>(fn: (bets: AviatorBet[]) => T): Promise<T> {
  const next = writeQueue.then(async () => {
    const store = await readStore();
    const result = fn(store.bets);

    store.bets = store.bets.slice(-KEEP);
    store.updatedAt = iso(Date.now());
    await writeStore(store);
    return result;
  });
  writeQueue = next.then(() => undefined, () => undefined);
  return next;
}

/**
 * Close out anything the player left riding on a round that has since busted.
 * Nothing is paid: the stake left the wallet when the bet was placed.
 */
export function settleBusted(bets: AviatorBet[], userId: string, liveRoundId: number) {
  const now = iso(Date.now());
  for (const bet of bets) {
    if (bet.userId === userId && bet.settledAt === null && bet.roundId < liveRoundId) {
      bet.settledAt = now;
    }
  }
}

async function readStore(): Promise<BetStore> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as BetStore;
    if (parsed?.version === 1 && Array.isArray(parsed.bets)) return parsed;
  } catch {
    // First bet on this machine.
  }
  return { version: 1, bets: [], updatedAt: iso(Date.now()) };
}

async function writeStore(store: BetStore) {
  await mkdir(path.dirname(STORE_FILE), { recursive: true });
  await writeFile(STORE_FILE, `${JSON.stringify(store, null, 2)}\n`);
}

function iso(ms: number) {
  return new Date(ms).toISOString();
}
