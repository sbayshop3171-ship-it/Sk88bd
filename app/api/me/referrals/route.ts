import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { adminClient, serverClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The signed-in player's referral figures.
 *
 * RLS only lets a player read their own profile row, so "how many people
 * signed up with my code" cannot be answered from the browser. This route
 * checks the session, then counts with the service role — and returns
 * totals only, never the referred players' details.
 */
export async function GET() {
  const auth = serverClient(await cookieAdapter());
  const db = adminClient();
  if (!auth || !db) return json({ ok: false, reason: 'no-backend' }, 503);

  const { data: me } = await auth.auth.getUser();
  if (!me.user) return json({ ok: false, reason: 'unauthorized' }, 401);

  const referred = await db.from('profiles').select('id').eq('referred_by', me.user.id);
  if (referred.error) return json({ ok: false, reason: 'db-error', message: referred.error.message }, 500);

  const ids = (referred.data ?? []).map((r) => r.id as string);

  // "active" = has at least one approved deposit; commission = rebate rows on
  // the player's own ledger (that is where a referral payout would land).
  let active = 0;
  if (ids.length > 0) {
    const deps = await db
      .from('deposits')
      .select('user_id')
      .in('user_id', ids)
      .eq('state', 'approved');
    active = new Set((deps.data ?? []).map((d) => d.user_id as string)).size;
  }

  const rebates = await db
    .from('transactions')
    .select('amount')
    .eq('user_id', me.user.id)
    .eq('kind', 'rebate');
  const commission = (rebates.data ?? []).reduce((sum, r) => sum + Number(r.amount ?? 0), 0);

  return json({ ok: true, total: ids.length, active, commission });
}

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
