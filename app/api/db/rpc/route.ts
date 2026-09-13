import { NextResponse } from 'next/server';
import type { PoolConnection } from 'mysql2/promise';
import { ensureMysqlSchema, getMysqlPool } from '@/lib/mysql-server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** MySQL equivalents for the cashier RPCs used by the shared data layer. */
export async function POST(req: Request) {
  try {
    const internalKey = req.headers.get('x-internal-rpc-key');
    if (!process.env.ADMIN_PASSWORD || internalKey !== process.env.ADMIN_PASSWORD) {
      return json({ message: 'Forbidden' }, 403);
    }
    const { fn, args = {} } = await req.json() as { fn?: string; args?: Record<string, unknown> };
    await ensureMysqlSchema();
    const pool = await getMysqlPool();
    const id = Number(args.p_id);
    const note = args.p_note == null ? null : String(args.p_note);
    if (!Number.isInteger(id) || id <= 0) return json({ message: 'Invalid request id' }, 400);

    if (fn === 'approve_deposit' || fn === 'reject_deposit') {
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [rows] = await connection.execute(
          'SELECT id, user_id, amount, state, created_at FROM deposits WHERE id = ? FOR UPDATE',
          [id],
        );
        const deposit = (rows as Record<string, unknown>[])[0];
        if (!deposit) throw new Error(`deposit ${id} not found`);
        if (deposit.state !== 'pending') throw new Error(`deposit ${id} already ${deposit.state}`);

        const approved = fn === 'approve_deposit';
        await connection.execute(
          'UPDATE deposits SET state = ?, admin_note = ?, reviewed_at = NOW() WHERE id = ?',
          [approved ? 'approved' : 'rejected', note, id],
        );

        if (approved) {
          await connection.execute(
            'INSERT INTO wallets (user_id, balance, bonus_balance, turnover_need, turnover_done) VALUES (?, ?, 0, 0, 0) ON DUPLICATE KEY UPDATE balance = balance + VALUES(balance)',
            [String(deposit.user_id), Number(deposit.amount ?? 0)] as (string | number)[],
          );
          await unlockAfterVerification(connection, String(deposit.user_id));
        }

        await connection.commit();
        return json({ data: null });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    }

    return json({ message: `Unsupported RPC: ${String(fn ?? '')}` }, 400);
  } catch (error) {
    return json({ message: error instanceof Error ? error.message : 'Database error' }, 500);
  }
}

async function unlockAfterVerification(connection: PoolConnection, userId: string) {
  const [profiles] = await connection.execute(
    'SELECT withdraw_locked, verification_deposit_amount, locked_at FROM profiles WHERE id = ? FOR UPDATE',
    [userId],
  );
  const profile = (profiles as Record<string, unknown>[])[0];
  const target = Number(profile?.verification_deposit_amount ?? 0);
  if (!profile || !profile.withdraw_locked || target <= 0) return;

  const [deposits] = await connection.execute(
    'SELECT COALESCE(SUM(amount), 0) AS total FROM deposits WHERE user_id = ? AND state = ? AND created_at >= COALESCE(?, created_at)',
    [userId, 'approved', profile.locked_at == null ? null : String(profile.locked_at)] as (string | null)[],
  );
  const total = Number((deposits as Record<string, unknown>[])[0]?.total ?? 0);
  if (total < target) return;

  await connection.execute(
    'UPDATE profiles SET withdraw_locked = 0, lock_reason = NULL, locked_at = NULL, locked_by = NULL, verification_deposit_amount = 0 WHERE id = ? AND withdraw_locked = 1',
    [userId],
  );
}

function json(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
