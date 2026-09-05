/** Shape of an Aviator bet. Pure — the game screen and the API both read it.

    Bets live in .data/ rather than the `aviator_bets` table because rounds are
    served from the file-based signal store, and that table keys every row to
    `aviator_rounds(id)`. Money still moves through the wallet ledger, so a bet
    is auditable there as a `bet`/`win` pair. */

export type AviatorBet = {
  id: string;
  userId: string;
  roundId: number;
  /** which of the two seats on screen */
  slot: 0 | 1;
  /** paisa */
  stake: number;
  /** multiplier the player took, null while the bet is still riding */
  cashedAt: number | null;
  /** paisa returned; 0 until cashed out, and stays 0 on a bust */
  payout: number;
  placedAt: string;
  settledAt: string | null;
};

export type PublicBet = {
  slot: 0 | 1;
  roundId: number;
  stake: number;
  cashedAt: number | null;
  payout: number;
  settled: boolean;
};

export type BetReason =
  | 'unauthorized'
  | 'no-backend'
  | 'betting-closed'
  | 'already-placed'
  | 'invalid-stake'
  | 'below-minimum'
  | 'insufficient-balance'
  | 'no-open-bet'
  | 'round-crashed'
  | 'not-flying'
  | 'db-error';

export type BetResult =
  | { ok: true; balance: number; bets: PublicBet[]; cashedAt?: number; payout?: number }
  | { ok: false; reason: BetReason; message?: string };

/** ৳10, in paisa. Matches MIN_STAKE on the bet panel. */
export const MIN_STAKE_PAISA = 1000;

export const publicBet = (bet: AviatorBet): PublicBet => ({
  slot: bet.slot,
  roundId: bet.roundId,
  stake: bet.stake,
  cashedAt: bet.cashedAt,
  payout: bet.payout,
  settled: bet.settledAt !== null,
});

export const BET_ERROR: Record<BetReason, string> = {
  unauthorized: 'বেট করতে লগইন করুন',
  'no-backend': 'ডেটাবেস যুক্ত হয়নি',
  'betting-closed': 'এই রাউন্ডে বেটের সময় শেষ',
  'already-placed': 'এই সিটে বেট বসানো আছে',
  'invalid-stake': 'বেটের পরিমাণ ঠিক নয়',
  'below-minimum': 'সর্বনিম্ন বেট ৳১০',
  'insufficient-balance': 'ব্যালেন্স যথেষ্ট নয়',
  'no-open-bet': 'এই সিটে চালু কোনো বেট নেই',
  'round-crashed': 'রাউন্ড উড়ে গেছে',
  'not-flying': 'এখনো ওড়া শুরু হয়নি',
  'db-error': 'সমস্যা হয়েছে, আবার চেষ্টা করুন',
};
