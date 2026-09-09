'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { KIND_LABEL, useLedger, when } from '@/components/useLedger';
import { useAuth } from '@/components/AuthProvider';
import { useLightSheet } from '@/components/useLightSheet';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/* ============================================================
   Account Record.

   Every movement on the wallet, newest first, with the balance
   it left behind — the same rows the admin sees, read through
   RLS as the player.

   The reference puts three controls over it: the kind of entry,
   the days it covers, and a box holding the account the rows
   belong to. The third is not a filter there and is not one here
   — a player has one account — but it answers the question the
   screen raises, which is "whose statement am I reading".
   ============================================================ */

const dayOf = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayOf(d);
};

export default function AccountStatementPage() {
  useLightSheet();
  const { profile } = useAuth();
  const { ready, signedIn, rows } = useLedger(300);

  const today = dayOf(new Date());
  const [kind, setKind] = useState('all');
  const [from, setFrom] = useState(shift(-6));
  const [to, setTo] = useState(today);

  const kinds = useMemo(() => {
    const seen = new Set<string>();
    for (const r of rows ?? []) seen.add(r.kind);
    return [...seen];
  }, [rows]);

  const shown = useMemo(() => (rows ?? []).filter((r) => {
    if (kind !== 'all' && r.kind !== kind) return false;
    const day = r.created_at.slice(0, 10);
    return day >= from && day <= to;
  }), [rows, kind, from, to]);

  return (
    <>
      <PageHeader title="Account Record" />

      <div className="ar__filters">
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">All</option>
          {kinds.map((k) => (
            <option key={k} value={k}>{KIND_LABEL[k as keyof typeof KIND_LABEL] ?? k}</option>
          ))}
        </select>
        <label className="ar__range">
          <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          <em>–</em>
          <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} />
        </label>
        <span className="ar__who">{profile?.phone ?? '—'}</span>
      </div>

      {ready && !signedIn && (
        <>
          <Empty glyph="🧾" text="Log in to see your own transactions." />
          <div className="wallet-bar">
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        </>
      )}

      {signedIn && rows === null && <Empty glyph="🧾" text="Loading…" />}
      {signedIn && rows && shown.length === 0 && <Empty glyph="🧾" text="No data" />}

      {signedIn && shown.length > 0 && (
        <div className="hist">
          {shown.map((r) => (
            <div className="hist__row" key={r.id}>
              <div className="hist__main">
                <b className={r.amount >= 0 ? 'is-up' : 'is-down'}>
                  {r.amount >= 0 ? '+' : '−'}{money(toTaka(Math.abs(r.amount)), 2)}
                </b>
                <span className="hist__ch">{KIND_LABEL[r.kind]}</span>
              </div>
              <div className="hist__side">
                <span className="hist__after">Balance {money(toTaka(r.balance_after), 2)}</span>
                <small>{when(r.created_at)}</small>
              </div>
              {r.ref && <p className="hist__note">{r.ref}</p>}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
