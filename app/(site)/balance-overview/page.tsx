'use client';

import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { sumKind, useLedger } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Headline figures for the player: what is in the wallet now, and what has
    flowed through it. Everything below the first row is summed from the
    ledger, so it always agrees with the account statement. */
export default function BalanceOverviewPage() {
  const { wallet } = useAuth();
  const { ready, signedIn, rows } = useLedger(1000);

  const ledger = rows ?? [];
  const deposits = sumKind(ledger, 'deposit');
  // debits are stored negative; a rejected withdrawal comes back as a credit
  // under the same kind, so the net is what actually left the wallet
  const withdrawn = -sumKind(ledger, 'withdraw');
  const bets = -sumKind(ledger, 'bet');
  const wins = sumKind(ledger, 'win');
  const profit = wins - bets;

  // `-0` slips out of the sums when a debit and its refund cancel; `|| 0`
  // squashes it so the card never reads "৳-0".
  const fmt = (paisa: number) => money(toTaka(paisa || 0));
  const signed = (paisa: number) => (paisa < 0 ? '−' : '') + money(toTaka(Math.abs(paisa)));

  const cards: [string, string, string?][] = [
    ['Main balance', fmt(wallet?.balance ?? 0)],
    ['Bonus balance', fmt(wallet?.bonus_balance ?? 0)],
    ['Total deposits', fmt(deposits)],
    ['Total withdrawals', fmt(withdrawn)],
    ['Total bets', fmt(bets)],
    ['Profit / loss', signed(profit), profit >= 0 ? 'is-up' : 'is-down'],
  ];

  return (
    <>
      <PageHeader title="Balance Overview" />

      {ready && !signedIn && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="stat" style={{ gridTemplateColumns: 'repeat(2,1fr)' }}>
        {cards.map(([label, value, cls]) => (
          <div key={label} className={cls}>
            <b>{value}</b>
            <small>{label}</small>
          </div>
        ))}
      </div>

      {signedIn && (
        <div className="wallet-bar">
          <Link href="/account-statement" className="btn btn--ghost" style={{ padding: 12 }}>
            Full statement
          </Link>
          <Link href="/deposit" className="btn btn--gold" style={{ padding: 12 }}>{t.deposit}</Link>
        </div>
      )}
    </>
  );
}
