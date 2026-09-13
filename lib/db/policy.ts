/* ============================================================
   What a signed-in player may ask of the database from the browser.

   This is the row-level security Supabase used to enforce, written out:
   a player reads their own rows in seven tables, a named set of columns
   in each, and makes four kinds of write — a deposit request, a payout
   wallet (add / remove) and their own contact details. Everything else
   is refused before any SQL is built. The owner filter is added here,
   from the session; whatever the browser sent cannot widen it.
   ============================================================ */

import type { Filter, FilterOp, QueryResult, QuerySpec } from './builder';
import { DbFail, toDbError } from './errors';
import { execSpec } from './exec';
import { addPayoutAccount, raiseDeposit, removePayoutAccount, updateOwnProfile } from './player';

const READ: Record<string, { owner: string; cols: string[] }> = {
  profiles: {
    owner: 'id',
    cols: [
      'id', 'phone', 'display_name', 'role', 'vip_level', 'referral_code', 'is_blocked', 'is_held',
      'player_no', 'real_name', 'facebook_id', 'google_id', 'whatsapp', 'email', 'contact_phone',
      'withdraw_locked', 'lock_reason', 'locked_at', 'created_at',
    ],
  },
  wallets: { owner: 'user_id', cols: ['balance', 'bonus_balance', 'turnover_need', 'turnover_done', 'updated_at'] },
  transactions: { owner: 'user_id', cols: ['id', 'kind', 'amount', 'balance_after', 'ref', 'created_at'] },
  deposits: {
    owner: 'user_id',
    cols: [
      'id', 'channel_id', 'method_id', 'amount', 'bonus_amount', 'sender_no', 'txn_id', 'state',
      'admin_note', 'reviewed_at', 'created_at',
    ],
  },
  withdrawals: {
    owner: 'user_id',
    cols: [
      'id', 'channel_id', 'amount', 'account_no', 'state', 'admin_note', 'reviewed_at', 'created_at',
      'charge_amount', 'charge_channel_id', 'charge_account_no', 'charge_trx_id', 'charge_paid_at', 'debited',
    ],
  },
  payout_accounts: { owner: 'user_id', cols: ['id', 'channel_id', 'account_no', 'holder', 'created_at'] },
  account_appeals: { owner: 'user_id', cols: ['id', 'message', 'state', 'created_at', 'reviewed_at', 'admin_note'] },
};

const OPS = new Set<FilterOp>(['eq', 'neq', 'in', 'gt', 'gte', 'lt', 'lte', 'is']);
const MAX_ROWS = 500;

const scalar = (v: unknown) => v === null || ['string', 'number', 'boolean'].includes(typeof v);

const refuse = (message: string, code = '42501'): QueryResult => ({ data: null, error: { message, code }, count: null });

function readSpec(uid: string, spec: QuerySpec): QuerySpec | QueryResult {
  const rule = READ[spec.table];
  if (!rule) return refuse(`permission denied for table ${spec.table}`);

  const asked = (spec.columns ?? '*').split(',').map((c) => c.trim()).filter(Boolean);
  const cols = asked.length === 0 || asked.includes('*') ? rule.cols : asked;
  for (const c of cols) if (!rule.cols.includes(c)) return refuse(`column ${c} does not exist`, '42703');

  const filters: Filter[] = [];
  for (const f of spec.filters) {
    if (!rule.cols.includes(f.col) && f.col !== rule.owner) return refuse(`column ${f.col} does not exist`, '42703');
    if (!OPS.has(f.op)) return refuse('filter not allowed', '42501');
    const ok = f.op === 'in'
      ? Array.isArray(f.value) && f.value.length <= 200 && f.value.every(scalar)
      : scalar(f.value);
    if (!ok) return refuse('bad filter value', '22023');
    filters.push({ col: f.col, op: f.op, value: f.value });
  }
  filters.push({ col: rule.owner, op: 'eq', value: uid });

  for (const o of spec.order) if (!rule.cols.includes(o.col)) return refuse(`column ${o.col} does not exist`, '42703');

  return {
    table: spec.table,
    action: 'select',
    columns: cols.join(', '),
    count: Boolean(spec.count),
    head: Boolean(spec.head),
    filters,
    or: [],
    order: spec.order.map((o) => ({ col: o.col, asc: Boolean(o.asc) })),
    limit: Math.min(MAX_ROWS, Math.max(1, Math.floor(Number(spec.limit ?? MAX_ROWS)) || MAX_ROWS)),
    payload: null,
  };
}

/** Parse what the browser sent into a spec, or say why not. */
export function parseSpec(raw: unknown): QuerySpec | null {
  if (!raw || typeof raw !== 'object') return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.table !== 'string' || !['select', 'insert', 'update', 'delete'].includes(String(r.action))) return null;
  const filters = Array.isArray(r.filters) ? r.filters : [];
  const order = Array.isArray(r.order) ? r.order : [];
  if (filters.length > 20 || order.length > 5) return null;
  if (Array.isArray(r.or) && r.or.length) return null; // server-side only
  return {
    table: r.table,
    action: r.action as QuerySpec['action'],
    columns: typeof r.columns === 'string' ? r.columns.slice(0, 1000) : null,
    count: r.count === true,
    head: r.head === true,
    filters: filters.map((f) => {
      const x = (f ?? {}) as Record<string, unknown>;
      return { col: String(x.col ?? ''), op: String(x.op ?? '') as FilterOp, value: x.value ?? null };
    }),
    or: [],
    order: order.map((o) => {
      const x = (o ?? {}) as Record<string, unknown>;
      return { col: String(x.col ?? ''), asc: x.asc !== false };
    }),
    limit: typeof r.limit === 'number' ? r.limit : null,
    payload: r.payload && typeof r.payload === 'object' && !Array.isArray(r.payload)
      ? (r.payload as Record<string, unknown>)
      : null,
  };
}

const idFilter = (spec: QuerySpec) => {
  const f = spec.filters.find((x) => x.col === 'id' && x.op === 'eq');
  const id = Number(f?.value);
  return Number.isInteger(id) && id > 0 ? id : null;
};

export async function runPlayerQuery(uid: string, spec: QuerySpec): Promise<QueryResult> {
  try {
    if (spec.action === 'select') {
      const safe = readSpec(uid, spec);
      return 'action' in safe ? execSpec(safe) : safe;
    }
    const payload = spec.payload ?? {};
    if (spec.action === 'insert' && spec.table === 'deposits') {
      await raiseDeposit(uid, payload);
      return { data: null, error: null, count: null };
    }
    if (spec.action === 'insert' && spec.table === 'payout_accounts') {
      await addPayoutAccount(uid, payload);
      return { data: null, error: null, count: null };
    }
    if (spec.action === 'delete' && spec.table === 'payout_accounts') {
      const id = idFilter(spec);
      if (!id) return refuse('delete needs an id', '22023');
      await removePayoutAccount(uid, id);
      return { data: null, error: null, count: null };
    }
    if (spec.action === 'update' && spec.table === 'profiles') {
      // only ever the player's own row, whatever the filter said
      await updateOwnProfile(uid, payload);
      return { data: null, error: null, count: null };
    }
    return refuse(`permission denied for table ${spec.table}`);
  } catch (e) {
    if (e instanceof DbFail) return { data: null, error: { message: e.message, code: e.code, hint: e.hint }, count: null };
    return { data: null, error: toDbError(e), count: null };
  }
}
