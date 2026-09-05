import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { ADMIN_SESSION_COOKIE, getAdminSessionFromCookie } from '@/lib/admin-auth';
import type { GameMutationResult, GameOverrideInput } from '@/lib/game-control';
import { clearOverride, listOverrides, setOverride } from '@/lib/game-control-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);
  return json({ ok: true, overrides: await listOverrides() });
}

export async function POST(req: Request) {
  if (!(await isAuthorized())) return json({ ok: false, reason: 'unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;
  const gameId = String(record.gameId ?? '');

  let result: GameMutationResult;
  switch (record.action) {
    case 'set':
      result = await setOverride({
        gameId,
        status: record.status as GameOverrideInput['status'],
        tag: record.tag as GameOverrideInput['tag'],
        sortOrder: record.sortOrder as GameOverrideInput['sortOrder'],
      });
      break;
    case 'clear':
      result = await clearOverride(gameId);
      break;
    default:
      return json({ ok: false, reason: 'invalid-action' }, 400);
  }

  return result.ok ? json(result) : json(result, 400);
}

async function isAuthorized() {
  const cookieStore = await cookies();
  return Boolean(await getAdminSessionFromCookie(cookieStore.get(ADMIN_SESSION_COOKIE)?.value));
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
