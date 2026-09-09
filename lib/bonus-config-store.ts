/** Persistence for what the house pays out (lib/bonus-config.ts).

    Same file-store shape as site-settings-store and cashier-config-store: a
    serialised write queue in .data/, defaults for anything never saved, and
    every save validated in full so the claim engine can trust what it reads.
    A bad field is refused rather than clamped — an operator who typed 500
    where they meant 5 should be told, not quietly obeyed. */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
  BONUS_DEFAULTS,
  type BonusConfig,
  type PromoCode,
  type WheelSegment,
} from './bonus-config';

type Store = { version: 1; config: Partial<BonusConfig> };

const STORE_FILE = path.join(process.cwd(), '.data', 'bonus-config.json');
const MAX_DAYS = 30;
const MAX_CODES = 50;
const MAX_SLICES = 12;

export type BonusMutationResult =
  | { ok: true; config: BonusConfig }
  | { ok: false; reason: string };

let writeQueue = Promise.resolve();

export async function getBonusConfig(): Promise<BonusConfig> {
  return merge((await readStore()).config);
}

export async function updateBonusConfig(patch: unknown): Promise<BonusMutationResult> {
  const record = (patch && typeof patch === 'object' ? patch : {}) as Record<string, unknown>;

  return mutateStore((store) => {
    const current = merge(store.config);
    const next: BonusConfig = { ...current };

    if (record.wheel && typeof record.wheel === 'object') {
      const r = record.wheel as Record<string, unknown>;
      const raw = Array.isArray(r.segments) ? r.segments : current.wheel.segments;
      if (raw.length < 2 || raw.length > MAX_SLICES) return bad('wheel-slices');

      const segments: WheelSegment[] = raw.map((item) => {
        const c = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        return { amount: nonNeg(c.amount, 0), weight: nonNeg(c.weight, 0) };
      });
      /* A wheel where nothing can come up would spin forever and pay
         nothing, so it is refused rather than saved and puzzled over. */
      if (segments.reduce((n, seg) => n + seg.weight, 0) <= 0) return bad('wheel-weights');

      next.wheel = {
        active: bool(r.active, current.wheel.active),
        minDeposited: nonNeg(r.minDeposited, current.wheel.minDeposited),
        segments,
      };
    }

    if (record.signIn && typeof record.signIn === 'object') {
      const r = record.signIn as Record<string, unknown>;
      const days = Array.isArray(r.days)
        ? r.days.map((d) => num(d, -1)).filter((d) => d >= 0)
        : current.signIn.days;
      if (days.length === 0 || days.length > MAX_DAYS) return bad('sign-in-days');
      next.signIn = {
        active: bool(r.active, current.signIn.active),
        days,
        minDeposited: nonNeg(r.minDeposited, current.signIn.minDeposited),
      };
    }

    if (record.rescue && typeof record.rescue === 'object') {
      const r = record.rescue as Record<string, unknown>;
      const percent = num(r.percent, current.rescue.percent);
      if (percent < 0 || percent > 100) return bad('rescue-percent');
      next.rescue = {
        active: bool(r.active, current.rescue.active),
        percent,
        minLoss: nonNeg(r.minLoss, current.rescue.minLoss),
        maxPayout: nonNeg(r.maxPayout, current.rescue.maxPayout),
      };
    }

    if (record.rebate && typeof record.rebate === 'object') {
      const r = record.rebate as Record<string, unknown>;
      const percent = num(r.percent, current.rebate.percent);
      if (percent < 0 || percent > 100) return bad('rebate-percent');
      next.rebate = {
        active: bool(r.active, current.rebate.active),
        percent,
        minClaim: nonNeg(r.minClaim, current.rebate.minClaim),
      };
    }

    if (record.promo && typeof record.promo === 'object') {
      const r = record.promo as Record<string, unknown>;
      const raw = Array.isArray(r.codes) ? r.codes : [];
      if (raw.length > MAX_CODES) return bad('too-many-codes');

      const seen = new Set<string>();
      const codes: PromoCode[] = [];
      for (const item of raw) {
        const c = (item && typeof item === 'object' ? item : {}) as Record<string, unknown>;
        /* Codes are read down a phone and typed by hand, so they are folded
           to one shape here — upper case, no spaces — and matched the same
           way at redeem time. */
        const code = String(c.code ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 24);
        if (!code) return bad('empty-code');
        if (seen.has(code)) return bad('duplicate-code');
        seen.add(code);
        codes.push({
          code,
          amount: nonNeg(c.amount, 0),
          limit: Math.max(0, Math.floor(num(c.limit, 0))),
          active: bool(c.active, true),
        });
      }
      next.promo = { active: bool(r.active, current.promo.active), codes };
    }

    return { ok: true as const, store: { version: 1 as const, config: next }, config: next };
  });
}

/* ---------------------------------------------------------------- bits ---- */

const bad = (reason: string) => ({ ok: false as const, reason });

const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

const num = (v: unknown, fallback: number) => {
  const n = typeof v === 'number' ? v : Number(v);
  return Number.isFinite(n) ? n : fallback;
};

const nonNeg = (v: unknown, fallback: number) => Math.max(0, num(v, fallback));

function merge(saved: Partial<BonusConfig>): BonusConfig {
  return {
    wheel: { ...BONUS_DEFAULTS.wheel, ...(saved.wheel ?? {}) },
    signIn: { ...BONUS_DEFAULTS.signIn, ...(saved.signIn ?? {}) },
    rescue: { ...BONUS_DEFAULTS.rescue, ...(saved.rescue ?? {}) },
    rebate: { ...BONUS_DEFAULTS.rebate, ...(saved.rebate ?? {}) },
    promo: { ...BONUS_DEFAULTS.promo, ...(saved.promo ?? {}) },
  };
}

async function readStore(): Promise<Store> {
  try {
    const raw = await readFile(STORE_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Store;
    if (parsed?.version === 1 && parsed.config) return parsed;
  } catch { /* never saved, or unreadable — defaults answer */ }
  return { version: 1, config: {} };
}

async function mutateStore(
  apply: (store: Store) => { ok: true; store: Store; config: BonusConfig } | { ok: false; reason: string },
): Promise<BonusMutationResult> {
  const run = writeQueue.then(async (): Promise<BonusMutationResult> => {
    const store = await readStore();
    const result = apply(store);
    if (!result.ok) return result;

    await mkdir(path.dirname(STORE_FILE), { recursive: true });
    await writeFile(STORE_FILE, JSON.stringify(result.store, null, 2), 'utf8');
    return { ok: true, config: result.config };
  });

  // the queue must survive a rejected write, or every later save is skipped
  writeQueue = run.then(() => undefined, () => undefined);
  return run;
}
