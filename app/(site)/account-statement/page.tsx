'use client';

import Link from 'next/link';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { KIND_LABEL, useLedger, when } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Every movement on the wallet, newest first, with the balance it left
    behind — the same rows the admin sees, read through RLS as the player. */
export default function AccountStatementPage() {
  const { ready, signedIn, rows } = useLedger(300);

  return (
    <>
      <PageHeader title="Account Statement" />

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
      {signedIn && rows?.length === 0 && <Empty glyph="🧾" text="No transactions yet." />}

      {signedIn && rows && rows.length > 0 && (
        <div className="hist">
          {rows.map((r) => (
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
