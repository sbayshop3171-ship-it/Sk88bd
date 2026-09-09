'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { useLedger, type LedgerRow } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';
import { useLightSheet } from '@/components/useLightSheet';

/* ============================================================
   Personal Report — the reference's name for Profit and Loss.

   A period, and what the wallet did in it. The reference offers
   Today, Yesterday, 7 days and a range, so those are the chips;
   every figure under them is summed from the ledger for the days
   in range, which is why it always agrees with Account Record.

   The reference footnotes its clock (GMT+8, where it is run).
   Ours says Bangladesh time, because that is the clock these
   days are cut on and a player reading "today" deserves to know
   whose today it is.
   ============================================================ */

type Preset = 'today' | 'yesterday' | '7d' | 'range';

/** yyyy-mm-dd in the browser's own day, not UTC's. */
const dayOf = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

const shift = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return dayOf(d);
};

export default function PersonalReportPage() {
  useLightSheet();
  const { ready, signedIn, rows } = useLedger(1000);

  const today = dayOf(new Date());
  const [preset, setPreset] = useState<Preset>('today');
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);

  const span = useMemo((): [string, string] => {
    if (preset === 'today') return [today, today];
    if (preset === 'yesterday') return [shift(-1), shift(-1)];
    if (preset === '7d') return [shift(-6), today];
    return [from, to];
  }, [preset, from, to, today]);

  const inRange = useMemo(
    () => (rows ?? []).filter((r) => {
      const day = r.created_at.slice(0, 10);
      return day >= span[0] && day <= span[1];
    }),
    [rows, span],
  );

  const sum = (kind: LedgerRow['kind']) =>
    inRange.filter((r) => r.kind === kind).reduce((n, r) => n + r.amount, 0);

  const deposit = sum('deposit');
  const withdraw = -sum('withdraw');
  const bet = -sum('bet');
  const win = sum('win');
  const bonus = sum('bonus');
  const rebate = sum('rebate');
  const net = win - bet + bonus + rebate;

  const lines: [string, number, boolean?][] = [
    ['Deposit', deposit],
    ['Withdrawal', withdraw],
    ['Bet amount', bet],
    ['Winnings', win],
    ['Bonus', bonus],
    ['Rebate', rebate],
    ['Profit and loss', net, true],
  ];

  const signed = (paisa: number) =>
    (paisa < 0 ? '−' : '') + money(toTaka(Math.abs(paisa || 0)), 2);

  return (
    <>
      <PageHeader title="Personal Report" />

      <div className="pr__chips scroll-x">
        {([['today', 'Today'], ['yesterday', 'Yesterday'], ['7d', '7-days']] as [Preset, string][])
          .map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={preset === key ? 'on' : ''}
              onClick={() => setPreset(key)}
            >
              {label}
            </button>
          ))}
        <label className={`pr__range${preset === 'range' ? ' on' : ''}`}>
          <input
            type="date" value={from} max={to}
            onChange={(e) => { setFrom(e.target.value); setPreset('range'); }}
          />
          <em>–</em>
          <input
            type="date" value={to} min={from} max={today}
            onChange={(e) => { setTo(e.target.value); setPreset('range'); }}
          />
        </label>
      </div>

      {ready && !signedIn && (
        <>
          <Empty glyph="📊" text="Log in to see your own report." />
          <div className="wallet-bar">
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        </>
      )}

      {signedIn && rows === null && <Empty glyph="📊" text="Loading…" />}

      {signedIn && rows && inRange.length === 0 && <Empty glyph="📊" text="No data" />}

      {signedIn && inRange.length > 0 && (
        <div className="pr__table">
          {lines.map(([label, value, total]) => (
            <div key={label} className={total ? 'is-total' : undefined}>
              <span>{label}</span>
              <b className={total ? (value >= 0 ? 'is-up' : 'is-down') : undefined}>{signed(value)}</b>
            </div>
          ))}
        </div>
      )}

      <p className="pr__note">
        <i aria-hidden>!</i> মনে রাখুন: উপরের হিসাব বাংলাদেশ সময় (GMT+6) অনুযায়ী।
      </p>
    </>
  );
}
