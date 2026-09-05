'use client';

import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';

/** One row of the player's own ledger. Amounts are paisa and signed:
    credits positive, debits negative — exactly as `transactions` stores them. */
export type LedgerRow = {
  id: number;
  kind: 'deposit' | 'withdraw' | 'bet' | 'win' | 'bonus' | 'rebate' | 'adjust';
  amount: number;
  balance_after: number;
  ref: string | null;
  created_at: string;
};

export const KIND_LABEL: Record<LedgerRow['kind'], string> = {
  deposit: 'ডিপোজিট',
  withdraw: 'উইথড্র',
  bet: 'বেট',
  win: 'জয়',
  bonus: 'বোনাস',
  rebate: 'রিবেট',
  adjust: 'সমন্বয়',
};

/**
 * The signed-in player's transactions, newest first. RLS scopes the select to
 * their own rows, so no user filter is needed here. `rows` is null until the
 * first load finishes, so screens can tell "loading" from "empty".
 */
export function useLedger(limit = 200) {
  const { ready, session, supabase } = useAuth();
  const [rows, setRows] = useState<LedgerRow[] | null>(null);

  useEffect(() => {
    if (!supabase || !session) return;
    let live = true;

    void supabase
      .from('transactions')
      .select('id, kind, amount, balance_after, ref, created_at')
      .order('id', { ascending: false })
      .limit(limit)
      .then(({ data }) => { if (live) setRows((data as LedgerRow[]) ?? []); });

    return () => { live = false; };
  }, [supabase, session, limit]);

  return { ready, signedIn: ready && Boolean(session), rows };
}

/** Sum of one kind, in paisa (signed as stored). */
export const sumKind = (rows: LedgerRow[], kind: LedgerRow['kind']) =>
  rows.filter((r) => r.kind === kind).reduce((total, r) => total + r.amount, 0);

export const when = (iso: string) =>
  new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
