import { NextResponse } from 'next/server';
import { adminSessionCookieOptions, ADMIN_SESSION_COOKIE, loginAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const result = await loginAdmin(
    String(record.username ?? ''),
    String(record.password ?? ''),
    callerOf(req),
  );

  if (!result.ok) {
    // 429 for a lockout, 503 for a deployment with no password set — a
    // client that cannot tell those from a wrong password shows the wrong
    // thing to whoever is standing at the door
    const status =
      result.reason === 'locked' ? 429 : result.reason === 'not-configured' ? 503 : 401;
    return json(result, status);
  }

  const res = json({
    ok: true,
    username: result.username,
    role: result.role,
    expiresAt: new Date(result.expiresAt).toISOString(),
  });
  res.cookies.set(ADMIN_SESSION_COOKIE, result.token, adminSessionCookieOptions(result.expiresAt));
  return res;
}

/* Who is guessing. Behind nginx and Cloudflare the socket address is the
   proxy, so the forwarded chain is read first — its left-most entry is the
   original client. Both headers are attacker-controlled on a server exposed
   directly, which is why this only ever feeds the lockout: a forged value
   costs the attacker their own bucket, never somebody else's session. */
function callerOf(req: Request) {
  const forwarded = req.headers.get('cf-connecting-ip')
    ?? req.headers.get('x-forwarded-for')?.split(',')[0]
    ?? req.headers.get('x-real-ip');
  return forwarded?.trim().slice(0, 64) || 'unknown';
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
