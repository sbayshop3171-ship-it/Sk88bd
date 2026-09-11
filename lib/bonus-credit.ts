/** Paying a bonus, and the turnover it brings with it.

    Bonus money is bet before it can be withdrawn (the operator's rule,
    2026-09-11): every payout the house makes for nothing — sign-in, spin,
    mission, promo, rescue, rebate, a deposit's method bonus — adds its
    amount times the multiplier set at /admin/bonus to the wallet's
    turnover_need, and request_withdrawal refuses while that is ahead of what
    has been staked. Server-side only: the multiplier lives in the bonus
    config file. */

import type { SupabaseClient } from '@supabase/supabase-js';
import { getBonusConfig } from './bonus-config-store';

export async function creditBonus(
  db: SupabaseClient,
  input: { user: string; kind: 'bonus' | 'rebate'; amount: number; ref: string },
) {
  const { turnover } = await getBonusConfig();
  const need = Math.round(input.amount * Math.max(0, Number(turnover.multiplier) || 0));

  const paid = await db.rpc('credit_bonus', {
    p_user: input.user,
    p_kind: input.kind,
    p_amount: input.amount,
    p_ref: input.ref,
    p_turnover: need,
  });

  // Before migration 012 there is no credit_bonus: the money still arrives,
  // without the turnover, rather than the bonus failing outright.
  if (paid.error && (paid.error.code === 'PGRST202' || /could not find the function/i.test(paid.error.message))) {
    return db.rpc('wallet_apply', {
      p_user: input.user,
      p_kind: input.kind,
      p_amount: input.amount,
      p_ref: input.ref,
    });
  }
  return paid;
}
