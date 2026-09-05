/* ============================================================
   Aviator — crash game engine, provably fair.

   Fairness model (the same commit–reveal scheme Spribe-style crash
   games use):

     1. Before betting opens, the round's `serverSeed` is generated and
        only its SHA-256 hash is shown to the player.
     2. The player may set their own `clientSeed`, mixed into the draw.
     3. The crash point is derived from SHA-256(serverSeed:clientSeed:nonce).
     4. After the bust, `serverSeed` is revealed. Anyone can re-hash it,
        check it matches the committed hash, and recompute the crash
        point — proving the round was fixed before any bet was placed.

   Rounds are still generated in the browser here, so this preview
   demonstrates the scheme rather than enforcing it. When Supabase lands,
   steps 1 and 4 move to the server: the hash comes down before the round
   and the seed is released after, which is what makes the guarantee real.
   A client that generates its own seed can obviously pick a nice one.
   ============================================================ */

export const HOUSE_EDGE = 0.03;

export type Phase = 'waiting' | 'betting' | 'flying' | 'crashed';

export const BETTING_MS = 10_000;
export const CRASHED_MS = 3500;

/** Multiplier as a function of elapsed flight time. Slow, then steep —
    2x lands near 11s, 10x near 37s. */
export const GROWTH = 0.0625;
export const multiplierAt = (elapsedMs: number) =>
  Math.exp(GROWTH * (elapsedMs / 1000));

/** Inverse: flight time needed to reach a multiplier. */
export const timeToReach = (m: number) => (Math.log(m) / GROWTH) * 1000;

/* ---------- hashing ---------- */

const enc = new TextEncoder();

export async function sha256Hex(input: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', enc.encode(input));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Cryptographically random hex string, used for the server seed. */
export function randomHex(bytes = 16): string {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return [...a].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ---------- the draw ---------- */

/**
 * Crash point from a round hash.
 *
 * With probability HOUSE_EDGE the round busts instantly at 1.00x.
 * Otherwise the multiplier is drawn so that P(crash ≥ m) ≈ 1/m, which
 * makes every cash-out target equally (un)profitable before the edge —
 * the property players expect from this game type.
 */
export function crashFromHash(hashHex: string): number {
  // 52 bits is the most that survives a double without rounding
  const slice = hashHex.slice(0, 13);
  const r = parseInt(slice, 16) / 2 ** 52;
  if (r < HOUSE_EDGE) return 1.0;
  const raw = 1 / (1 - r);
  return Math.max(1, Math.floor(raw * 100) / 100);
}

export interface Round {
  id: number;
  nonce: number;
  /** committed before the round; the seed itself stays hidden until the bust */
  serverSeedHash: string;
  clientSeed: string;
  crashAt: number;
  durationMs: number;
  /** revealed only after the round busts */
  serverSeed?: string;
}

export async function createRound(
  id: number,
  clientSeed: string,
  nonce = id,
): Promise<Round & { serverSeed: string }> {
  const serverSeed = randomHex();
  const serverSeedHash = await sha256Hex(serverSeed);
  const roundHash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  const crashAt = crashFromHash(roundHash);
  return {
    id, nonce, serverSeed, serverSeedHash, clientSeed,
    crashAt, durationMs: timeToReach(crashAt),
  };
}

/** Re-run the derivation from a revealed seed. Used by the verifier page. */
export async function verifyRound(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): Promise<{ serverSeedHash: string; crashAt: number }> {
  const serverSeedHash = await sha256Hex(serverSeed);
  const roundHash = await sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
  return { serverSeedHash, crashAt: crashFromHash(roundHash) };
}

/* ---------- presentation helpers ---------- */

export function bandFor(m: number): 'low' | 'mid' | 'high' {
  if (m < 2) return 'low';
  if (m < 10) return 'mid';
  return 'high';
}

export const fmtX = (m: number) => `${m.toFixed(2)}x`;
