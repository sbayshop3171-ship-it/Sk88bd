import { NextResponse } from 'next/server';
import { isValidPhone, normalizePhone } from '@/lib/auth';
import { clientIp } from '@/lib/client-ip';
import { verifyLogin } from '@/lib/db/accounts';
import { clearFails, lockLeft, recordFail } from '@/lib/db/attempts';
import { publicSession, sessionCookie } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LOCK_MS = 15 * 60_000;

/**
 * { phone, password } → { ok, session } and the session cookie.
 *
 * Wrong guesses are counted per number and per address: eight in a row shut
 * that number for 15 minutes, forty from one address shut the address.
 */
export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return reply({ ok: false, message: 'Bad request' }, 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  const phone = normalizePhone(String(body?.phone ?? '').trim());
  const password = String(body?.password ?? '');
  if (!isValidPhone(phone) || !password) return reply({ ok: false, message: 'Wrong number or password' }, 400);

  try {
    const keys = [`p:${phone}`, `ip:${clientIp(req)}`];
    const left = await lockLeft('login', keys);
    if (left > 0) {
      return reply({ ok: false, message: `Too many attempts — try again in ${Math.ceil(left / 60)} min` }, 429);
    }

    const result = await verifyLogin(phone, password);
    if (result === 'wrong') {
      await recordFail('login', keys[0], 8, LOCK_MS);
      await recordFail('login', keys[1], 40, LOCK_MS);
      return reply({ ok: false, message: 'Wrong number or password' }, 401);
    }
    if (result === 'banned') return reply({ ok: false, message: 'This account has been banned. Contact support.' }, 403);

    await clearFails('login', keys[0]);
    const res = reply({ ok: true, session: publicSession(result) });
    res.cookies.set(sessionCookie(result));
    return res;
  } catch (e) {
    console.error('[auth/login]', e);
    return reply({ ok: false, message: 'Could not log in — try again' }, 500);
  }
}

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
