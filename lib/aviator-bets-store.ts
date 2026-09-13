/** Where Aviator bets are kept between placing and settling: the
    `aviator_bets` table.

    They used to live in one JSON file that was rewritten whole on every bet,
    cancel and cash-out, one request at a time — fine for a handful of
    players, a queue of seconds when hundreds bet in the same six-second
    window. In the table a seat is a row: the unique key on (player, round,
    seat) is what stops a second bet on one seat, and "settled_at IS NULL" in
    the WHERE is what stops a bet being paid or refunded twice.

    Only the API routes touch this. The signal store that decides when a round
    flies and where it busts is left completely alone. */

import { randomBytes } from 'node:crypto';
import type { AviatorBet } from './aviator-bets';
import { rows, withConn, write, type Row } from './db/pool';

export function newBet(input: {
  userId: string;
  roundId: number;
  slot: 0 | 1;
  stake: number;
}): AviatorBet {
  return {
    id: randomBytes(8).toString('hex'),
    ...input,
    cashedAt: null,
    payout: 0,
    placedAt: new Date().toISOString(),
    settledAt: null,
  };
}

const toBet = (r: Row): AviatorBet => ({
  id: String(r.id),
  userId: String(r.user_id),
  roundId: Number(r.round_id),
  slot: Number(r.slot) === 1 ? 1 : 0,
  stake: Number(r.stake),
  cashedAt: r.cashed_at === null || r.cashed_at === undefined ? null : Number(r.cashed_at),
  payout: Number(r.payout ?? 0),
  placedAt: String(r.placed_at),
  settledAt: (r.settled_at as string | null) ?? null,
});

const COLS = 'id, user_id, round_id, slot, stake, cashed_at, payout, placed_at, settled_at';

/** The player's bets on one round. */
export async function betsFor(userId: string, roundId: number): Promise<AviatorBet[]> {
  const found = await withConn((c) => rows(c,
    `SELECT ${COLS} FROM aviator_bets WHERE user_id = ? AND round_id = ? ORDER BY slot`, [userId, roundId]));
  return found.map(toBet);
}

/** Close out anything the player left riding on a round that has since
    busted. Nothing is paid: the stake left the wallet when it was placed. */
export async function closeBusted(userId: string, beforeRoundId: number) {
  await withConn((c) => write(c,
    'UPDATE aviator_bets SET settled_at = NOW(3) WHERE user_id = ? AND settled_at IS NULL AND round_id < ?',
    [userId, beforeRoundId]));
}

/** Take the seat before any money moves. False when the seat is taken. */
export async function takeSeat(bet: AviatorBet): Promise<boolean> {
  await closeBusted(bet.userId, bet.roundId);
  try {
    await withConn((c) => write(c,
      'INSERT INTO aviator_bets (id, user_id, round_id, slot, stake) VALUES (?, ?, ?, ?, ?)',
      [bet.id, bet.userId, bet.roundId, bet.slot, bet.stake]));
    return true;
  } catch (e) {
    if ((e as { code?: string }).code === 'ER_DUP_ENTRY') return false;
    throw e;
  }
}

/** Undo takeSeat when the stake could not be taken. */
export async function dropBet(id: string) {
  await withConn((c) => write(c, 'DELETE FROM aviator_bets WHERE id = ? AND settled_at IS NULL', [id]));
}

/** Lift an open bet off the board. Only the request that lifted it gets it
    back, so ten Cancels at once refund once. */
export async function liftBet(userId: string, roundId: number, slot: 0 | 1): Promise<AviatorBet | null> {
  return withConn(async (c) => {
    const [open] = await rows(c,
      `SELECT ${COLS} FROM aviator_bets WHERE user_id = ? AND round_id = ? AND slot = ? AND settled_at IS NULL`,
      [userId, roundId, slot]);
    if (!open) return null;
    const res = await write(c, 'DELETE FROM aviator_bets WHERE id = ? AND settled_at IS NULL', [open.id]);
    return res.affectedRows === 1 ? toBet(open) : null;
  });
}

/** Put a lifted bet back (its refund failed). */
export async function restoreBet(bet: AviatorBet) {
  await withConn((c) => write(c,
    'INSERT IGNORE INTO aviator_bets (id, user_id, round_id, slot, stake, placed_at) VALUES (?, ?, ?, ?, ?, ?)',
    [bet.id, bet.userId, bet.roundId, bet.slot, bet.stake, bet.placedAt]));
}

/** Settle a cash-out. True only for the request that settled it, so two Cash
    Outs sent together are paid once. */
export async function settleBet(id: string, cashedAt: number, payout: number): Promise<boolean> {
  const res = await withConn((c) => write(c,
    'UPDATE aviator_bets SET cashed_at = ?, payout = ?, settled_at = NOW(3) WHERE id = ? AND settled_at IS NULL',
    [cashedAt, payout, id]));
  return res.affectedRows === 1;
}

/** Reopen a cash-out whose payout failed, so the player can try again. */
export async function unsettleBet(id: string) {
  await withConn((c) => write(c,
    'UPDATE aviator_bets SET cashed_at = NULL, payout = 0, settled_at = NULL WHERE id = ?', [id]));
}
