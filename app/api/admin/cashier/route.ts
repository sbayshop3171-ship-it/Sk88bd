import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/admin-auth-next';
import { listCashier, reviewRequest, type RequestState } from '@/lib/cashier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = ['deposits', 'withdrawals'] as const;
const STATES = ['pending', 'approved', 'rejected', 'cancelled', 'all'];

export async function GET(req: Request) {
  const gate = await requireAdmin('cashier.review');
  if (!gate.ok) return gate.response;

  const url = new URL(req.url);
  const table = url.searchParams.get('table');
  const state = url.searchParams.get('state') ?? 'pending';

  if (!isTable(table)) return json({ ok: false, reason: 'invalid-table' }, 400);
  if (!STATES.includes(state)) return json({ ok: false, reason: 'invalid-state' }, 400);

  const search = url.searchParams.get('search') ?? '';
  const result = await listCashier(table, state as RequestState | 'all', 100, search);
  return result.ok
    ? json({ ok: true, rows: result.data })
    : json(result, result.reason === 'no-backend' ? 503 : 500);
}

export async function POST(req: Request) {
  const gate = await requireAdmin('cashier.review');
  if (!gate.ok) return gate.response;
  const { session } = gate;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;

  const table = record.table;
  const decision = record.decision;
  const id = Number(record.id);

  if (!isTable(table)) return json({ ok: false, reason: 'invalid-table' }, 400);
  if (decision !== 'approve' && decision !== 'reject') {
    return json({ ok: false, reason: 'invalid-decision' }, 400);
  }
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, reason: 'invalid-id' }, 400);

  // The reviewing admin is not a Supabase user, so reviewed_by stays null —
  // record who acted in the note instead.
  const typed = String(record.note ?? '').trim().slice(0, 200);
  const note = typed ? `${session.username}: ${typed}` : session.username;

  const result = await reviewRequest(table, id, decision, note);
  if (!result.ok) return json(result, result.reason === 'no-backend' ? 503 : 400);

  // The screen sends back whichever filter it is showing. An unknown value
  // used to reach the database as an enum and come back as an empty queue.
  const listState = STATES.includes(String(record.state))
    ? (record.state as RequestState | 'all')
    : 'pending';
  const rows = await listCashier(table, listState, 100, String(record.search ?? ''));
  // The decision is saved either way; an empty list here would read as
  // "nothing waiting", so say plainly that only the reload failed.
  return rows.ok
    ? json({ ok: true, rows: rows.data })
    : json({ ok: false, reason: 'db-error', message: 'Saved — but the list could not be reloaded. Refresh the page.' });
}

function isTable(value: unknown): value is (typeof TABLES)[number] {
  return TABLES.includes(value as (typeof TABLES)[number]);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
