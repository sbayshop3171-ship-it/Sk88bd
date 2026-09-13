import { NextResponse } from 'next/server';
import { clearedCookie } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return NextResponse.json({ ok: false }, { status: 403 });
  const res = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  res.cookies.set(clearedCookie);
  return res;
}
