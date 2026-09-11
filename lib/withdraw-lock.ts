/** Withdraw lock (migration 013).

    A locked player keeps everything but the withdrawal: they sign in,
    deposit, play and claim as usual, and My Account tells them why their
    withdrawals are stopped and lets them appeal. An admin, or the agent the
    player came in through, sets and lifts it from /admin/users.

    Everything here takes a service-role client: the player side reaches it
    through /api/account/lock after checking their session, the admin side
    through /api/admin/players after checking the staff session. */

import type { SupabaseClient } from '@supabase/supabase-js';

export type AppealState = 'pending' | 'approved' | 'rejected';

export type Appeal = {
  id: number;
  message: string;
  state: AppealState;
  createdAt: string;
  reviewedAt: string | null;
  adminNote: string | null;
};

export type LockStatus = {
  locked: boolean;
  reason: string | null;
  lockedAt: string | null;
  /** the latest appeal sent since this lock was set, if any */
  appeal: Appeal | null;
};

/** What the player reads when the admin left the reason blank. */
export const DEFAULT_LOCK_REASON = 'সন্দেহজনক কার্যকলাপ সনাক্ত হয়েছে — অ্যাকাউন্টটি যাচাই করা হচ্ছে';

export const APPEAL_MAX = 500;

const UNLOCKED: LockStatus = { locked: false, reason: null, lockedAt: null, appeal: null };

/** Postgres has no such column/table yet, or PostgREST's cache is stale. */
const missing = (message: string) => /column|schema cache|relation|does not exist/i.test(message);

export async function lockStatus(db: SupabaseClient, uid: string): Promise<LockStatus> {
  const { data, error } = await db
    .from('profiles')
    .select('withdraw_locked, lock_reason, locked_at')
    .eq('id', uid)
    .maybeSingle();
  // before 013 nobody can be locked; a read that fails says nothing either
  // way, and the database checks again inside request_withdrawal
  if (error || !data) return UNLOCKED;

  const row = data as { withdraw_locked: boolean; lock_reason: string | null; locked_at: string | null };
  if (!row.withdraw_locked) return UNLOCKED;

  return {
    locked: true,
    reason: row.lock_reason || DEFAULT_LOCK_REASON,
    lockedAt: row.locked_at,
    appeal: await latestAppeal(db, uid, row.locked_at),
  };
}

/** The newest appeal written since `since` — an appeal against an earlier
    lock that was already lifted is not this lock's business. */
async function latestAppeal(db: SupabaseClient, uid: string, since: string | null): Promise<Appeal | null> {
  let query = db
    .from('account_appeals')
    .select('id, message, state, created_at, reviewed_at, admin_note')
    .eq('user_id', uid)
    .order('created_at', { ascending: false })
    .limit(1);
  if (since) query = query.gte('created_at', since);
  const { data } = await query;
  const row = (data as Record<string, unknown>[] | null)?.[0];
  return row ? toAppeal(row) : null;
}

export type AppealResult = { ok: true; status: LockStatus } | { ok: false; reason: string; message: string };

export async function sendAppeal(db: SupabaseClient, uid: string, text: string): Promise<AppealResult> {
  const message = text.trim().slice(0, APPEAL_MAX);
  if (!message) return { ok: false, reason: 'empty', message: 'আপিলে কিছু লিখুন' };

  const status = await lockStatus(db, uid);
  if (!status.locked) return { ok: false, reason: 'not-locked', message: 'আপনার অ্যাকাউন্ট লক করা নেই' };
  if (status.appeal?.state === 'pending') {
    return { ok: false, reason: 'pending', message: 'আপনার একটি আপিল ইতিমধ্যে পর্যালোচনাধীন' };
  }

  const { error } = await db.from('account_appeals').insert({ user_id: uid, message });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, reason: 'pending', message: 'আপনার একটি আপিল ইতিমধ্যে পর্যালোচনাধীন' };
    }
    return { ok: false, reason: 'db-error', message: 'আপিল পাঠানো যায়নি — আবার চেষ্টা করুন' };
  }
  return { ok: true, status: await lockStatus(db, uid) };
}

export type LockWrite = { ok: true } | { ok: false; message: string };

/** Lock or unlock. Unlocking settles any appeal still waiting as approved —
    that is what the player asked for, and it stops a stale one showing up
    the next time the account is locked. */
export async function setWithdrawLock(
  db: SupabaseClient,
  userId: string,
  locked: boolean,
  reason: string,
  by: string,
): Promise<LockWrite> {
  const now = new Date().toISOString();
  const { error } = await db
    .from('profiles')
    .update({
      withdraw_locked: locked,
      lock_reason: locked ? reason || null : null,
      locked_at: locked ? now : null,
      locked_by: locked ? by || null : null,
    })
    .eq('id', userId);
  if (error) {
    return {
      ok: false,
      message: missing(error.message)
        ? 'Lock needs migration 013 — run supabase/013_withdraw_lock.sql in Supabase first.'
        : error.message,
    };
  }

  if (!locked) {
    await db
      .from('account_appeals')
      .update({ state: 'approved', reviewed_at: now, reviewed_by: by || null })
      .eq('user_id', userId)
      .eq('state', 'pending');
  }
  return { ok: true };
}

/** Turn an appeal down. The account stays locked; the player sees the
    decision and the note, and may appeal again. */
export async function rejectAppeal(
  db: SupabaseClient,
  userId: string,
  appealId: number,
  note: string,
  by: string,
): Promise<LockWrite> {
  const { data, error } = await db
    .from('account_appeals')
    .update({ state: 'rejected', reviewed_at: new Date().toISOString(), reviewed_by: by || null, admin_note: note || null })
    .eq('id', appealId)
    .eq('user_id', userId)
    .eq('state', 'pending')
    .select('id');
  if (error) return { ok: false, message: error.message };
  if (!data?.length) return { ok: false, message: 'That appeal has already been answered.' };
  return { ok: true };
}

/** The latest appeal per player, for the admin list. Empty before 013. */
export async function latestAppeals(db: SupabaseClient, userIds: string[]): Promise<Map<string, Appeal>> {
  const out = new Map<string, Appeal>();
  if (!userIds.length) return out;
  const { data, error } = await db
    .from('account_appeals')
    .select('id, user_id, message, state, created_at, reviewed_at, admin_note')
    .in('user_id', userIds)
    .order('created_at', { ascending: false })
    .limit(500);
  if (error || !data) return out;
  for (const row of data as Record<string, unknown>[]) {
    const uid = String(row.user_id);
    if (!out.has(uid)) out.set(uid, toAppeal(row));
  }
  return out;
}

function toAppeal(row: Record<string, unknown>): Appeal {
  return {
    id: Number(row.id),
    message: String(row.message ?? ''),
    state: row.state as AppealState,
    createdAt: String(row.created_at),
    reviewedAt: (row.reviewed_at as string) || null,
    adminNote: (row.admin_note as string) || null,
  };
}
