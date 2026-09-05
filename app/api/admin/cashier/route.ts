import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';
import { listCashier, reviewRequest, type RequestState } from '@/lib/cashier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TABLES = ['deposits', 'withdrawals'] as const;
const STATES = ['pending', 'approved', 'rejected', 'cancelled', 'all'];

export async function GET(req: Request) {
  const session = await adminSession();
  if (!session) return json({ ok: false, reason: 'unauthorized' }, 401);

  const url = new URL(req.url);
  const table = url.searchParams.get('table');
  const state = url.searchParams.get('state') ?? 'pending';

  if (!isTable(table)) return json({ ok: false, reason: 'invalid-table' }, 400);
  if (!STATES.includes(state)) return json({ ok: false, reason: 'invalid-state' }, 400);

  const result = await listCashier(table, state as RequestState | 'all');
  return result.ok
    ? json({ ok: true, rows: result.data })
    : json(result, result.reason === 'no-backend' ? 503 : 500);
}

export async function POST(req: Request) {
  const session = await adminSession();
  if (!session) return json({ ok: false, reason: 'unauthorized' }, 401);

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

  const rows = await listCashier(table, (record.state as RequestState) ?? 'pending');
  return json({ ok: true, rows: rows.ok ? rows.data : [] });
}

function isTable(value: unknown): value is (typeof TABLES)[number] {
  return TABLES.includes(value as (typeof TABLES)[number]);
}

async function adminSession() {
  const cookieStore = await cookies();
  return getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
