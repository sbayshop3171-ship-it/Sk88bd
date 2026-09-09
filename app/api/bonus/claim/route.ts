import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { bonusState, claimBonus } from '@/lib/bonus-claim';
import { CLAIM_MESSAGE, type BonusKind } from '@/lib/bonus-config';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const KINDS: BonusKind[] = ['signin', 'rescue', 'rebate', 'promo'];

/** What each offer would pay this player right now. */
export async function GET() {
  const state = await bonusState(await cookieAdapter());
  return json(state ? { ok: true, state } : { ok: false, reason: 'no-backend' });
}

/** { kind: 'signin' | 'rescue' | 'rebate' | 'promo', code?: string } */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  const record = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const kind = String(record.kind ?? '') as BonusKind;
  if (!KINDS.includes(kind)) return json({ ok: false, reason: 'unknown-kind' }, 400);

  const result = await claimBonus(await cookieAdapter(), kind, String(record.code ?? ''));
  return result.ok
    ? json(result)
    : json({ ...result, message: CLAIM_MESSAGE[result.reason] }, result.reason === 'unauthorized' ? 401 : 400);
}

/** The reader/writer shape `serverClient` wants — Next's own cookie store
    is read-only in a route handler, so it is wrapped rather than passed. */
async function cookieAdapter() {
  const store = await cookies();
  return {
    getAll: () => store.getAll().map((c) => ({ name: c.name, value: c.value })),
    setAll: (list: { name: string; value: string; options?: object }[]) => {
      for (const c of list) store.set(c.name, c.value, c.options);
    },
  };
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
