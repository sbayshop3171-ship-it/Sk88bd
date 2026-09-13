import { NextResponse } from 'next/server';
import { changePassword } from '@/lib/db/accounts';
import { DbFail } from '@/lib/db/errors';
import { currentUser, publicSession, sessionCookie } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * { password } → a new login password for the signed-in player.
 *
 * The screen checks the current password first (by logging in with it), the
 * way it did against Supabase. Every other session on the account ends; this
 * one gets a fresh cookie so the player stays signed in.
 */
export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return reply({ ok: false, message: 'Bad request' }, 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const password = String(body?.password ?? '');

  try {
    const me = await currentUser(req);
    if (!me) return reply({ ok: false, message: 'Log in first' }, 401);
    const result = await changePassword(me.id, password);
    if (result === 'same') {
      return reply({ ok: false, message: 'New password should be different from the old password' }, 400);
    }
    const res = reply({ ok: true, session: publicSession(result) });
    res.cookies.set(sessionCookie(result));
    return res;
  } catch (e) {
    if (e instanceof DbFail) return reply({ ok: false, message: e.message }, 400);
    console.error('[auth/password]', e);
    return reply({ ok: false, message: 'Could not change the password — try again' }, 500);
  }
}

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
