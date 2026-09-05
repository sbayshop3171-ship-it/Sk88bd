import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';
import { adjustBalance, listPlayers, setBlocked } from '@/lib/cashier';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** ৳100,000 a click is already far beyond any real correction. */
const MAX_ADJUST_PAISA = 100_000_00;

export async function GET(req: Request) {
  const session = await adminSession();
  if (!session) return json({ ok: false, reason: 'unauthorized' }, 401);

  const search = new URL(req.url).searchParams.get('search') ?? '';
  const result = await listPlayers(search);
  return result.ok
    ? json({ ok: true, players: result.data })
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
  const userId = String(record.userId ?? '');
  if (!userId) return json({ ok: false, reason: 'invalid-user' }, 400);

  if (record.action === 'adjust') {
    const amount = Math.round(Number(record.amount));
    if (!Number.isFinite(amount) || amount === 0) {
      return json({ ok: false, reason: 'invalid-amount' }, 400);
    }
    if (Math.abs(amount) > MAX_ADJUST_PAISA) {
      return json({ ok: false, reason: 'amount-too-large' }, 400);
    }

    const typed = String(record.note ?? '').trim().slice(0, 200);
    const result = await adjustBalance(userId, amount, `${session.username}: ${typed || 'adjust'}`);
    if (!result.ok) return json(result, result.reason === 'no-backend' ? 503 : 400);
  } else if (record.action === 'block') {
    const result = await setBlocked(userId, Boolean(record.blocked));
    if (!result.ok) return json(result, result.reason === 'no-backend' ? 503 : 400);
  } else {
    return json({ ok: false, reason: 'invalid-action' }, 400);
  }

  const players = await listPlayers(String(record.search ?? ''));
  return json({ ok: true, players: players.ok ? players.data : [] });
}

async function adminSession() {
  const cookieStore = await cookies();
  return getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
