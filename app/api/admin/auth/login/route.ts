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
  const result = await loginAdmin(String(record.username ?? ''), String(record.password ?? ''));

  if (!result.ok) return json(result, 401);

  const res = json({
    ok: true,
    username: result.username,
    expiresAt: new Date(result.expiresAt).toISOString(),
  });
  res.cookies.set(ADMIN_SESSION_COOKIE, result.token, adminSessionCookieOptions(result.expiresAt));
  return res;
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: {
      'cache-control': 'no-store',
    },
  });
}
