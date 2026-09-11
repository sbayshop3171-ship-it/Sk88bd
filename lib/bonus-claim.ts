/** The claim engine.

    Five screens hand a player money they did not win at a game. What each
    one pays is the operator's decision (lib/bonus-config.ts); this file is
    the part that must not get it wrong — how much is owed right now, whether
    it has already been taken, and the one write that moves it.

    Every claim goes into the ledger under a ref that names the period:
    `signin:2026-09-09`, `rebate:2026-09-08`, `promo:WELCOME50`. That ref is
    the idempotency key. Checking it before writing catches the ordinary
    double-tap; the unique index in supabase/009_bonus_claims.sql catches the
    two requests that arrive at once, which is the case a check alone cannot.

    Amounts are taka in the config and paisa in the wallet. The conversion
    happens here, once, on the way out. */

import { getBonusConfig } from './bonus-config-store';
import {
  claimRef,
  toPaisaFloor,
  type BonusConfig,
  type BonusKind,
  type ClaimReason,
} from './bonus-config';
import { creditBonus } from './bonus-credit';
import { accountBlock } from './player-status';
import { adminClient, serverClient } from './supabase';

type CookieStore = Parameters<typeof serverClient>[0];

export type ClaimResult =
  | { ok: true; kind: BonusKind; amount: number; balance: number; slot?: number }
  | { ok: false; reason: ClaimReason; message?: string };

export type MissionView = {
  id: string;
  title: string;
  measure: 'bet' | 'deposit';
  /** paisa */
  target: number;
  progress: number;
  reward: number;
  period: 'daily' | 'weekly' | 'once';
  done: boolean;
  claimed: boolean;
};

export type BonusState = {
  missions: MissionView[];
  wheel: {
    active: boolean;
    /** taka each slice pays, clockwise from the top — what the UI draws */
    segments: number[];
    available: boolean;
    spun: boolean;
    needsDeposit: boolean;
  };
  signIn: { active: boolean; day: number; amount: number; claimed: boolean; needsDeposit: boolean };
  rescue: { active: boolean; amount: number; claimed: boolean };
  rebate: { active: boolean; day: string; staked: number; amount: number; claimed: boolean };
  promo: { active: boolean };
};

type Db = NonNullable<ReturnType<typeof adminClient>>;

type Who =
  | { ok: true; uid: string; db: Db }
  | { ok: false; reason: ClaimReason };

async function signedInUser(cookies: CookieStore): Promise<Who> {
  const auth = serverClient(cookies);
  const db = adminClient();
  if (!auth || !db) return { ok: false, reason: 'no-backend' };
  const { data } = await auth.auth.getUser();
  if (!data.user) return { ok: false, reason: 'unauthorized' };
  return { ok: true, uid: data.user.id, db };
}

/* ------------------------------------------------------------- days ------ */

/** yyyy-mm-dd in Bangladesh time — the clock these days are cut on, and the
    one the player is reading. Doing it in UTC would roll the day over at
    6am local, which is the middle of a session. */
const BD_OFFSET_MS = 6 * 60 * 60 * 1000;

export const bdDay = (at: Date = new Date()) =>
  new Date(at.getTime() + BD_OFFSET_MS).toISOString().slice(0, 10);

const dayBefore = (day: string) => {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};

/** The window of a Bangladesh day, as the UTC instants the ledger stores. */
const spanOf = (day: string) => {
  const start = new Date(`${day}T00:00:00Z`).getTime() - BD_OFFSET_MS;
  return [new Date(start).toISOString(), new Date(start + 86_400_000).toISOString()];
};

/* ------------------------------------------------------------ reads ------ */

type Txn = { kind: string; amount: number; ref: string | null; created_at: string };

async function ledger(db: Db, uid: string, limit = 1000): Promise<Txn[]> {
  const { data } = await db
    .from('transactions')
    .select('kind, amount, ref, created_at')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data as Txn[] | null) ?? [];
}

const claimedRefs = (rows: Txn[], prefix: string) =>
  new Set(rows.filter((r) => r.ref?.startsWith(`${prefix}:`)).map((r) => r.ref!));

type Facts = { deposited: number; staked: number; won: number };

/** Lifetime deposits, and yesterday's stakes and wins, from the database
    (018). Before 018 the function is missing and the fetched rows answer. */
async function bonusFacts(db: Db, uid: string, day: string, rows: Txn[]): Promise<Facts> {
  const [from, to] = spanOf(day);
  const { data, error } = await db.rpc('bonus_facts', { p_user: uid, p_from: from, p_to: to });
  if (!error && data && typeof data === 'object') {
    const f = data as Record<string, unknown>;
    return { deposited: Number(f.deposited) || 0, staked: Number(f.staked) || 0, won: Number(f.won) || 0 };
  }
  const t = dayTotals(rows, day);
  return {
    deposited: rows.filter((r) => r.kind === 'deposit').reduce((n, r) => n + r.amount, 0),
    staked: t.staked,
    won: t.won,
  };
}

/** A promo payout, its limit counted under the same lock (018). */
async function claimPromo(db: Db, input: { user: string; amount: number; ref: string; limit: number }) {
  const { getBonusConfig: cfgOf } = await import('./bonus-config-store');
  const { turnover } = await cfgOf();
  const need = Math.round(input.amount * Math.max(0, Number(turnover.multiplier) || 0));
  const paid = await db.rpc('claim_promo', {
    p_user: input.user, p_ref: input.ref, p_amount: input.amount, p_turnover: need, p_limit: input.limit,
  });
  if (paid.error && (paid.error.code === 'PGRST202' || /could not find the function/i.test(paid.error.message))) {
    // before 018: the old count-then-pay
    if (input.limit > 0) {
      const { count } = await db.from('transactions').select('id', { count: 'exact', head: true }).eq('ref', input.ref);
      if ((count ?? 0) >= input.limit) return { data: null, error: { message: 'code used up' } };
    }
    return creditBonus(db, { user: input.user, kind: 'bonus', amount: input.amount, ref: input.ref });
  }
  return paid;
}

/** What was staked, and what came back, on one Bangladesh day. */
function dayTotals(rows: Txn[], day: string) {
  const [from, to] = spanOf(day);
  let staked = 0;
  let won = 0;
  for (const r of rows) {
    if (r.created_at < from || r.created_at >= to) continue;
    if (r.kind === 'bet') staked += -r.amount;
    if (r.kind === 'win') won += r.amount;
  }
  return { staked, won, net: won - staked };
}

/** How many days in a row have been signed for, counting back from today. */
function streakOf(refs: Set<string>, today: string): number {
  let day = today;
  let n = 0;
  // today's own claim does not extend the streak, it is the one being made
  if (refs.has(claimRef('signin', day))) return 0;
  for (;;) {
    day = dayBefore(day);
    if (!refs.has(claimRef('signin', day))) return n;
    n += 1;
    if (n > 400) return n;
  }
}

/* ------------------------------------------------------------ state ------ */

export async function bonusState(cookies: CookieStore): Promise<BonusState | null> {
  const cfg = await getBonusConfig();
  const who = await signedInUser(cookies);
  if (!who.ok) return blankState(cfg);

  const rows = await ledger(who.db, who.uid);
  const today = bdDay();
  const yesterday = dayBefore(today);

  const signRefs = claimedRefs(rows, 'signin');
  const streak = streakOf(signRefs, today);
  const dayIndex = Math.min(streak, cfg.signIn.days.length - 1);
  const deposited = rows.filter((r) => r.kind === 'deposit').reduce((n, r) => n + r.amount, 0);

  const loss = -dayTotals(rows, yesterday).net;
  const rescueAmount = loss >= toPaisaFloor(cfg.rescue.minLoss)
    ? Math.min(Math.round((loss * cfg.rescue.percent) / 100), toPaisaFloor(cfg.rescue.maxPayout))
    : 0;

  const staked = dayTotals(rows, yesterday).staked;
  const rebateAmount = Math.round((staked * cfg.rebate.percent) / 100);

  const missionRefs = claimedRefs(rows, 'mission');
  const missions: MissionView[] = cfg.missions.active
    ? cfg.missions.list.filter((m) => m.active).map((m) => {
        const progress = measured(rows, m.measure, m.period, today);
        const target = toPaisaFloor(m.target);
        return {
          id: m.id,
          title: m.title,
          measure: m.measure,
          target,
          progress,
          reward: toPaisaFloor(m.reward),
          period: m.period,
          done: progress >= target,
          claimed: missionRefs.has(claimRef('mission', `${m.id}:${periodKey(m.period, today)}`)),
        };
      })
    : [];

  const spun = claimedRefs(rows, 'spin').has(claimRef('spin', SPIN_KEY));
  const wheelReady = deposited >= toPaisaFloor(cfg.wheel.minDeposited);

  return {
    missions,
    wheel: {
      active: cfg.wheel.active,
      segments: cfg.wheel.segments.map((seg) => seg.amount),
      available: cfg.wheel.active && wheelReady && !spun,
      spun,
      needsDeposit: !wheelReady,
    },
    signIn: {
      active: cfg.signIn.active,
      day: dayIndex + 1,
      amount: toPaisaFloor(cfg.signIn.days[dayIndex] ?? 0),
      claimed: signRefs.has(claimRef('signin', today)),
      needsDeposit: deposited < toPaisaFloor(cfg.signIn.minDeposited),
    },
    rescue: {
      active: cfg.rescue.active,
      amount: rescueAmount,
      claimed: claimedRefs(rows, 'rescue').has(claimRef('rescue', yesterday)),
    },
    rebate: {
      active: cfg.rebate.active,
      day: yesterday,
      staked,
      amount: rebateAmount,
      claimed: claimedRefs(rows, 'rebate').has(claimRef('rebate', yesterday)),
    },
    promo: { active: cfg.promo.active },
  };
}

/** One free spin, ever. The key is a constant rather than a date because
    that is exactly what "one per account" means — and it is the ref, so the
    unique index enforces it rather than this file. */
const SPIN_KEY = 'first';

/** The window a mission counts over. `once` never resets, so its key is a
    constant and the ledger ref makes it a one-off by itself. */
function periodKey(period: 'daily' | 'weekly' | 'once', today: string): string {
  if (period === 'once') return 'once';
  if (period === 'daily') return today;
  // the Monday the day falls in, so a week is a week and not the last seven days
  const d = new Date(`${today}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return `w${d.toISOString().slice(0, 10)}`;
}

/** How much of the thing a mission measures has happened in its window. */
function measured(
  rows: Txn[],
  measure: 'bet' | 'deposit',
  period: 'daily' | 'weekly' | 'once',
  today: string,
): number {
  const kind = measure === 'deposit' ? 'deposit' : 'bet';
  const from = period === 'once'
    ? ''
    : spanOf(period === 'daily' ? today : periodKey(period, today).slice(1))[0];

  let total = 0;
  for (const r of rows) {
    if (r.kind !== kind) continue;
    if (from && r.created_at < from) continue;
    total += measure === 'deposit' ? r.amount : -r.amount;
  }
  return total;
}

const blankState = (cfg: BonusConfig): BonusState => ({
  missions: [],
  wheel: {
    active: cfg.wheel.active,
    segments: cfg.wheel.segments.map((seg) => seg.amount),
    available: false,
    spun: false,
    needsDeposit: true,
  },
  signIn: { active: cfg.signIn.active, day: 1, amount: toPaisaFloor(cfg.signIn.days[0] ?? 0), claimed: false, needsDeposit: true },
  rescue: { active: cfg.rescue.active, amount: 0, claimed: false },
  rebate: { active: cfg.rebate.active, day: dayBefore(bdDay()), staked: 0, amount: 0, claimed: false },
  promo: { active: cfg.promo.active },
});

/* ------------------------------------------------------------ claim ------ */

export async function claimBonus(
  cookies: CookieStore,
  kind: BonusKind,
  code?: string,
): Promise<ClaimResult> {
  const who = await signedInUser(cookies);
  if (!who.ok) return { ok: false, reason: who.reason };

  const blocked = await accountBlock(who.db, who.uid);
  if (blocked) return { ok: false, reason: blocked === 'banned' ? 'account-banned' : 'account-held' };

  const cfg = await getBonusConfig();
  const rows = await ledger(who.db, who.uid);
  const today = bdDay();
  const yesterday = dayBefore(today);
  /* The sums a claim turns on, over the whole ledger (migration 018). The
     1,000 newest rows used to stand in for it, and a busy player's older
     deposit or yesterday's early bets fell out of the window. */
  const facts = await bonusFacts(who.db, who.uid, yesterday, rows);

  let amount = 0;
  let ref = '';
  let slot: number | undefined;
  let promoLimit = 0;

  if (kind === 'signin') {
    if (!cfg.signIn.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('signin', today);
    const signRefs = claimedRefs(rows, 'signin');
    if (signRefs.has(ref)) return { ok: false, reason: 'already-claimed' };

    if (facts.deposited < toPaisaFloor(cfg.signIn.minDeposited)) return { ok: false, reason: 'needs-deposit' };

    const index = Math.min(streakOf(signRefs, today), cfg.signIn.days.length - 1);
    amount = toPaisaFloor(cfg.signIn.days[index] ?? 0);
  } else if (kind === 'rescue') {
    if (!cfg.rescue.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('rescue', yesterday);
    if (claimedRefs(rows, 'rescue').has(ref)) return { ok: false, reason: 'already-claimed' };

    const loss = facts.staked - facts.won;
    if (loss < toPaisaFloor(cfg.rescue.minLoss)) return { ok: false, reason: 'nothing-to-claim' };
    amount = Math.min(Math.round((loss * cfg.rescue.percent) / 100), toPaisaFloor(cfg.rescue.maxPayout));
  } else if (kind === 'rebate') {
    if (!cfg.rebate.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('rebate', yesterday);
    if (claimedRefs(rows, 'rebate').has(ref)) return { ok: false, reason: 'already-claimed' };

    amount = Math.round((facts.staked * cfg.rebate.percent) / 100);
    if (amount < toPaisaFloor(cfg.rebate.minClaim)) return { ok: false, reason: 'below-minimum' };
  } else if (kind === 'mission') {
    if (!cfg.missions.active) return { ok: false, reason: 'inactive' };
    const mission = cfg.missions.list.find((m) => m.id === code && m.active);
    if (!mission) return { ok: false, reason: 'unknown-mission' };

    ref = claimRef('mission', `${mission.id}:${periodKey(mission.period, today)}`);
    if (claimedRefs(rows, 'mission').has(ref)) return { ok: false, reason: 'already-claimed' };

    const progress = measured(rows, mission.measure, mission.period, today);
    if (progress < toPaisaFloor(mission.target)) return { ok: false, reason: 'not-finished' };
    amount = toPaisaFloor(mission.reward);
  } else if (kind === 'spin') {
    if (!cfg.wheel.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('spin', SPIN_KEY);
    if (claimedRefs(rows, 'spin').has(ref)) return { ok: false, reason: 'no-spin-left' };

    if (facts.deposited < toPaisaFloor(cfg.wheel.minDeposited)) return { ok: false, reason: 'needs-deposit' };

    slot = pickSlice(cfg.wheel.segments.map((seg) => seg.weight));
    amount = toPaisaFloor(cfg.wheel.segments[slot]?.amount ?? 0);
  } else {
    if (!cfg.promo.active) return { ok: false, reason: 'inactive' };
    const wanted = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
    const found = cfg.promo.codes.find((c) => c.code === wanted && c.active);
    if (!found) return { ok: false, reason: 'unknown-code' };

    ref = claimRef('promo', found.code);
    if (claimedRefs(rows, 'promo').has(ref)) return { ok: false, reason: 'already-claimed' };
    /* A code is for a player who has paid in. Without this, fresh accounts
       could each take it, bet the turnover off at the lowest odds and cash
       out nearly all of it. */
    if (facts.deposited <= 0) return { ok: false, reason: 'needs-deposit' };
    amount = toPaisaFloor(found.amount);
    promoLimit = found.limit;
  }

  if (amount <= 0) return { ok: false, reason: 'nothing-to-claim' };

  // paid with its turnover: bonus money is bet before it can be withdrawn.
  // A promo's limit is counted and paid under one lock (018): counting here
  // and paying after let fifty claims at once all see "49 used".
  const credit = kind === 'promo'
    ? await claimPromo(who.db, { user: who.uid, amount, ref, limit: promoLimit })
    : await creditBonus(who.db, {
      user: who.uid,
      kind: kind === 'rebate' ? 'rebate' : 'bonus',
      amount,
      ref,
    });

  if (credit.error && /code used up/i.test(credit.error.message)) return { ok: false, reason: 'code-used-up' };
  if (credit.error) {
    /* The unique index refusing a second write is not a fault — it is the
       guard doing its job on two taps that arrived together. */
    return /duplicate key|unique/i.test(credit.error.message)
      ? { ok: false, reason: 'already-claimed' }
      : { ok: false, reason: 'db-error', message: credit.error.message };
  }

  return { ok: true, kind, amount, balance: Number(credit.data ?? 0), slot };
}

/** Which slice comes up, weighted. Decided here and only here: the browser
    is told what it won, never asked. `Math.random` is right for this — the
    wheel is a giveaway, not a game somebody bets into, and the provable
    fairness the mini-games carry would be ceremony without a stake. */
function pickSlice(weights: number[]): number {
  const total = weights.reduce((n, w) => n + w, 0);
  if (total <= 0) return 0;
  let roll = Math.random() * total;
  for (let i = 0; i < weights.length; i += 1) {
    roll -= weights[i];
    if (roll < 0) return i;
  }
  return weights.length - 1;
}
