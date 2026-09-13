/* ============================================================
   The writes a player makes from the browser.

   Under Supabase these were row-level-security policies; here they are
   functions, and /api/data/query reaches nothing else. Each one names
   the player from the session, never from what the browser sent.
   ============================================================ */

import { getCashierConfig } from '../cashier-config-store';
import { DbFail } from './errors';
import { blockOf, checkTxnShape, claimTxn, normTxn } from './money';
import { one, run, tx, withConn, write } from './pool';

const CHANNEL = /^[a-z0-9_-]{2,40}$/;

/** A deposit request: pending, and nothing else the player can set. */
export async function raiseDeposit(uid: string, input: Record<string, unknown>): Promise<number> {
  const channel = String(input.channel_id ?? '').trim().toLowerCase();
  if (!CHANNEL.test(channel)) throw new DbFail('unknown channel', '22023');
  const amount = Number(input.amount);
  if (!Number.isInteger(amount) || amount <= 0 || amount > 10_000_000_00) throw new DbFail('invalid amount', '22023');
  const methodId = input.method_id == null ? null : String(input.method_id).trim().slice(0, 64) || null;
  const sender = input.sender_no == null ? null : String(input.sender_no).replace(/[^0-9+]/g, '').slice(0, 20) || null;
  const txn = normTxn(input.txn_id);

  // the method has to be one on offer, for the channel the money came by,
  // and the amount inside its limits — the screen checks, and so do we
  if (methodId) {
    const method = (await getCashierConfig()).deposit.methods.find((m) => m.id === methodId);
    if (!method || !method.active || method.channelId !== channel) throw new DbFail('method unavailable', '22023');
    const taka = amount / 100;
    if (taka < method.min || taka > method.max) throw new DbFail('amount outside the limits', '22023');
  }

  return tx(async (c) => {
    // one request at a time per player, so the pending count below holds
    await one(c, 'SELECT id FROM wallets WHERE user_id = ? FOR UPDATE', [uid]);
    if (await blockOf(c, uid) === 'banned') throw new DbFail('account banned', '42501');

    if (txn) {
      checkTxnShape(txn, channel);
      await claimTxn(c, txn, 'deposit', null);
    }

    const waiting = await one(c, "SELECT COUNT(*) AS n FROM deposits WHERE user_id = ? AND state = 'pending'", [uid]);
    if (Number(waiting?.n ?? 0) >= 3) throw new DbFail('too many pending', '23514');

    const res = await write(c,
      'INSERT INTO deposits (user_id, channel_id, method_id, amount, sender_no, txn_id) VALUES (?, ?, ?, ?, ?, ?)',
      [uid, channel, methodId, amount, sender, txn || null]);
    if (txn) await run(c, 'UPDATE txn_claims SET ref_id = ? WHERE norm = ?', [res.insertId, txn]);
    return Number(res.insertId);
  });
}

const MAX_PAYOUT_ACCOUNTS = 20;

export async function addPayoutAccount(uid: string, input: Record<string, unknown>) {
  const channel = String(input.channel_id ?? '').trim().toLowerCase();
  if (!CHANNEL.test(channel)) throw new DbFail('unknown channel', '22023');
  const accountNo = String(input.account_no ?? '').replace(/[^0-9A-Za-z]/g, '').slice(0, 40);
  if (accountNo.length < 4) throw new DbFail('invalid account number', '22023');
  const holder = String(input.holder ?? '').trim().slice(0, 60);

  return tx(async (c) => {
    const have = await one(c, 'SELECT COUNT(*) AS n FROM payout_accounts WHERE user_id = ?', [uid]);
    if (Number(have?.n ?? 0) >= MAX_PAYOUT_ACCOUNTS) throw new DbFail('too many wallets', '23514');
    const res = await write(c,
      'INSERT INTO payout_accounts (user_id, channel_id, account_no, holder) VALUES (?, ?, ?, ?)',
      [uid, channel, accountNo, holder]);
    return Number(res.insertId);
  });
}

export async function removePayoutAccount(uid: string, id: number) {
  await withConn((c) => run(c, 'DELETE FROM payout_accounts WHERE id = ? AND user_id = ?', [id, uid]));
}

/** What My Account may change: the contact details, and the real name once. */
const PROFILE_FIELDS: Record<string, number> = {
  display_name: 80,
  real_name: 80,
  facebook_id: 120,
  google_id: 120,
  whatsapp: 30,
  email: 120,
  contact_phone: 30,
};

export async function updateOwnProfile(uid: string, input: Record<string, unknown>) {
  const patch: [string, string | null][] = [];
  for (const [key, value] of Object.entries(input)) {
    const max = PROFILE_FIELDS[key];
    if (!max) throw new DbFail(`column ${key} cannot be changed`, '42501');
    const text = value == null ? '' : String(value).trim().slice(0, max);
    patch.push([key, text || null]);
  }
  if (!patch.length) return;

  await tx(async (c) => {
    const current = await one(c, 'SELECT real_name FROM profiles WHERE id = ? FOR UPDATE', [uid]);
    if (!current) throw new DbFail('profile not found', 'P0002');
    const locked = String(current.real_name ?? '').trim();
    const name = patch.find(([k]) => k === 'real_name');
    // the name a withdrawal is checked against is written once (011)
    if (locked && name && name[1] !== locked) throw new DbFail('real name cannot be changed', '22023');
    await run(c,
      `UPDATE profiles SET ${patch.map(([k]) => `\`${k}\` = ?`).join(', ')} WHERE id = ?`,
      [...patch.map(([, v]) => v), uid]);
  });
}
