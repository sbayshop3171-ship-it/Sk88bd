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
 *
 * Since 016 the TrxID is also the moment the money leaves the wallet: the
 * write goes through `pay_withdrawal_charge`, which freezes the quote, stores
 * the proof and takes the amount in one locked statement, once. A request
 * whose TrxID never comes keeps the balance whole.
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
    .select('id, user_id, amount, state, charge_amount, charge_trx_id, debited')
    .eq('id', id)
    .eq('user_id', uid)
    .maybeSingle<Record<string, unknown>>();

  if (error) return json({ ok: false, reason: 'db-error' }, 500);
  if (!row) return json({ ok: false, reason: 'not-found' }, 404);
  if (row.state !== 'pending') return json({ ok: false, reason: 'already-settled' }, 409);

  const cfg = (await getCashierConfig()).withdraw;

  /* The balance the charge is worked out on is the one the player had when
     they asked. A row that has already taken its money (debited — every row
     before 014, and one whose TrxID came in) gets the amount added back; one
     that has not, reads the wallet as it stands. */
  const { data: wallet } = await asService
    .from('wallets')
    .select('balance')
    .eq('user_id', uid)
    .maybeSingle();

  const amount = Number(row.amount ?? 0) / 100;
  const taken = row.debited === undefined || row.debited === true;
  const heldBalance = (Number(wallet?.balance ?? 0) + (taken ? Number(row.amount ?? 0) : 0)) / 100;
  const charge = withdrawCharge(
    chargeBase(cfg.chargeBasis, amount, heldBalance),
    cfg.chargePerThousand,
  );

  const trx = String(record.trxId ?? '').trim().slice(0, 64);
  const channel = String(record.channelId ?? '').trim().slice(0, 40);
  /* The fee is paid by a method the cashier offers for it — anything else
     would let "any channel" dodge the bKash 10-character TrxID rule. */
  if (channel) {
    const offered = (await getCashierConfig()).deposit.methods
      .filter((m) => m.active && m.payType !== 'transfer')
      .map((m) => m.channelId);
    if (!offered.includes(channel)) return json({ ok: false, reason: 'unknown-channel' }, 400);
  }

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

  const { error: payError } = await asService.rpc('pay_withdrawal_charge', {
    p_id: id,
    p_user: uid,
    p_charge: Number(patch.charge_amount),
    p_channel: channel || null,
    p_trx: trx || null,
  });

  if (payError) {
    // 016/017 are applied: a missing function is a fault to report, not a
    // reason to write the proof around every check they make
    const m = payError.message;
    if (/turnover left (\d+)/i.test(m)) {
      const left = Number(/turnover left (\d+)/i.exec(m)![1]) / 100;
      return json({ ok: false, reason: 'turnover', message: `বোনাস টার্নওভার বাকি: আরও ৳${left.toLocaleString('en-IN')} বাজি ধরতে হবে` }, 400);
    }
    if (/account (locked|held|banned)/i.test(m)) return json({ ok: false, reason: 'account-stopped', message: 'এই অ্যাকাউন্টে এখন উইথড্র বন্ধ' }, 403);
    if (/txn used/i.test(m)) return json({ ok: false, reason: 'txn-used', message: 'এই TrxID আগেই ব্যবহার করা হয়েছে' }, 409);
    // 017: a charge TrxID, once given, stays — a second, different one is refused
    if (/txn locked/i.test(m)) return json({ ok: false, reason: 'txn-locked', message: 'এই রিকোয়েস্টে আগেই একটি TrxID দেওয়া হয়েছে — সেটি বদলানো যাবে না' }, 409);
    if (/txn format/i.test(m)) return json({ ok: false, reason: 'txn-format', message: 'TrxID সঠিক নয় — মেসেজ থেকে পুরো TrxID দেখে লিখুন' }, 400);
    if (/check constraint|balance/i.test(m)) {
      return json({ ok: false, reason: 'insufficient-balance', message: 'ব্যালেন্সে এই পরিমাণ টাকা নেই — রিকোয়েস্টটি পূরণ করা যাবে না' }, 400);
    }
    if (/already/i.test(m)) return json({ ok: false, reason: 'already-settled' }, 409);
    return json({ ok: false, reason: 'db-error' }, 500);
  }

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
