/** The Postgres function names the server code still calls through
    `db.rpc(name, args)`, each mapped to its MySQL version in money.ts.
    Server-side only: the browser has its own, much shorter list in
    /api/data/rpc. */

import type { QueryResult } from './builder';
import { DbFail, toDbError } from './errors';
import {
  adjustBalance, approveDeposit, approveWithdrawal, blockOf, bonusFacts, claimPromo, creditBonus,
  hasTransactionPassword, passwordAttempt, passwordLockLeft, payWithdrawalCharge, rejectDeposit,
  rejectWithdrawal, requestWithdrawal, setTransactionPassword, verifyTransactionPassword, walletApply,
  type TxnKind,
} from './money';
import { tx, withConn } from './pool';

async function dispatch(fn: string, a: Record<string, unknown>): Promise<unknown> {
  const s = (k: string) => (a[k] == null ? null : String(a[k]));
  const n = (k: string) => Number(a[k]);
  const user = () => {
    const uid = s('p_user');
    if (!uid) throw new DbFail('no player', '42501');
    return uid;
  };

  switch (fn) {
    case 'wallet_apply':
      return tx((c) => walletApply(c, user(), s('p_kind') as TxnKind, n('p_amount'), s('p_ref')));
    case 'credit_bonus':
      return tx((c) => creditBonus(c, user(), s('p_kind') as TxnKind, n('p_amount'), s('p_ref') ?? '', n('p_turnover')));
    case 'adjust_balance':
      return adjustBalance(user(), n('p_amount'), s('p_note'));
    case 'approve_deposit':
      return approveDeposit(n('p_id'), s('p_note'));
    case 'reject_deposit':
      return rejectDeposit(n('p_id'), s('p_note'));
    case 'approve_withdrawal':
      return approveWithdrawal(n('p_id'), s('p_note'));
    case 'reject_withdrawal':
      return rejectWithdrawal(n('p_id'), s('p_note'));
    case 'request_withdrawal':
      return requestWithdrawal(user(), s('p_channel') ?? '', n('p_amount'), s('p_account_no') ?? '', s('p_password') ?? '');
    case 'pay_withdrawal_charge':
      return payWithdrawalCharge(n('p_id'), user(), n('p_charge'), s('p_channel'), s('p_trx'));
    case 'password_lock_left':
      return passwordLockLeft(user());
    case 'password_attempt':
      return passwordAttempt(user(), a.p_ok === true);
    case 'claim_promo':
      return claimPromo(user(), s('p_ref') ?? '', n('p_amount'), n('p_turnover'), n('p_limit'));
    case 'bonus_facts':
      return bonusFacts(user(), s('p_from') ?? '', s('p_to') ?? '');
    case 'account_block':
      return withConn((c) => blockOf(c, user()));
    case 'has_transaction_password':
      return hasTransactionPassword(user());
    case 'set_transaction_password':
      return setTransactionPassword(user(), s('p_new') ?? '', s('p_old'));
    case 'verify_transaction_password':
      return verifyTransactionPassword(user(), s('p_password') ?? '');
    default:
      throw new DbFail(`Could not find the function ${fn}`, 'PGRST202');
  }
}

export async function callRpc(fn: string, args: Record<string, unknown> = {}): Promise<QueryResult> {
  try {
    return { data: await dispatch(fn, args), error: null, count: null };
  } catch (e) {
    return { data: null, error: toDbError(e), count: null };
  }
}
