import { NextResponse } from 'next/server';
import { clientIp } from '@/lib/client-ip';
import { registerAccount } from '@/lib/db/accounts';
import { lockLeft, recordFail } from '@/lib/db/attempts';
import { DbFail } from '@/lib/db/errors';
import { publicSession, sessionCookie } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Sign-ups one address may make before it waits an hour. */
const SIGNUPS_PER_ADDRESS = 10;

/**
 * { phone, password, referralCode?, agentCode? } → { ok, session } and the
 * session cookie. The agent code is written once, here, and never again.
 */
export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return reply({ ok: false, message: 'Bad request' }, 403);
  const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return reply({ ok: false, message: 'Bad request' }, 400);

  const key = `reg:${clientIp(req)}`;
  try {
    if (await lockLeft('login', [key]) > 0) {
      return reply({ ok: false, message: 'Too many sign-ups from this network — try again later' }, 429);
    }

    const account = await registerAccount({
      phone: String(body.phone ?? ''),
      password: String(body.password ?? ''),
      referralCode: body.referralCode,
      agentCode: body.agentCode,
    });
    await recordFail('login', key, SIGNUPS_PER_ADDRESS, 60 * 60_000);

    const res = reply({ ok: true, session: publicSession(account) });
    res.cookies.set(sessionCookie(account));
    return res;
  } catch (e) {
    if (e instanceof DbFail) return reply({ ok: false, message: e.message }, e.code === 'phone-taken' ? 409 : 400);
    console.error('[auth/register]', e);
    return reply({ ok: false, message: 'Could not create the account — try again' }, 500);
  }
}

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
