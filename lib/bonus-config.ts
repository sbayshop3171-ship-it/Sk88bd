/** What the house pays out, and on what terms.

    Five things on the member screens hand a player money that they did not
    win at a game: the daily sign-in, a loss-back fund, a promo code, the
    rebate on what they staked, and the referral bonus. Every one of them is
    a number somebody has to decide, and the person who decides it is the
    operator — not whoever last edited this file. So the numbers live in a
    store the admin panel writes (lib/bonus-config-store.ts) and the
    defaults below are only what a fresh install starts from.

    Amounts are in **taka** here, the way an operator types them. The claim
    engine converts to paisa on its way to the wallet, once, in one place. */

export type SignInConfig = {
  active: boolean;
  /** taka for day 1, day 2, … of an unbroken streak; the last repeats */
  days: number[];
  /** a player must have deposited this much, ever, before the first claim */
  minDeposited: number;
};

export type RescueConfig = {
  active: boolean;
  /** share of yesterday's net loss handed back */
  percent: number;
  /** below this much lost, there is nothing to rescue */
  minLoss: number;
  /** and never more than this in one day */
  maxPayout: number;
};

export type RebateConfig = {
  active: boolean;
  /** share of a day's stake */
  percent: number;
  /** below this the claim is refused rather than paying out a rounding */
  minClaim: number;
};

export type PromoCode = {
  code: string;
  /** taka */
  amount: number;
  /** how many players may redeem it; 0 is unlimited */
  limit: number;
  active: boolean;
};

export type PromoConfig = {
  active: boolean;
  codes: PromoCode[];
};

export type BonusConfig = {
  signIn: SignInConfig;
  rescue: RescueConfig;
  rebate: RebateConfig;
  promo: PromoConfig;
};

export const BONUS_DEFAULTS: BonusConfig = {
  signIn: {
    active: true,
    /* Seven days, climbing, then flat. Small enough that a week of it is
       cheaper than one bonus abuse, big enough that day seven is worth
       coming back for. */
    days: [1, 2, 3, 5, 8, 12, 20],
    minDeposited: 100,
  },
  rescue: {
    active: true,
    percent: 5,
    minLoss: 500,
    maxPayout: 500,
  },
  rebate: {
    active: true,
    percent: 0.5,
    minClaim: 1,
  },
  promo: {
    active: true,
    codes: [],
  },
};

export type BonusKind = 'signin' | 'rescue' | 'rebate' | 'promo';

export const BONUS_LABEL: Record<BonusKind, string> = {
  signin: 'Sign In',
  rescue: 'Rescue fund',
  rebate: 'Rebate',
  promo: 'Promo Code',
};

/** Why a claim was refused. Every one of these is shown to the player, so
    each has to be true and specific — "try again later" teaches nobody. */
export type ClaimReason =
  | 'no-backend'
  | 'unauthorized'
  | 'inactive'
  | 'already-claimed'
  | 'needs-deposit'
  | 'nothing-to-claim'
  | 'below-minimum'
  | 'unknown-code'
  | 'code-used-up'
  | 'db-error';

export const CLAIM_MESSAGE: Record<ClaimReason, string> = {
  'no-backend': 'সার্ভার এখনো যুক্ত হয়নি',
  unauthorized: 'আগে লগইন করুন',
  inactive: 'এই অফারটি এখন বন্ধ আছে',
  'already-claimed': 'এটি আগেই নেওয়া হয়েছে',
  'needs-deposit': 'প্রথমে ডিপোজিট করতে হবে',
  'nothing-to-claim': 'এখন নেওয়ার মতো কিছু নেই',
  'below-minimum': 'পরিমাণ ন্যূনতমের চেয়ে কম',
  'unknown-code': 'কোডটি ঠিক নেই',
  'code-used-up': 'কোডটির সীমা শেষ',
  'db-error': 'সমস্যা হয়েছে — আবার চেষ্টা করুন',
};

/** The ledger ref a claim is written under. It is the idempotency key: one
    per player per period, so a second claim collides instead of paying
    twice — see supabase/009_bonus_claims.sql. */
export const claimRef = (kind: BonusKind, key: string) => `${kind}:${key}`;

/** taka the operator typed → paisa the wallet stores. Rounds down, so a
    fraction of a paisa is never invented. */
export const toPaisaFloor = (taka: number) => Math.floor(taka * 100);
