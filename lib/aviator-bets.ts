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
  | 'above-maximum'
  | 'account-banned'
  | 'account-held'
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

/** ৳3,000, in paisa. Aviator's own ceiling — the other mini games keep
    MAX_STAKE_PAISA. Matches MAX_STAKE on the bet panel. */
export const MAX_STAKE_PAISA = 300_000;

export const publicBet = (bet: AviatorBet): PublicBet => ({
  slot: bet.slot,
  roundId: bet.roundId,
  stake: bet.stake,
  cashedAt: bet.cashedAt,
  payout: bet.payout,
  settled: bet.settledAt !== null,
});

export const BET_ERROR: Record<BetReason, string> = {
  unauthorized: 'Log in to place a bet',
  'no-backend': 'The database is not connected',
  'betting-closed': 'Betting is closed for this round',
  'already-placed': 'This seat already has a bet',
  'invalid-stake': 'That bet amount is not valid',
  'below-minimum': 'Minimum bet is ৳10',
  'above-maximum': 'Maximum bet is ৳3,000',
  'account-banned': 'This account has been banned. Contact support.',
  'account-held': 'This account is on hold. Contact support.',
  'insufficient-balance': 'Not enough balance',
  'no-open-bet': 'No open bet on this seat',
  'round-crashed': 'The round flew away',
  'not-flying': 'The plane has not taken off yet',
  'db-error': 'Something went wrong, try again',
};
