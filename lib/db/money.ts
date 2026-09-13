/* ============================================================
   Every movement of money, and the checks that go with it.

   These were Postgres functions (supabase/004 … 018); they are the same
   rules, in the same words, run inside one MySQL transaction each:

     • a balance is changed only by walletApply, which locks the wallet
       row, refuses to go below zero, and writes the ledger line in the
       same transaction — no ledger line, no change
     • a stopped account (banned / on hold) cannot stake, claim or
       withdraw; deposits, admin adjustments, wins and refunds still land
     • a withdrawal takes its money when the charge TrxID arrives or when
       it is approved, whichever is first, and only once (`debited`)
     • bonus turnover and the withdraw lock are checked again at the
       moment the money leaves, not only when it was asked for
     • a TrxID pays once anywhere: txn_claims holds every deposit and
       charge TrxID as a primary key

   The error messages are the old ones on purpose — routes and screens
   match on "turnover left", "txn used", "account locked" and the rest.
   ============================================================ */

import bcrypt from 'bcryptjs';
import { clearFails, lockLeft, recordFail } from './attempts';
import { DbFail } from './errors';
import { one, run, tx, withConn, write, type Conn } from './pool';

export type TxnKind = 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'rebate' | 'adjust';
const KINDS = new Set<TxnKind>(['deposit', 'withdraw', 'bet', 'win', 'bonus', 'rebate', 'adjust']);

export type AccountBlock = 'banned' | 'held';

/* ------------------------------------------------------------ basics ----- */

export async function blockOf(c: Conn, uid: string): Promise<AccountBlock | null> {
  const p = await one(c, 'SELECT is_blocked, is_held FROM profiles WHERE id = ?', [uid]);
  if (!p) return null;
  if (p.is_blocked) return 'banned';
  if (p.is_held) return 'held';
  return null;
}

async function isLocked(c: Conn, uid: string) {
  const p = await one(c, 'SELECT withdraw_locked FROM profiles WHERE id = ?', [uid]);
  return Boolean(p?.withdraw_locked);
}

/** Turnover still to bet, in paisa; 0 when the bonus is played through. */
async function turnoverLeft(c: Conn, uid: string) {
  const w = await one(c, 'SELECT turnover_need, turnover_done FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
  return Math.max(0, Number(w?.turnover_need ?? 0) - Number(w?.turnover_done ?? 0));
}

/** The money primitive. Returns the new balance. */
export async function walletApply(c: Conn, uid: string, kind: TxnKind, amount: number, ref: string | null) {
  if (!KINDS.has(kind)) throw new DbFail(`invalid transaction kind ${String(kind)}`, '22P02');
  const amt = Math.trunc(Number(amount));
  if (!Number.isFinite(amt)) throw new DbFail('invalid amount', '22P02');

  // a stopped account keeps what settles it, and loses what uses it
  if ((kind === 'bet' && amt < 0) || kind === 'bonus' || kind === 'rebate' || (kind === 'withdraw' && amt < 0)) {
    const blk = await blockOf(c, uid);
    if (blk) throw new DbFail(`account ${blk}`, '42501');
  }

  const w = await one(c, 'SELECT balance FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
  if (!w) throw new DbFail(`no wallet for ${uid}`);
  const next = Number(w.balance) + amt;
  if (next < 0) throw new DbFail('new row for relation "wallets" violates check constraint: insufficient balance', '23514');

  // every stake counts toward bonus turnover; a refunded stake takes it back
  await run(c,
    `UPDATE wallets SET balance = ?,
       turnover_done = CASE WHEN ? = 'bet' THEN GREATEST(0, turnover_done - ?) ELSE turnover_done END
     WHERE user_id = ?`,
    [next, kind, amt, uid]);
  await run(c,
    'INSERT INTO transactions (user_id, kind, amount, balance_after, ref) VALUES (?, ?, ?, ?, ?)',
    [uid, kind, amt, next, ref]);
  return next;
}

/** A bonus, and the turnover it brings. Stakes placed before it do not count:
    when the last requirement was already met, the count starts again. */
export async function creditBonus(c: Conn, uid: string, kind: TxnKind, amount: number, ref: string, turnover: number) {
  const balance = await walletApply(c, uid, kind, amount, ref);
  const add = Math.max(0, Math.trunc(Number(turnover) || 0));
  if (add > 0) {
    const w = await one(c, 'SELECT turnover_need, turnover_done FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
    const need = Number(w?.turnover_need ?? 0);
    const done = Number(w?.turnover_done ?? 0);
    const met = done >= need;
    await run(c, 'UPDATE wallets SET turnover_need = ?, turnover_done = ? WHERE user_id = ?',
      [met ? add : need + add, met ? 0 : done, uid]);
  }
  return balance;
}

export async function adjustBalance(uid: string, amount: number, note: string | null) {
  if (!Math.trunc(Number(amount))) throw new DbFail('amount must not be zero', '22023');
  return tx((c) => walletApply(c, uid, 'adjust', amount, note || 'admin adjust'));
}

/* ------------------------------------------------------------- TrxIDs ---- */

export const normTxn = (raw: unknown) => String(raw ?? '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();

/** A bKash TrxID has 10 characters; any other is 6–20, and never one
    character over and over. */
export function checkTxnShape(norm: string, channel: string) {
  if (channel.toLowerCase() === 'bkash' && norm.length !== 10) {
    throw new DbFail('txn format', '23514', 'A bKash TrxID has 10 characters');
  }
  if (norm.length < 6 || norm.length > 20 || /^(.)\1+$/.test(norm)) throw new DbFail('txn format', '23514');
}

/** Claim a TrxID for this payment, inside the caller's transaction. */
export async function claimTxn(c: Conn, norm: string, source: 'deposit' | 'charge', refId: number | null) {
  try {
    await run(c, 'INSERT INTO txn_claims (norm, source, ref_id) VALUES (?, ?, ?)', [norm, source, refId]);
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') throw new DbFail('txn used', '23505');
    throw e;
  }
}

/* ----------------------------------------------------------- deposits ---- */

export async function approveDeposit(id: number, note: string | null) {
  return tx(async (c) => {
    const d = await one(c, 'SELECT * FROM deposits WHERE id = ? FOR UPDATE', [id]);
    if (!d) throw new DbFail(`deposit ${id} not found`, 'P0002');
    if (d.state !== 'pending') throw new DbFail(`deposit ${id} already ${String(d.state)}`, '22023');
    await run(c, "UPDATE deposits SET state = 'approved', admin_note = ?, reviewed_at = NOW(3) WHERE id = ?", [note, id]);
    const balance = await walletApply(c, String(d.user_id), 'deposit', Number(d.amount), `deposit:${id}`);
    await maybeUnlockAfterDeposit(c, String(d.user_id));
    return balance;
  });
}

/** A locked player the admin asked to deposit ৳X to unlock: once their
    approved deposits since the lock reach that target, the withdraw lock
    lifts itself and any waiting appeal is granted. Runs inside the approving
    transaction, and the just-approved deposit counts toward the target. */
async function maybeUnlockAfterDeposit(c: Conn, uid: string) {
  const p = await one(c,
    'SELECT withdraw_locked, verification_deposit_amount, locked_at FROM profiles WHERE id = ? FOR UPDATE', [uid]);
  const target = Number(p?.verification_deposit_amount ?? 0);
  if (!p || !p.withdraw_locked || target <= 0) return;

  const since = p.locked_at ? String(p.locked_at) : null;
  const sum = await one(c,
    `SELECT COALESCE(SUM(amount), 0) AS total FROM deposits
       WHERE user_id = ? AND state = 'approved'${since ? ' AND created_at >= ?' : ''}`,
    since ? [uid, since] : [uid]);
  if (Number(sum?.total ?? 0) < target) return;

  await run(c,
    `UPDATE profiles SET withdraw_locked = 0, lock_reason = NULL, locked_at = NULL, locked_by = NULL,
       verification_deposit_amount = 0 WHERE id = ? AND withdraw_locked = 1`, [uid]);
  await run(c,
    "UPDATE account_appeals SET state = 'approved', reviewed_at = NOW(3), reviewed_by = 'auto-verify' WHERE user_id = ? AND state = 'pending'",
    [uid]);
}

export async function rejectDeposit(id: number, note: string | null) {
  return tx(async (c) => {
    const d = await one(c, 'SELECT state FROM deposits WHERE id = ? FOR UPDATE', [id]);
    if (!d) throw new DbFail(`deposit ${id} not found`, 'P0002');
    if (d.state !== 'pending') throw new DbFail(`deposit ${id} already ${String(d.state)}`, '22023');
    // nothing was credited, so there is nothing to give back
    await run(c, "UPDATE deposits SET state = 'rejected', admin_note = ?, reviewed_at = NOW(3) WHERE id = ?", [note, id]);
    return null;
  });
}

/* -------------------------------------------------------- withdrawals ---- */

async function passwordHashFor(c: Conn, uid: string): Promise<string | null> {
  // the fund password once there is one, the login password until then
  const s = await one(c, 'SELECT txn_password FROM security_settings WHERE user_id = ?', [uid]);
  const txn = String(s?.txn_password ?? '').trim();
  if (txn) return txn;
  const u = await one(c, 'SELECT password_hash FROM users WHERE id = ?', [uid]);
  const login = String(u?.password_hash ?? '').trim();
  return login || null;
}

/** Raise a withdrawal. Checks everything and takes nothing (014): the money
    leaves with the charge TrxID or at approval. */
export async function requestWithdrawal(uid: string, channel: string, amount: number, accountNo: string, password: string) {
  return tx(async (c) => {
    const blk = await blockOf(c, uid);
    if (blk) throw new DbFail(`account ${blk}`, '42501');
    if (await isLocked(c, uid)) throw new DbFail('account locked', '42501');
    const amt = Math.trunc(Number(amount));
    if (!amt || amt <= 0) throw new DbFail('amount must be positive', '22023');
    const account = String(accountNo ?? '').trim();
    if (!account) throw new DbFail('account number required', '22023');

    const w = await one(c, 'SELECT balance, turnover_need, turnover_done FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
    const left = Number(w?.turnover_need ?? 0) - Number(w?.turnover_done ?? 0);
    if (left > 0) throw new DbFail(`turnover left ${left}`, '22023');

    const hash = await passwordHashFor(c, uid);
    if (!password || !hash || !(await bcrypt.compare(password, hash))) throw new DbFail('wrong password', '28P01');

    const waiting = await one(c,
      "SELECT COALESCE(SUM(amount), 0) AS n FROM withdrawals WHERE user_id = ? AND state = 'pending' AND debited = 0", [uid]);
    if (Number(w?.balance ?? 0) < Number(waiting?.n ?? 0) + amt) {
      throw new DbFail('insufficient balance (check constraint)', '23514');
    }

    const res = await write(c,
      'INSERT INTO withdrawals (user_id, channel_id, amount, account_no, debited) VALUES (?, ?, ?, ?, 0)',
      [uid, channel, amt, account]);
    return Number(res.insertId);
  });
}

/** The money leaves here, unless the charge TrxID already took it. */
export async function approveWithdrawal(id: number, note: string | null) {
  return tx(async (c) => {
    const w = await one(c, 'SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
    if (!w) throw new DbFail(`withdrawal ${id} not found`, 'P0002');
    if (w.state !== 'pending') throw new DbFail(`withdrawal ${id} already ${String(w.state)}`, '22023');
    const uid = String(w.user_id);
    if (!w.debited) {
      // what was true when they asked has to be true when the money goes
      if (await isLocked(c, uid)) throw new DbFail('account locked', '42501');
      const left = await turnoverLeft(c, uid);
      if (left > 0) throw new DbFail(`turnover left ${left}`, '22023');
      await walletApply(c, uid, 'withdraw', -Number(w.amount), `withdraw:${id}`);
    }
    await run(c,
      "UPDATE withdrawals SET state = 'approved', admin_note = ?, reviewed_at = NOW(3), debited = 1 WHERE id = ?",
      [note, id]);
    return null;
  });
}

/** Turn a withdrawal down; give back only what was taken. */
export async function rejectWithdrawal(id: number, note: string | null) {
  return tx(async (c) => {
    const w = await one(c, 'SELECT * FROM withdrawals WHERE id = ? FOR UPDATE', [id]);
    if (!w) throw new DbFail(`withdrawal ${id} not found`, 'P0002');
    if (w.state !== 'pending') throw new DbFail(`withdrawal ${id} already ${String(w.state)}`, '22023');
    await run(c, "UPDATE withdrawals SET state = 'rejected', admin_note = ?, reviewed_at = NOW(3) WHERE id = ?", [note, id]);
    if (w.debited) return walletApply(c, String(w.user_id), 'withdraw', Number(w.amount), `withdraw:refund:${id}`);
    const bal = await one(c, 'SELECT balance FROM wallets WHERE user_id = ?', [String(w.user_id)]);
    return Number(bal?.balance ?? 0);
  });
}

/** The charge screen: freeze the quote, store the proof, and — with a TrxID —
    take the withdrawal's money, once. Returns whether a TrxID was taken. */
export async function payWithdrawalCharge(
  id: number, uid: string, charge: number, channel: string | null, trxRaw: string | null,
) {
  return tx(async (c) => {
    const w = await one(c, 'SELECT * FROM withdrawals WHERE id = ? AND user_id = ? FOR UPDATE', [id, uid]);
    if (!w) throw new DbFail(`withdrawal ${id} not found`, 'P0002');
    if (w.state !== 'pending') throw new DbFail(`withdrawal ${id} already ${String(w.state)}`, '22023');

    const trx = normTxn(trxRaw) || null;
    if (trx) {
      const had = normTxn(w.charge_trx_id) || null;
      // once given, a charge TrxID stays; sending the same one again is fine
      if (had && had !== trx) throw new DbFail('txn locked', '22023');
      checkTxnShape(trx, String(channel || w.charge_channel_id || ''));
      if (!had) await claimTxn(c, trx, 'charge', id);
    }

    if (trx && !w.debited) {
      if (await isLocked(c, uid)) throw new DbFail('account locked', '42501');
      const left = await turnoverLeft(c, uid);
      if (left > 0) throw new DbFail(`turnover left ${left}`, '22023');
      await walletApply(c, uid, 'withdraw', -Number(w.amount), `withdraw:${id}`);
    }

    await run(c,
      `UPDATE withdrawals SET
         charge_amount = CASE WHEN charge_amount > 0 THEN charge_amount ELSE ? END,
         charge_channel_id = COALESCE(NULLIF(?, ''), charge_channel_id),
         charge_trx_id = COALESCE(?, charge_trx_id),
         charge_paid_at = CASE WHEN ? IS NOT NULL AND charge_paid_at IS NULL THEN NOW(3) ELSE charge_paid_at END,
         debited = CASE WHEN debited = 1 OR ? IS NOT NULL THEN 1 ELSE 0 END
       WHERE id = ?`,
      [Math.max(0, Math.trunc(Number(charge) || 0)), channel ?? '', trx, trx, trx, id]);
    return trx !== null;
  });
}

/* ------------------------------------------------- fund password ---- */

const PASSWORD_LOCK_MS = 15 * 60_000;
const PASSWORD_TRIES = 5;

export const passwordLockLeft = (uid: string) => lockLeft('password', [uid]);

export async function passwordAttempt(uid: string, ok: boolean) {
  if (ok) {
    await clearFails('password', uid);
    return 0;
  }
  return recordFail('password', uid, PASSWORD_TRIES, PASSWORD_LOCK_MS);
}

export async function hasTransactionPassword(uid: string) {
  const s = await withConn((c) => one(c, 'SELECT txn_password FROM security_settings WHERE user_id = ?', [uid]));
  return Boolean(String(s?.txn_password ?? '').trim());
}

/** Set or change the fund password. The first one is proven with the login
    password (018); a change needs the current fund password. Wrong guesses
    count toward the 15-minute lock. */
export async function setTransactionPassword(uid: string, next: string, old: string | null): Promise<'ok' | 'wrong' | 'locked'> {
  if (!next || next.length < 6 || next.length > 64) throw new DbFail('transaction password too short', '22023');
  if (await passwordLockLeft(uid) > 0) return 'locked';

  const hashes = await withConn(async (c) => {
    const s = await one(c, 'SELECT txn_password FROM security_settings WHERE user_id = ?', [uid]);
    const u = await one(c, 'SELECT password_hash FROM users WHERE id = ?', [uid]);
    return { txn: String(s?.txn_password ?? '').trim(), login: String(u?.password_hash ?? '').trim() };
  });
  const against = hashes.txn || hashes.login;
  const ok = Boolean(old && against && (await bcrypt.compare(old, against)));
  if (!ok) {
    const left = await passwordAttempt(uid, false);
    return left > 0 ? 'locked' : 'wrong';
  }
  await passwordAttempt(uid, true);

  const hash = await bcrypt.hash(next, 10);
  await withConn((c) => run(c,
    `INSERT INTO security_settings (user_id, txn_password, updated_at) VALUES (?, ?, NOW(3))
     ON DUPLICATE KEY UPDATE txn_password = VALUES(txn_password), updated_at = NOW(3)`, [uid, hash]));
  return 'ok';
}

/** False rather than an error when none is set, so a screen can fall back
    to the login password without asking twice. */
export async function verifyTransactionPassword(uid: string, password: string) {
  if (!password || await passwordLockLeft(uid) > 0) return false;
  const s = await withConn((c) => one(c, 'SELECT txn_password FROM security_settings WHERE user_id = ?', [uid]));
  const hash = String(s?.txn_password ?? '').trim();
  if (!hash) return false;
  const ok = await bcrypt.compare(password, hash);
  await passwordAttempt(uid, ok);
  return ok;
}

/* -------------------------------------------------------------- bonus ---- */

/** A promo code's limit, counted and paid under one lock (018). */
export async function claimPromo(uid: string, ref: string, amount: number, turnover: number, limit: number) {
  return tx(async (c) => {
    const lock = `promo:${ref}`;
    await run(c, 'INSERT INTO counters (name, v) VALUES (?, 0) ON DUPLICATE KEY UPDATE v = v', [lock]);
    await run(c, 'SELECT v FROM counters WHERE name = ? FOR UPDATE', [lock]);
    if (limit > 0) {
      const used = await one(c, 'SELECT COUNT(*) AS n FROM transactions WHERE ref = ?', [ref]);
      if (Number(used?.n ?? 0) >= limit) throw new DbFail('code used up', '23514');
    }
    return creditBonus(c, uid, 'bonus', amount, ref, turnover);
  });
}

/** Lifetime deposits, and one window's stakes and wins (018). */
export async function bonusFacts(uid: string, from: string, to: string) {
  const r = await withConn((c) => one(c,
    `SELECT
       COALESCE(SUM(CASE WHEN kind = 'deposit' THEN amount END), 0) AS deposited,
       COALESCE(-SUM(CASE WHEN kind = 'bet' AND created_at >= ? AND created_at < ? THEN amount END), 0) AS staked,
       COALESCE(SUM(CASE WHEN kind = 'win' AND created_at >= ? AND created_at < ? THEN amount END), 0) AS won
     FROM transactions WHERE user_id = ?`,
    [from, to, from, to, uid]));
  return { deposited: Number(r?.deposited ?? 0), staked: Number(r?.staked ?? 0), won: Number(r?.won ?? 0) };
}
