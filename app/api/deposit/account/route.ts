import { NextResponse } from 'next/server';
import type { PaymentAccountKind } from '@/lib/payment-accounts';
import { isKnownChannel, pickDepositAccount } from '@/lib/payment-accounts-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * One operator account for the player to send money to, drawn at random from
 * the numbers the admin added for that channel. Called once per channel pick
 * on the deposit screen, so a reload rotates the player onto another number.
 */
export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const channelId = params.get('channel')?.trim() ?? '';
  if (!isKnownChannel(channelId)) {
    return json({ ok: false, reason: 'unknown-channel' }, 400);
  }
  // the deposit method's pay type narrows which kind of operator number fits
  const kinds = (params.get('kinds') ?? '')
    .split(',')
    .filter((k): k is PaymentAccountKind => k === 'personal' || k === 'agent' || k === 'merchant');

  const account = await pickDepositAccount(channelId, kinds);
  if (!account) return json({ ok: false, reason: 'no-account' }, 404);

  return json({ ok: true, account });
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
