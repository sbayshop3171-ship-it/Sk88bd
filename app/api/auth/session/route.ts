import { NextResponse } from 'next/server';
import { clearedCookie, cookieFrom, userFromToken } from '@/lib/db/session';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Who the session cookie says this is: { session } or { session: null }. A
    cookie that no longer holds (password changed, banned, forged) is cleared. */
export async function GET(req: Request) {
  const token = cookieFrom(req.headers.get('cookie'));
  let user = null;
  try {
    user = token ? await userFromToken(token) : null;
  } catch (e) {
    console.error('[auth/session]', e);
    return NextResponse.json({ session: null, error: 'unavailable' }, { status: 503, headers: { 'cache-control': 'no-store' } });
  }

  const res = NextResponse.json(
    { session: user ? { user: { id: user.id, email: user.email, created_at: user.created_at } } : null },
    { headers: { 'cache-control': 'no-store' } },
  );
  if (token && !user) res.cookies.set(clearedCookie);
  return res;
}
