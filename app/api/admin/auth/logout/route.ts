import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, expiredAdminSessionCookieOptions } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  const res = NextResponse.json(
    { ok: true },
    {
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
  res.cookies.set(ADMIN_SESSION_COOKIE, '', expiredAdminSessionCookieOptions());
  return res;
}
