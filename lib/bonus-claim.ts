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
import { adminClient, serverClient } from './supabase';

type CookieStore = Parameters<typeof serverClient>[0];

export type ClaimResult =
  | { ok: true; kind: BonusKind; amount: number; balance: number; slot?: number }
  | { ok: false; reason: ClaimReason; message?: string };

export type BonusState = {
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

  const spun = claimedRefs(rows, 'spin').has(claimRef('spin', SPIN_KEY));
  const wheelReady = deposited >= toPaisaFloor(cfg.wheel.minDeposited);

  return {
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

const blankState = (cfg: BonusConfig): BonusState => ({
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

  const cfg = await getBonusConfig();
  const rows = await ledger(who.db, who.uid);
  const today = bdDay();
  const yesterday = dayBefore(today);

  let amount = 0;
  let ref = '';
  let slot: number | undefined;

  if (kind === 'signin') {
    if (!cfg.signIn.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('signin', today);
    const signRefs = claimedRefs(rows, 'signin');
    if (signRefs.has(ref)) return { ok: false, reason: 'already-claimed' };

    const deposited = rows.filter((r) => r.kind === 'deposit').reduce((n, r) => n + r.amount, 0);
    if (deposited < toPaisaFloor(cfg.signIn.minDeposited)) return { ok: false, reason: 'needs-deposit' };

    const index = Math.min(streakOf(signRefs, today), cfg.signIn.days.length - 1);
    amount = toPaisaFloor(cfg.signIn.days[index] ?? 0);
  } else if (kind === 'rescue') {
    if (!cfg.rescue.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('rescue', yesterday);
    if (claimedRefs(rows, 'rescue').has(ref)) return { ok: false, reason: 'already-claimed' };

    const loss = -dayTotals(rows, yesterday).net;
    if (loss < toPaisaFloor(cfg.rescue.minLoss)) return { ok: false, reason: 'nothing-to-claim' };
    amount = Math.min(Math.round((loss * cfg.rescue.percent) / 100), toPaisaFloor(cfg.rescue.maxPayout));
  } else if (kind === 'rebate') {
    if (!cfg.rebate.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('rebate', yesterday);
    if (claimedRefs(rows, 'rebate').has(ref)) return { ok: false, reason: 'already-claimed' };

    amount = Math.round((dayTotals(rows, yesterday).staked * cfg.rebate.percent) / 100);
    if (amount < toPaisaFloor(cfg.rebate.minClaim)) return { ok: false, reason: 'below-minimum' };
  } else if (kind === 'spin') {
    if (!cfg.wheel.active) return { ok: false, reason: 'inactive' };
    ref = claimRef('spin', SPIN_KEY);
    if (claimedRefs(rows, 'spin').has(ref)) return { ok: false, reason: 'no-spin-left' };

    const deposited = rows.filter((r) => r.kind === 'deposit').reduce((n, r) => n + r.amount, 0);
    if (deposited < toPaisaFloor(cfg.wheel.minDeposited)) return { ok: false, reason: 'needs-deposit' };

    slot = pickSlice(cfg.wheel.segments.map((seg) => seg.weight));
    amount = toPaisaFloor(cfg.wheel.segments[slot]?.amount ?? 0);
  } else {
    if (!cfg.promo.active) return { ok: false, reason: 'inactive' };
    const wanted = String(code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
    const found = cfg.promo.codes.find((c) => c.code === wanted && c.active);
    if (!found) return { ok: false, reason: 'unknown-code' };

    ref = claimRef('promo', found.code);
    if (claimedRefs(rows, 'promo').has(ref)) return { ok: false, reason: 'already-claimed' };

    if (found.limit > 0) {
      const { count } = await who.db
        .from('transactions')
        .select('id', { count: 'exact', head: true })
        .eq('ref', ref);
      if ((count ?? 0) >= found.limit) return { ok: false, reason: 'code-used-up' };
    }
    amount = toPaisaFloor(found.amount);
  }

  if (amount <= 0) return { ok: false, reason: 'nothing-to-claim' };

  const credit = await who.db.rpc('wallet_apply', {
    p_user: who.uid,
    p_kind: kind === 'rebate' ? 'rebate' : 'bonus',
    p_amount: amount,
    p_ref: ref,
  });

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
