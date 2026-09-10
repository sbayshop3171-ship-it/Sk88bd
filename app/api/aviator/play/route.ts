import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { cancelBet, cashOut, openBets, placeBet } from '@/lib/aviator-play';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** The player's live bets on the current round, for restoring the screen. */
export async function GET() {
  return json(await openBets(await cookieAdapter()));
}

/** { action: 'bet', slot, stake } | { action: 'cancel', slot } | { action: 'cashout', slot } */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }

  if (!body || typeof body !== 'object') return json({ ok: false, reason: 'invalid-action' }, 400);
  const record = body as Record<string, unknown>;

  const slot = Number(record.slot);
  if (slot !== 0 && slot !== 1) return json({ ok: false, reason: 'invalid-slot' }, 400);

  const store = await cookieAdapter();
  const result =
    record.action === 'bet'
      ? await placeBet(store, slot, Number(record.stake))
      : record.action === 'cancel'
        ? await cancelBet(store, slot)
        : record.action === 'cashout'
          ? await cashOut(store, slot)
          : null;

  if (!result) return json({ ok: false, reason: 'invalid-action' }, 400);
  return result.ok ? json(result) : json(result, result.reason === 'unauthorized' ? 401 : 400);
}

/** next/headers hands back a store with `set`, while @supabase/ssr wants
    getAll/setAll — bridge the two shapes. */
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
