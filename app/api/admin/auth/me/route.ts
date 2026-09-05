import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const cookieStore = await cookies();
  const session = await getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return NextResponse.json(
    {
      ok: Boolean(session),
      session,
    },
    {
      status: session ? 200 : 401,
      headers: {
        'cache-control': 'no-store',
      },
    },
  );
}
