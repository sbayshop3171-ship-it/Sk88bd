import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import {
  adminSessionCookieOptions,
  ADMIN_SESSION_COOKIE,
  changeAdminPassword,
} from '@/lib/admin-auth';

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
  const cookieStore = await cookies();
  const result = await changeAdminPassword({
    token: cookieStore.get(ADMIN_SESSION_COOKIE)?.value,
    oldPassword: String(record.oldPassword ?? ''),
    newPassword: String(record.newPassword ?? ''),
    confirmPassword: String(record.confirmPassword ?? ''),
  });

  if (!result.ok) {
    const status = result.reason === 'unauthorized' ? 401 : 400;
    return json(result, status);
  }

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
