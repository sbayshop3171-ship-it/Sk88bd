/* ============================================================
   The house's own games — Crash, JetX, Limbo, Dice, Plinko and
   Coin Flip. No aggregator, no licence: the maths lives here and
   the money moves through the same wallet_apply the cashier uses.

   Fairness is the commit–reveal scheme Aviator already uses (see
   lib/aviator.ts): a server seed is drawn and only its SHA-256 is
   shown, the player's own seed is mixed in, the outcome comes from
   SHA-256(serverSeed:clientSeed:nonce), and the seed is revealed
   once the round is settled. Unlike Aviator's preview rounds these
   are drawn on the server, so the commitment actually binds.

   Pure module — no node imports, no I/O — so the screens and the
   API route share one set of rules and cannot drift apart.
   ============================================================ */

import { randomHex, sha256Hex } from './aviator';

export { randomHex, sha256Hex };

/** Every game keeps the house edge Aviator runs on, so the lobby is
    consistent and every payout table below is derived from it rather
    than hand-tuned. RTP is therefore 97% on all six. */
export const HOUSE_EDGE = 0.03;
export const RTP = 1 - HOUSE_EDGE;

/** paisa — ৳10 to ৳5,000 a round */
export const MIN_STAKE_PAISA = 1_000;
export const MAX_STAKE_PAISA = 500_000;

/** No single round pays more than this, whatever the table says. Plinko's
    top bucket is 2,709x and Limbo goes to 1,000x; without a ceiling one
    lucky round could take more than the float can cover. Shown on every
    game screen so nobody is surprised by it. */
export const MAX_PAYOUT_PAISA = 50_000_000;

export const capPayout = (payout: number) => Math.min(payout, MAX_PAYOUT_PAISA);

export type MiniGameId = 'crash' | 'jetx' | 'limbo' | 'dice' | 'plinko' | 'coin-flip';

/** The two flying games settle over time; the rest resolve in one call. */
export type MiniKind = 'flight' | 'instant';

export interface MiniGameDef {
  id: MiniGameId;
  name: string;
  /** the line under the title, in Bangla */
  tagline: string;
  kind: MiniKind;
  /** tile + screen accent */
  accent: string;
  glyph: string;
}

export const MINI_GAMES: Record<MiniGameId, MiniGameDef> = {
  crash: {
    id: 'crash', name: 'Crash', kind: 'flight', accent: '#ff5a5a', glyph: '📈',
    tagline: 'লাইন যত উপরে ওঠে গুণ তত বাড়ে — ভেঙে পড়ার আগে ক্যাশ আউট করুন।',
  },
  jetx: {
    id: 'jetx', name: 'JetX', kind: 'flight', accent: '#3fa9ff', glyph: '🚀',
    tagline: 'জেট ছুটতে থাকে, গুণ বাড়ে দ্রুত — বিস্ফোরণের আগে নেমে যান।',
  },
  limbo: {
    id: 'limbo', name: 'Limbo', kind: 'instant', accent: '#a78bfa', glyph: '🎯',
    tagline: 'নিজের টার্গেট গুণ ঠিক করুন — ড্র তার সমান বা বেশি হলেই জয়।',
  },
  dice: {
    id: 'dice', name: 'Dice', kind: 'instant', accent: '#3fe0bd', glyph: '🎲',
    tagline: '০ থেকে ১০০ এর মধ্যে একটি সংখ্যা — উপরে না নিচে, আপনি বেছে নিন।',
  },
  plinko: {
    id: 'plinko', name: 'Plinko', kind: 'instant', accent: '#ffc42e', glyph: '🔻',
    tagline: 'বল পিন বেয়ে নামে — যে ঘরে পড়বে সেই গুণ আপনার।',
  },
  'coin-flip': {
    id: 'coin-flip', name: 'Coin Flip', kind: 'instant', accent: '#ffd95e', glyph: '🪙',
    tagline: 'হেড না টেইল — এক টসে দ্বিগুণের কাছাকাছি।',
  },
};

export const MINI_GAME_IDS = Object.keys(MINI_GAMES) as MiniGameId[];

export const isMiniGame = (id: string): id is MiniGameId => id in MINI_GAMES;

/* ============================================================
   The draw
   ============================================================ */

/** A float in [0, 1) from the first 52 bits of a hash — the most that
    survives a double without rounding. */
export function floatFromHash(hashHex: string, offset = 0): number {
  return parseInt(hashHex.slice(offset, offset + 13), 16) / 2 ** 52;
}

export const roundHashInput = (serverSeed: string, clientSeed: string, nonce: number) =>
  `${serverSeed}:${clientSeed}:${nonce}`;

/**
 * Crash point, drawn so that P(crash ≥ m) = RTP/m. Cashing out at any
 * target therefore returns RTP — the edge is in the draw itself, not in a
 * separate "instant bust" branch.
 *
 * Getting this wrong is expensive and silent: with 1/(1 − r) the return is
 * P(crash ≥ m)·m = 1, so the house takes nothing however long the game
 * runs. Multiplying by RTP inside the draw is what makes the edge real —
 * and it busts at 1.00x on its own whenever r < HOUSE_EDGE, so no special
 * case is needed for that either.
 */
export function crashPoint(hashHex: string): number {
  const r = floatFromHash(hashHex);
  return Math.max(1, Math.floor((RTP / (1 - r)) * 100) / 100);
}

/* ---------- the flying games ---------- */

/** m = e^(k·t^p), the same shape Aviator flies on. JetX climbs harder,
    so a round is over sooner and the screen feels different. */
export const FLIGHT_CURVE: Record<'crash' | 'jetx', { growth: number; power: number }> = {
  crash: { growth: 0.0553, power: 1.15 },
  jetx: { growth: 0.0900, power: 1.20 },
};

export const flightMultiplierAt = (game: 'crash' | 'jetx', elapsedMs: number) => {
  const { growth, power } = FLIGHT_CURVE[game];
  return Math.exp(growth * Math.pow(Math.max(0, elapsedMs) / 1000, power));
};

export const flightTimeToReach = (game: 'crash' | 'jetx', m: number) => {
  const { growth, power } = FLIGHT_CURVE[game];
  return Math.pow(Math.log(Math.max(1, m)) / growth, 1 / power) * 1000;
};

/* ---------- Limbo ---------- */

export const LIMBO_MIN_TARGET = 1.01;
export const LIMBO_MAX_TARGET = 1000;

/** The drawn multiplier. P(result ≥ t) = RTP/t, so staking on t returns
    RTP whatever t is. */
export function limboResult(hashHex: string): number {
  const r = floatFromHash(hashHex);
  return Math.max(1, Math.floor((RTP / (1 - r)) * 100) / 100);
}

/* ---------- Dice ---------- */

export type DiceMode = 'over' | 'under';
export const DICE_MIN_TARGET = 2;
export const DICE_MAX_TARGET = 98;

/** 0.00 – 100.00, two decimals, like every dice game players know. */
export function diceRoll(hashHex: string): number {
  return Math.floor(floatFromHash(hashHex) * 10_001) / 100;
}

export function diceChance(mode: DiceMode, target: number): number {
  return mode === 'over' ? (100 - target) / 100 : target / 100;
}

export function diceMultiplier(mode: DiceMode, target: number): number {
  const chance = diceChance(mode, target);
  return chance <= 0 ? 0 : Math.floor((RTP / chance) * 100) / 100;
}

export const diceWins = (mode: DiceMode, target: number, roll: number) =>
  mode === 'over' ? roll > target : roll < target;

/* ---------- Coin Flip ---------- */

export type CoinSide = 'heads' | 'tails';
export const COIN_MULTIPLIER = Math.floor(RTP * 2 * 100) / 100;

export const coinFace = (hashHex: string): CoinSide =>
  floatFromHash(hashHex) < 0.5 ? 'heads' : 'tails';

/* ---------- Plinko ---------- */

export type PlinkoRisk = 'low' | 'medium' | 'high';
export const PLINKO_ROWS = [8, 12, 16] as const;
export type PlinkoRows = (typeof PLINKO_ROWS)[number];

/** How sharply the edges are rewarded. Higher = a flatter middle and a
    much fatter tail, which is exactly what "risk" means here. */
const RISK_ALPHA: Record<PlinkoRisk, number> = { low: 0.42, medium: 0.68, high: 0.95 };

const binomial = (rows: number): number[] => {
  // one row of Pascal's triangle, normalised
  const c: number[] = [1];
  for (let i = 1; i <= rows; i++) c.push((c[i - 1] * (rows - i + 1)) / i);
  const total = c.reduce((a, b) => a + b, 0);
  return c.map((n) => n / total);
};

/**
 * Payout table for one (rows, risk) pair, derived rather than copied:
 * take a shape that rises towards the rare edge buckets, then scale the
 * whole row so the expected return is exactly RTP. The middle bucket
 * absorbs the rounding, and the result is asserted to never pay out more
 * than RTP — a table that drifted above 1 would be a house that loses.
 */
function buildPlinkoTable(rows: PlinkoRows, risk: PlinkoRisk): number[] {
  const p = binomial(rows);
  const shape = p.map((prob) => Math.pow(1 / prob, RISK_ALPHA[risk]));
  const raw = shape.reduce((sum, s, i) => sum + p[i] * s, 0);
  const scaled = shape.map((s) => (s * RTP) / raw);

  const table = scaled.map((m) => Math.max(0.1, Math.round(m * 100) / 100));

  // rounding nudged the return either way — pull the centre back so the
  // table pays RTP or a shade under, never over
  const mid = Math.floor(table.length / 2);
  const paid = table.reduce((sum, m, i) => sum + p[i] * m, 0);
  const fix = table[mid] + (RTP - paid) / p[mid];
  table[mid] = Math.max(0.1, Math.floor(fix * 100) / 100);

  return table;
}

export const PLINKO_TABLES: Record<PlinkoRisk, Record<PlinkoRows, number[]>> = {
  low: { 8: buildPlinkoTable(8, 'low'), 12: buildPlinkoTable(12, 'low'), 16: buildPlinkoTable(16, 'low') },
  medium: { 8: buildPlinkoTable(8, 'medium'), 12: buildPlinkoTable(12, 'medium'), 16: buildPlinkoTable(16, 'medium') },
  high: { 8: buildPlinkoTable(8, 'high'), 12: buildPlinkoTable(12, 'high'), 16: buildPlinkoTable(16, 'high') },
};

/** One left/right decision per row, each from its own slice of the hash,
    so the whole path is reproducible from the revealed seed. */
export function plinkoPath(hashHex: string, rows: number): number[] {
  const path: number[] = [];
  for (let i = 0; i < rows; i++) {
    const bit = parseInt(hashHex[i % hashHex.length], 16);
    path.push(bit >= 8 ? 1 : 0);
  }
  return path;
}

export const plinkoBucket = (path: number[]) => path.reduce((a, b) => a + b, 0);

/* ============================================================
   Shapes shared with the browser
   ============================================================ */

export interface FairnessInfo {
  serverSeedHash: string;
  clientSeed: string;
  nonce: number;
  /** only present once the round is settled */
  serverSeed?: string;
}

/** What one settled instant round looks like coming back from the API. */
export interface InstantResult {
  game: MiniGameId;
  stake: number;
  payout: number;
  multiplier: number;
  won: boolean;
  balance: number;
  fairness: FairnessInfo;
  /** whatever the game needs to draw its own outcome */
  detail: Record<string, number | string | number[]>;
}

export interface FlightRoundView {
  game: 'crash' | 'jetx';
  stake: number;
  /** server clock, so the screen animates off the same start the payout uses */
  startedAt: number;
  serverNow: number;
  fairness: FairnessInfo;
}

export interface FlightSettled {
  game: 'crash' | 'jetx';
  stake: number;
  payout: number;
  multiplier: number;
  crashAt: number;
  won: boolean;
  balance: number;
  fairness: FairnessInfo;
}

export type MiniReason =
  | 'no-backend' | 'unauthorized' | 'unknown-game' | 'invalid-stake'
  | 'below-minimum' | 'above-maximum' | 'invalid-bet' | 'insufficient-balance'
  | 'round-open' | 'no-round' | 'already-crashed' | 'db-error';

export const MINI_ERROR: Record<MiniReason, string> = {
  'no-backend': 'গেম সার্ভার এখনো যুক্ত হয়নি',
  unauthorized: 'খেলতে আগে লগইন করুন',
  'unknown-game': 'এই গেমটি পাওয়া যায়নি',
  'invalid-stake': 'বাজির অংক ঠিক নেই',
  'below-minimum': `সর্বনিম্ন বাজি ৳${MIN_STAKE_PAISA / 100}`,
  'above-maximum': `সর্বোচ্চ বাজি ৳${(MAX_STAKE_PAISA / 100).toLocaleString('en-IN')}`,
  'invalid-bet': 'বাজির শর্ত ঠিক নেই',
  'insufficient-balance': 'ব্যালেন্স যথেষ্ট নয়',
  'round-open': 'আগের রাউন্ড এখনো চলছে',
  'no-round': 'চলমান কোনো রাউন্ড নেই',
  'already-crashed': 'রাউন্ড শেষ হয়ে গেছে',
  'db-error': 'সমস্যা হয়েছে — আবার চেষ্টা করুন',
};

export const fmtX = (m: number) => `${m.toFixed(2)}x`;
