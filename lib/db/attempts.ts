/** Counting wrong guesses, and shutting the door after too many.

    Two ledgers share the logic: `login` (keyed by phone and by address, in
    login_attempts) and `password` (the fund-password checks, keyed by
    player, in security_attempts — migration 018's rule: five wrong in a row
    shuts them for 15 minutes). A run of failures further apart than an hour
    starts counting again, so an honest typo a week does not add up. */

import { one, rows, run, tx, withConn } from './pool';

const LEDGERS = {
  login: { table: 'login_attempts', key: 'k' },
  password: { table: 'security_attempts', key: 'user_id' },
} as const;

type Ledger = keyof typeof LEDGERS;

const WINDOW_MS = 60 * 60_000;

const leftOf = (until: unknown) => {
  const at = until ? Date.parse(String(until)) : 0;
  return at ? Math.max(0, Math.ceil((at - Date.now()) / 1000)) : 0;
};

/** Seconds until the longest of these keys opens again; 0 when all are open. */
export async function lockLeft(ledger: Ledger, keys: string[]): Promise<number> {
  if (!keys.length) return 0;
  const { table, key } = LEDGERS[ledger];
  const found = await withConn((c) => rows(c, `SELECT locked_until FROM ${table} WHERE ${key} IN (?)`, [keys]));
  return found.reduce((max, r) => Math.max(max, leftOf(r.locked_until)), 0);
}

/** One more failure against `k`. Returns the seconds it is now shut for. */
export async function recordFail(ledger: Ledger, k: string, max: number, lockMs: number): Promise<number> {
  const { table, key } = LEDGERS[ledger];
  return tx(async (c) => {
    const row = await one(c, `SELECT fails, locked_until, updated_at FROM ${table} WHERE ${key} = ? FOR UPDATE`, [k]);
    const now = Date.now();
    let fails = 1;
    let until: Date | null = null;
    if (row) {
      const lockedAt = row.locked_until ? Date.parse(String(row.locked_until)) : 0;
      const stale = !lockedAt && now - Date.parse(String(row.updated_at)) > WINDOW_MS;
      if (lockedAt && lockedAt > now) {
        fails = Number(row.fails) + 1;
        until = new Date(lockedAt);
      } else if (!lockedAt && !stale) {
        fails = Number(row.fails) + 1;
      }
    }
    if (fails >= max && !until) until = new Date(now + lockMs);
    await run(c, `INSERT INTO ${table} (${key}, fails, locked_until, updated_at) VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE fails = VALUES(fails), locked_until = VALUES(locked_until), updated_at = VALUES(updated_at)`,
    [k, fails, until, new Date(now)]);
    return until ? leftOf(until.toISOString()) : 0;
  });
}

export async function clearFails(ledger: Ledger, k: string): Promise<void> {
  const { table, key } = LEDGERS[ledger];
  await withConn((c) => run(c, `DELETE FROM ${table} WHERE ${key} = ?`, [k]));
}
