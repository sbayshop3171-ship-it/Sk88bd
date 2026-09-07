import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { getCashierConfig } from '@/lib/cashier-config-store';
import { chargeBase, withdrawCharge } from '@/lib/cashier-config';
import { adminClient, serverClient } from '@/lib/supabase';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The agent cash-out charge on a pending withdrawal.
 *
 * The browser used to call `set_withdrawal_charge` itself and hand it the
 * amount. The function checks that the row is yours and still pending, but it
 * wrote whatever number it was given — so a player could quote themselves
 * zero and leave an admin approving a withdrawal that looked like it owed
 * nothing. The rate lives in the cashier config, which is ours, so the figure
 * is worked out here and written with the service role. The browser sends the
 * withdrawal id and, later, the TrxID; it never sends money.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, reason: 'invalid-json' }, 400);
  }
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};

  const id = Number(record.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, reason: 'invalid-id' }, 400);

  const store = await cookieAdapter();
  const asUser = serverClient(store);
  const asService = adminClient();
  if (!asUser || !asService) return json({ ok: false, reason: 'backend-missing' }, 503);

  const { data: auth } = await asUser.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) return json({ ok: false, reason: 'unauthorized' }, 401);

  /* Read through the service role but match on the caller's own id, so a
     guessed withdrawal id belonging to somebody else reads as not found. */
  const { data: row, error } = await asService
    .from('withdrawals')
    .select('id, user_id, amount, state, charge_amount, charge_trx_id')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle();

  if (error) return json({ ok: false, reason: 'db-error' }, 500);
  if (!row) return json({ ok: false, reason: 'not-found' }, 404);
  if (row.state !== 'pending') return json({ ok: false, reason: 'already-settled' }, 409);

  const cfg = (await getCashierConfig()).withdraw;

  /* The balance the charge is worked out on is the one before this request
     debited it — the amount is still held against this row, so adding it back
     reconstructs what the player had when they asked. */
  const { data: wallet } = await asService
    .from('wallets')
    .select('balance')
    .eq('user_id', uid)
    .maybeSingle();

  const amount = Number(row.amount ?? 0) / 100;
  const heldBalance = (Number(wallet?.balance ?? 0) + Number(row.amount ?? 0)) / 100;
  const charge = withdrawCharge(
    chargeBase(cfg.chargeBasis, amount, heldBalance),
    cfg.chargePerThousand,
  );

  const trx = String(record.trxId ?? '').trim().slice(0, 64);
  const channel = String(record.channelId ?? '').trim().slice(0, 40);

  /* A quote is a quote: once written it is the number the player owes, so a
     second call cannot move it. Only the proof is still open. */
  const quoted = Number(row.charge_amount ?? 0);
  const patch: Record<string, unknown> = {
    charge_amount: quoted > 0 ? quoted : Math.round(charge * 100),
  };
  if (channel) patch.charge_channel_id = channel;
  if (trx) {
    patch.charge_trx_id = trx;
    if (!row.charge_trx_id) patch.charge_paid_at = new Date().toISOString();
  }

  const { error: writeError } = await asService
    .from('withdrawals')
    .update(patch)
    .eq('id', id)
    .eq('user_id', uid)
    .eq('state', 'pending');

  if (writeError) return json({ ok: false, reason: 'db-error' }, 500);

  return json({ ok: true, charge: Number(patch.charge_amount) / 100 });
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
