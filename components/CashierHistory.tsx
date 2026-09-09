'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from './AuthProvider';
import Empty from './Empty';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';

type Row = {
  id: number;
  channel_id: string;
  amount: number;
  state: 'pending' | 'approved' | 'rejected' | 'cancelled';
  admin_note: string | null;
  created_at: string;
};

const STATE_LABEL: Record<Row['state'], string> = {
  pending: 'Pending',
  approved: 'Approved',
  rejected: 'Rejected',
  cancelled: 'Cancelled',
};

/** The player's own deposit or withdrawal requests. RLS scopes the read to
    their rows, so this is a plain select with no user filter needed. */
export default function CashierHistory({
  table,
  emptyText,
  glyph,
}: {
  table: 'deposits' | 'withdrawals';
  emptyText: string;
  glyph: string;
}) {
  const { ready, backendReady, session, supabase } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    if (!supabase || !session) return;
    let live = true;

    void supabase
      .from(table)
      .select('id, channel_id, amount, state, admin_note, created_at')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => { if (live) setRows((data as Row[]) ?? []); });

    return () => { live = false; };
  }, [supabase, session, table]);

  if (!ready) return null;

  if (!backendReady || !session) {
    return (
      <>
        <Empty glyph={glyph} text={emptyText} />
        {backendReady && (
          <div className="note" style={{ margin: 12 }}>
            <Link href="/login">Log in</Link> to see your own records.
          </div>
        )}
      </>
    );
  }

  if (rows === null) return <Empty glyph={glyph} text="Loading…" />;
  if (rows.length === 0) return <Empty glyph={glyph} text={emptyText} />;

  return (
    <div className="hist">
      {rows.map((r) => (
        <div className="hist__row" key={r.id}>
          <div className="hist__main">
            <b>{money(toTaka(r.amount))}</b>
            <span className="hist__ch">{r.channel_id}</span>
          </div>
          <div className="hist__side">
            <span className={`hist__state hist__state--${r.state}`}>{STATE_LABEL[r.state]}</span>
            <small>{new Date(r.created_at).toLocaleString('en-GB', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}</small>
          </div>
          {r.admin_note && <p className="hist__note">{r.admin_note}</p>}
        </div>
      ))}
    </div>
  );
}
