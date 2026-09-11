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

export type WheelSegment = {
  /** taka this slice pays */
  amount: number;
  /** how often it comes up, relative to the others; 0 never does */
  weight: number;
};

export type WheelConfig = {
  active: boolean;
  /** the free spin unlocks once this much has been deposited, ever */
  minDeposited: number;
  /** the slices, clockwise from the top */
  segments: WheelSegment[];
};

export type Mission = {
  id: string;
  title: string;
  /** what counts towards it: everything staked, or everything deposited */
  measure: 'bet' | 'deposit';
  /** taka to reach */
  target: number;
  /** taka paid on reaching it */
  reward: number;
  /** the window it counts over, and resets on */
  period: 'daily' | 'weekly' | 'once';
  active: boolean;
};

export type MissionConfig = {
  active: boolean;
  list: Mission[];
};

/** How much of a bonus must be bet before any of the wallet can be
    withdrawn: the bonus times this. 0 turns the rule off. */
export type TurnoverConfig = {
  multiplier: number;
};

export type BonusConfig = {
  wheel: WheelConfig;
  missions: MissionConfig;
  signIn: SignInConfig;
  rescue: RescueConfig;
  rebate: RebateConfig;
  promo: PromoConfig;
  turnover: TurnoverConfig;
};

export const BONUS_DEFAULTS: BonusConfig = {
  /* Nothing ships switched on with a made-up target: a mission is a promise
     about somebody's money, and the operator writes it. */
  missions: { active: true, list: [] },
  wheel: {
    active: true,
    minDeposited: 100,
    /* Eight slices, the way the reference draws it. The weights are the
       whole design: the big number has to be on the wheel to be worth
       spinning and has to be rare enough to be affordable, and both of
       those are the operator's call, not this file's. */
    segments: [
      { amount: 1, weight: 30 },
      { amount: 3, weight: 25 },
      { amount: 5, weight: 20 },
      { amount: 10, weight: 12 },
      { amount: 25, weight: 7 },
      { amount: 100, weight: 4 },
      { amount: 200, weight: 1.5 },
      { amount: 500, weight: 0.5 },
    ],
  },
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
  turnover: { multiplier: 1 },
  promo: {
    active: true,
    codes: [],
  },
};

export type BonusKind = 'signin' | 'rescue' | 'rebate' | 'promo' | 'spin' | 'mission';

export const BONUS_LABEL: Record<BonusKind, string> = {
  signin: 'Sign In',
  rescue: 'Rescue fund',
  rebate: 'Rebate',
  promo: 'Promo Code',
  spin: 'Free Spin',
  mission: 'Mission',
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
  | 'no-spin-left'
  | 'unknown-mission'
  | 'not-finished'
  | 'account-banned'
  | 'account-held'
  | 'db-error';

export const CLAIM_MESSAGE: Record<ClaimReason, string> = {
  'no-backend': 'The server is not connected yet',
  unauthorized: 'Log in first',
  inactive: 'This offer is switched off right now',
  'already-claimed': 'Already claimed',
  'needs-deposit': 'Make a deposit first',
  'nothing-to-claim': 'Nothing to claim right now',
  'below-minimum': 'The amount is below the minimum',
  'unknown-code': 'That code is not valid',
  'code-used-up': 'That code has been used up',
  'no-spin-left': 'Your free spin has been used',
  'unknown-mission': 'That mission is no longer running',
  'not-finished': 'That mission is not finished yet',
  'account-banned': 'This account has been banned. Contact support.',
  'account-held': 'This account is on hold. Contact support.',
  'db-error': 'Something went wrong — try again',
};

/** The ledger ref a claim is written under. It is the idempotency key: one
    per player per period, so a second claim collides instead of paying
    twice — see supabase/009_bonus_claims.sql. */
export const claimRef = (kind: BonusKind, key: string) => `${kind}:${key}`;

/** taka the operator typed → paisa the wallet stores. Rounds down, so a
    fraction of a paisa is never invented. */
/* Rounded to 1/100 paisa before the floor: 1.15 * 100 is 114.999… in
   floating point, and a bare floor would pay 114. */
export const toPaisaFloor = (taka: number) => Math.floor(Math.round(taka * 10_000) / 100);
