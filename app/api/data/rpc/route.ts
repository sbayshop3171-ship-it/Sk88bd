import { NextResponse } from 'next/server';
import { toDbError } from '@/lib/db/errors';
import {
  blockOf, hasTransactionPassword, setTransactionPassword, verifyTransactionPassword,
} from '@/lib/db/money';
import { withConn } from '@/lib/db/pool';
import { currentUser } from '@/lib/db/session';
import { sameSiteRequest } from '@/lib/request-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * The few database functions a player's browser may call, each about the
 * player the session names: the fund password (has / set / check) and
 * their own hold-or-ban state. Money functions are not on this list —
 * those run only behind the server's own routes.
 */
export async function POST(req: Request) {
  if (!sameSiteRequest(req)) return reply({ data: null, error: { message: 'Bad request' }, count: null }, 403);

  const body = (await req.json().catch(() => null)) as { fn?: unknown; args?: Record<string, unknown> } | null;
  const fn = String(body?.fn ?? '');
  const args = body?.args && typeof body.args === 'object' ? body.args : {};

  try {
    const me = await currentUser(req);
    if (!me) return reply({ data: null, error: { message: 'not signed in', code: '42501' }, count: null }, 401);

    let data: unknown;
    switch (fn) {
      case 'has_transaction_password':
        data = await hasTransactionPassword(me.id);
        break;
      case 'set_transaction_password':
        data = await setTransactionPassword(me.id, String(args.p_new ?? ''), args.p_old == null ? null : String(args.p_old));
        break;
      case 'verify_transaction_password':
        data = await verifyTransactionPassword(me.id, String(args.p_password ?? ''));
        break;
      case 'my_account_block':
        data = await withConn((c) => blockOf(c, me.id));
        break;
      default:
        return reply({ data: null, error: { message: `Could not find the function ${fn}`, code: 'PGRST202' }, count: null }, 404);
    }
    return reply({ data, error: null, count: null });
  } catch (e) {
    return reply({ data: null, error: toDbError(e), count: null });
  }
}

function reply(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { 'cache-control': 'no-store' } });
}
