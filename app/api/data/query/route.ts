import { NextResponse } from 'next/server';
import { parseSpec, runPlayerQuery } from '@/lib/db/policy';
import { currentUser } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The browser's database door. The body is a builder spec
 * (lib/db/builder.ts); lib/db/policy.ts decides what a player may read and
 * write, always scoped to the player the session cookie names.
 */
export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return reply({ data: null, error: { message: 'Bad request' }, count: null }, 403);

  try {
    const me = await currentUser(req);
    if (!me) return reply({ data: null, error: { message: 'not signed in', code: '42501' }, count: null }, 401);

    const spec = parseSpec(await req.json().catch(() => null));
    if (!spec) return reply({ data: null, error: { message: 'Bad request', code: '22023' }, count: null }, 400);

    const result = await runPlayerQuery(me.id, spec);
    return reply(result, result.error?.code === '42501' ? 403 : 200);
  } catch (e) {
    console.error('[data/query]', e);
    return reply({ data: null, error: { message: 'Database unavailable' }, count: null }, 503);
  }
}

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
