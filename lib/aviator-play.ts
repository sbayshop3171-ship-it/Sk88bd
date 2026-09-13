/** Placing and cashing out an Aviator bet.

    Every decision that touches money is made here, on the server:
      • whether betting is still open for the round
      • what multiplier the player actually reached
      • whether that multiplier beat the round's bust point

    The browser only says "bet this much" or "cash me out now" — it never gets
    to name a payout. The round itself comes from the signal store, which this
    module reads and never writes. */

import { multiplierAt } from './aviator';
import { getAviatorSignalState } from './aviator-signal-store';
import {
  MIN_STAKE_PAISA,
  publicBet,
  type BetResult,
  type PublicBet,
} from './aviator-bets';
import { betsFor, mutateBets, newBet, settleBusted } from './aviator-bets-store';
import { MAX_STAKE_PAISA, capPayout } from './mini-games';
import { accountBlock } from './player-status';
import { adminClient, serverClient } from './supabase';

type CookieStore = {
  getAll: () => { name: string; value: string }[];
  setAll: (list: { name: string; value: string; options?: object }[]) => void;
};

export async function placeBet(
  cookies: CookieStore,
  slot: 0 | 1,
  stake: number,
): Promise<BetResult> {
  const who = await signedInUser(cookies);
  if (!who.ok) return who.error;

  const blocked = await accountBlock(who.db, who.uid);
  if (blocked) return { ok: false, reason: blocked === 'banned' ? 'account-banned' : 'account-held' };

  if (!Number.isFinite(stake) || stake <= 0) return { ok: false, reason: 'invalid-stake' };
  const amount = Math.round(stake);
  if (amount < MIN_STAKE_PAISA) return { ok: false, reason: 'below-minimum' };
  if (amount > MAX_STAKE_PAISA) return { ok: false, reason: 'above-maximum' };

  const round = (await getAviatorSignalState()).currentRound;
  const now = Date.now();

  // Betting is open between the countdown starting and the plane leaving.
  const opens = Date.parse(round.betting_at);
  const flies = Date.parse(round.fly_at);
  if (!(now >= opens && now < flies)) return { ok: false, reason: 'betting-closed' };

  // Take the seat inside the store's queue before any money moves. Two
  // requests for one seat arriving together meet each other in there; a
  // read outside it let both through and charged the stake twice.
  const seat = newBet({ userId: who.uid, roundId: round.round_id, slot, stake: amount });
  const took = await mutateBets((all) => {
    settleBusted(all, who.uid, round.round_id);
    const taken = all.some(
      (b) => b.userId === who.uid && b.roundId === round.round_id && b.slot === slot,
    );
    if (!taken) all.push(seat);
    return !taken;
  });
  if (!took) return { ok: false, reason: 'already-placed' };

  // wallets.balance carries a >= 0 check, so an over-bet is refused by the
  // database rather than by anything we could get wrong here.
  const debit = await who.db.rpc('wallet_apply', {
    p_user: who.uid,
    p_kind: 'bet',
    p_amount: -amount,
    p_ref: `aviator:${round.round_id}:${slot}`,
  });
  if (debit.error) {
    await mutateBets((all) => {
      const at = all.findIndex((b) => b.id === seat.id);
      if (at >= 0) all.splice(at, 1);
    });
    if (/account (banned|held)/i.test(debit.error.message)) {
      return { ok: false, reason: /banned/i.test(debit.error.message) ? 'account-banned' : 'account-held' };
    }
    return /balance|check/i.test(debit.error.message)
      ? { ok: false, reason: 'insufficient-balance' }
      : { ok: false, reason: 'db-error', message: debit.error.message };
  }

  return { ok: true, balance: Number(debit.data ?? 0), bets: await mineOn(who.uid, round.round_id) };
}

const mineOn = async (uid: string, roundId: number) =>
  (await betsFor(uid, roundId)).map(publicBet);

/** Take a bet back while the betting window is still open: the stake goes
    straight back to the wallet and the seat is freed for a new bet. The
    reference board offers this as the red "Cancel" on a placed seat. */
export async function cancelBet(cookies: CookieStore, slot: 0 | 1): Promise<BetResult> {
  const who = await signedInUser(cookies);
  if (!who.ok) return who.error;

  const round = (await getAviatorSignalState()).currentRound;
  const now = Date.now();
  const flies = Date.parse(round.fly_at);

  // once the plane is up the stake is riding; only a cash-out ends it
  if (now >= flies) {
    const open = (await betsFor(who.uid, round.round_id)).some(
      (b) => b.slot === slot && b.settledAt === null,
    );
    return { ok: false, reason: open ? 'betting-closed' : 'no-open-bet' };
  }

  // Lift the bet off the board inside the queue, and refund only if this
  // request is the one that lifted it. Ten Cancels at once used to all find
  // the bet still there and all pay the stake back.
  const taken = await mutateBets((all) => {
    const at = all.findIndex(
      (b) => b.userId === who.uid && b.roundId === round.round_id
        && b.slot === slot && b.settledAt === null,
    );
    return at >= 0 ? all.splice(at, 1)[0] : null;
  });
  if (!taken) return { ok: false, reason: 'no-open-bet' };

  // Given back as a 'bet' credit, so it nets against the stake. Booked as
  // 'adjust' it left the stake counted as money wagered, and a player could
  // bet-and-cancel their way to rebate, rescue and mission progress.
  const refund = await who.db.rpc('wallet_apply', {
    p_user: who.uid,
    p_kind: 'bet',
    p_amount: taken.stake,
    p_ref: `aviator:${round.round_id}:${slot}:cancel`,
  });
  if (refund.error) {
    await mutateBets((all) => { all.push(taken); });
    return { ok: false, reason: 'db-error', message: refund.error.message };
  }

  return { ok: true, balance: Number(refund.data ?? 0), bets: await mineOn(who.uid, round.round_id) };
}

export async function cashOut(cookies: CookieStore, slot: 0 | 1): Promise<BetResult> {
  const who = await signedInUser(cookies);
  if (!who.ok) return who.error;

  const round = (await getAviatorSignalState()).currentRound;
  const now = Date.now();
  const flies = Date.parse(round.fly_at);
  const busts = Date.parse(round.crash_at);

  const open = (await betsFor(who.uid, round.round_id)).find(
    (b) => b.slot === slot && b.settledAt === null,
  );
  if (!open) return { ok: false, reason: 'no-open-bet' };
  if (now < flies) return { ok: false, reason: 'not-flying' };

  // Too late: the stake is already gone, so this only marks the bet closed.
  // Reported as a success with no payout, so the screen still gets the fresh
  // balance and bet list rather than having to guess after an error.
  if (now >= busts) {
    const bets = await mutateBets((all) => {
      settleBusted(all, who.uid, round.round_id + 1);
      return all
        .filter((b) => b.userId === who.uid && b.roundId === round.round_id)
        .map(publicBet);
    });
    return {
      ok: true,
      balance: await currentBalance(who.db, who.uid),
      bets,
      cashedAt: 0,
      payout: 0,
    };
  }

  // The multiplier is read off the server's own clock and capped at where the
  // round actually busts, so a slow or doctored client cannot claim more.
  const reached = Math.min(multiplierAt(now - flies), Number(round.target_x));
  const multiplier = Math.floor(reached * 100) / 100;
  const payout = capPayout(Math.floor(open.stake * multiplier));

  // Settle the bet inside the queue first, and pay only if this request is
  // the one that settled it. Crediting first and marking it afterwards let
  // two Cash Outs sent together both find it open and both get paid.
  const claimed = await mutateBets((all) => {
    const row = all.find((b) => b.id === open.id && b.settledAt === null);
    if (!row) return false;
    row.cashedAt = multiplier;
    row.payout = payout;
    row.settledAt = new Date().toISOString();
    return true;
  });
  if (!claimed) return { ok: false, reason: 'no-open-bet' };

  const credit = await who.db.rpc('wallet_apply', {
    p_user: who.uid,
    p_kind: 'win',
    p_amount: payout,
    p_ref: `aviator:${round.round_id}:${slot}:${multiplier}x`,
  });
  if (credit.error) {
    // put it back as it was, so the player can try again while it flies
    await mutateBets((all) => {
      const row = all.find((b) => b.id === open.id);
      if (row) { row.cashedAt = null; row.payout = 0; row.settledAt = null; }
    });
    return { ok: false, reason: 'db-error', message: credit.error.message };
  }

  return {
    ok: true,
    balance: Number(credit.data ?? 0),
    bets: await mineOn(who.uid, round.round_id),
    cashedAt: multiplier,
    payout,
  };
}

/** The player's live bets on the current round, for restoring the screen. */
export async function openBets(cookies: CookieStore): Promise<{
  ok: boolean;
  roundId: number;
  bets: PublicBet[];
}> {
  const who = await signedInUser(cookies);
  const round = (await getAviatorSignalState()).currentRound;
  if (!who.ok) return { ok: false, roundId: round.round_id, bets: [] };

  const mine = await betsFor(who.uid, round.round_id);
  return { ok: true, roundId: round.round_id, bets: mine.map(publicBet) };
}

type Who =
  | { ok: true; uid: string; db: NonNullable<ReturnType<typeof adminClient>> }
  | { ok: false; error: Extract<BetResult, { ok: false }> };

async function signedInUser(cookies: CookieStore): Promise<Who> {
  const auth = serverClient(cookies);
  const db = adminClient();
  if (!auth || !db) return { ok: false, error: { ok: false, reason: 'no-backend' } };

  const { data } = await auth.auth.getUser();
  if (!data.user) return { ok: false, error: { ok: false, reason: 'unauthorized' } };

  return { ok: true, uid: data.user.id, db };
}

async function currentBalance(
  db: NonNullable<ReturnType<typeof adminClient>>,
  uid: string,
): Promise<number> {
  const { data } = await db.from('wallets').select('balance').eq('user_id', uid).maybeSingle();
  return Number((data as { balance?: number } | null)?.balance ?? 0);
}
