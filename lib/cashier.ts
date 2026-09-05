/** Cashier and player queries for the admin panel.

    Everything here runs through adminClient() — the service-role key, which
    bypasses RLS. That is deliberate: the admin panel authenticates against its
    own store (lib/admin-auth.ts), not Supabase Auth, so `auth.uid()` is null
    here and the is_admin() policies would never pass. Callers must check the
    admin session before reaching any of this.

    Money moves only through the SQL functions in supabase/004_cashier_actions
    so an approval and its ledger entry land together. */

import { adminClient } from './supabase';

export type RequestState = 'pending' | 'approved' | 'rejected' | 'cancelled';

export type CashierRow = {
  id: number;
  userId: string;
  phone: string;
  displayName: string | null;
  channelId: string;
  /** paisa */
  amount: number;
  state: RequestState;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  /** deposits: what the player says they sent from */
  senderNo?: string | null;
  txnId?: string | null;
  /** withdrawals: where the money should go */
  accountNo?: string | null;
};

export type PlayerRow = {
  id: string;
  phone: string;
  displayName: string | null;
  role: string;
  vipLevel: number;
  referralCode: string;
  isBlocked: boolean;
  createdAt: string;
  /** paisa */
  balance: number;
  bonusBalance: number;
  turnoverNeed: number;
  turnoverDone: number;
};

export type CashierStats = {
  pendingDeposits: number;
  pendingWithdrawals: number;
  todayDeposited: number;
  todayWithdrawn: number;
  totalPlayers: number;
};

export type CashierResult<T> =
  | { ok: true; data: T }
  | { ok: false; reason: 'no-backend' | 'db-error'; message?: string };

const NO_BACKEND = { ok: false, reason: 'no-backend' } as const;

/** Rows joined to the player's profile, newest first. */
export async function listCashier(
  table: 'deposits' | 'withdrawals',
  state: RequestState | 'all' = 'pending',
  limit = 100,
): Promise<CashierResult<CashierRow[]>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  // The columns differ by table, so the select string cannot be a literal —
  // .returns<>() gives the rows a shape the mapper can read.
  const extra = table === 'deposits' ? 'sender_no, txn_id' : 'account_no';
  let query = db
    .from(table)
    .select(
      `id, user_id, channel_id, amount, state, admin_note, created_at, reviewed_at, ${extra}, `
      + 'profiles!user_id (phone, display_name)',
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  if (state !== 'all') query = query.eq('state', state);

  const { data, error } = await query.returns<Record<string, unknown>[]>();
  if (error) return { ok: false, reason: 'db-error', message: error.message };

  return { ok: true, data: (data ?? []).map(toCashierRow) };
}

export async function listPlayers(search = '', limit = 100): Promise<CashierResult<PlayerRow[]>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  let query = db
    .from('profiles')
    .select(
      `id, phone, display_name, role, vip_level, referral_code, is_blocked, created_at,
       wallets (balance, bonus_balance, turnover_need, turnover_done)`,
    )
    .order('created_at', { ascending: false })
    .limit(limit);

  const term = search.trim();
  if (term) query = query.or(`phone.ilike.%${term}%,display_name.ilike.%${term}%`);

  const { data, error } = await query.returns<Record<string, unknown>[]>();
  if (error) return { ok: false, reason: 'db-error', message: error.message };

  return { ok: true, data: (data ?? []).map(toPlayerRow) };
}

/** Headline figures for the dashboard. */
export async function cashierStats(): Promise<CashierResult<CashierStats>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const since = dayStart.toISOString();

  const [pendD, pendW, todayD, todayW, players] = await Promise.all([
    db.from('deposits').select('id', { count: 'exact', head: true }).eq('state', 'pending'),
    db.from('withdrawals').select('id', { count: 'exact', head: true }).eq('state', 'pending'),
    db.from('deposits').select('amount').eq('state', 'approved').gte('reviewed_at', since),
    db.from('withdrawals').select('amount').eq('state', 'approved').gte('reviewed_at', since),
    db.from('profiles').select('id', { count: 'exact', head: true }),
  ]);

  const failed = [pendD, pendW, todayD, todayW, players].find((r) => r.error);
  if (failed?.error) return { ok: false, reason: 'db-error', message: failed.error.message };

  const sum = (rows: { amount: number }[] | null) =>
    (rows ?? []).reduce((total, r) => total + Number(r.amount ?? 0), 0);

  return {
    ok: true,
    data: {
      pendingDeposits: pendD.count ?? 0,
      pendingWithdrawals: pendW.count ?? 0,
      todayDeposited: sum(todayD.data as { amount: number }[] | null),
      todayWithdrawn: sum(todayW.data as { amount: number }[] | null),
      totalPlayers: players.count ?? 0,
    },
  };
}

/**
 * Approve or reject one request. The SQL function refuses anything that is no
 * longer pending, so a double-clicked Approve pays out once.
 */
export async function reviewRequest(
  table: 'deposits' | 'withdrawals',
  id: number,
  action: 'approve' | 'reject',
  note: string,
): Promise<CashierResult<null>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  const fn = `${action}_${table === 'deposits' ? 'deposit' : 'withdrawal'}`;
  const { error } = await db.rpc(fn, { p_id: id, p_note: note || null });
  if (error) return { ok: false, reason: 'db-error', message: error.message };

  return { ok: true, data: null };
}

/** Hand-adjust a balance. `amount` is paisa and may be negative. */
export async function adjustBalance(
  userId: string,
  amount: number,
  note: string,
): Promise<CashierResult<number>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  const { data, error } = await db.rpc('adjust_balance', {
    p_user: userId,
    p_amount: amount,
    p_note: note || 'admin adjust',
  });
  if (error) return { ok: false, reason: 'db-error', message: error.message };

  return { ok: true, data: Number(data ?? 0) };
}

export async function setBlocked(userId: string, blocked: boolean): Promise<CashierResult<null>> {
  const db = adminClient();
  if (!db) return NO_BACKEND;

  const { error } = await db.from('profiles').update({ is_blocked: blocked }).eq('id', userId);
  if (error) return { ok: false, reason: 'db-error', message: error.message };

  return { ok: true, data: null };
}

type RawProfile = { phone: string; display_name: string | null };
type RawWallet = {
  balance: number; bonus_balance: number; turnover_need: number; turnover_done: number;
};

/** PostgREST returns an embedded row as an object, or an array on some shapes. */
const one = <T>(value: T | T[] | null): T | null =>
  (Array.isArray(value) ? value[0] : value) ?? null;

function toCashierRow(row: Record<string, unknown>): CashierRow {
  const profile = one(row.profiles as RawProfile | RawProfile[] | null);
  return {
    id: Number(row.id),
    userId: String(row.user_id),
    phone: profile?.phone ?? '—',
    displayName: profile?.display_name ?? null,
    channelId: String(row.channel_id),
    amount: Number(row.amount ?? 0),
    state: row.state as RequestState,
    adminNote: (row.admin_note as string) ?? null,
    createdAt: String(row.created_at),
    reviewedAt: (row.reviewed_at as string) ?? null,
    senderNo: (row.sender_no as string) ?? null,
    txnId: (row.txn_id as string) ?? null,
    accountNo: (row.account_no as string) ?? null,
  };
}

function toPlayerRow(row: Record<string, unknown>): PlayerRow {
  const wallet = one(row.wallets as RawWallet | RawWallet[] | null);
  return {
    id: String(row.id),
    phone: String(row.phone),
    displayName: (row.display_name as string) ?? null,
    role: String(row.role ?? 'player'),
    vipLevel: Number(row.vip_level ?? 0),
    referralCode: String(row.referral_code ?? ''),
    isBlocked: Boolean(row.is_blocked),
    createdAt: String(row.created_at),
    balance: Number(wallet?.balance ?? 0),
    bonusBalance: Number(wallet?.bonus_balance ?? 0),
    turnoverNeed: Number(wallet?.turnover_need ?? 0),
    turnoverDone: Number(wallet?.turnover_done ?? 0),
  };
}
