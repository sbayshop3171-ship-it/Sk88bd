'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import Empty from '@/components/Empty';
import PageHeader from '@/components/PageHeader';
import { useLedger, when, type LedgerRow } from '@/components/useLedger';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { t } from '@/lib/strings';

type Bet = {
  key: string;
  round: string;
  stake: number;
  payout: number;
  multiplier: number | null;
  at: string;
  settled: boolean;
};

/**
 * Rebuilds bets from the ledger. A bet is the `bet` debit with ref
 * `aviator:<round>:<slot>`; its `win` credit carries the same prefix plus the
 * multiplier. No win row means the round busted — or is still flying, which
 * the "settled" flag leaves open for the most recent one.
 */
function pairBets(rows: LedgerRow[]): Bet[] {
  const wins = new Map<string, LedgerRow>();
  for (const r of rows) {
    if (r.kind !== 'win' || !r.ref) continue;
    // aviator:91:0:1.08x  →  aviator:91:0
    wins.set(r.ref.split(':').slice(0, 3).join(':'), r);
  }

  return rows
    .filter((r) => r.kind === 'bet' && r.ref?.startsWith('aviator:'))
    .map((r) => {
      const win = wins.get(r.ref!);
      const m = win?.ref?.split(':')[3];
      return {
        key: String(r.id),
        round: r.ref!.split(':')[1],
        stake: -r.amount,
        payout: win?.amount ?? 0,
        multiplier: m ? parseFloat(m) : null,
        at: r.created_at,
        settled: Boolean(win) || Date.now() - Date.parse(r.created_at) > 60_000,
      };
    });
}

export default function BetsHistoryPage() {
  const { ready, signedIn, rows } = useLedger(500);
  const bets = useMemo(() => pairBets(rows ?? []), [rows]);

  const staked = bets.reduce((s, b) => s + b.stake, 0);
  const won = bets.reduce((s, b) => s + b.payout, 0);

  return (
    <>
      <PageHeader title="বেটিং রেকর্ড" />

      {ready && !signedIn && (
        <>
          <Empty glyph="📋" text="নিজের বেট দেখতে লগইন করুন।" />
          <div className="wallet-bar">
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        </>
      )}

      {signedIn && rows === null && <Empty glyph="📋" text="লোড হচ্ছে…" />}
      {signedIn && rows && bets.length === 0 && (
        <>
          <Empty glyph="📋" text="এখনো কোনো বেট রেকর্ড নেই।" />
          <div style={{ margin: 12 }}>
            <Link href="/game/aviator" className="btn btn--gold btn--block">Aviator খেলুন</Link>
          </div>
        </>
      )}

      {signedIn && bets.length > 0 && (
        <>
          <div className="stat">
            <div><b>{bets.length}</b><small>মোট বেট</small></div>
            <div><b>{money(toTaka(staked))}</b><small>মোট স্টেক</small></div>
            <div className={won - staked >= 0 ? 'is-up' : 'is-down'}>
              <b>{(won - staked < 0 ? '−' : '+') + money(toTaka(Math.abs(won - staked)))}</b>
              <small>নিট</small>
            </div>
          </div>

          <div className="hist">
            {bets.map((b) => (
              <div className="hist__row" key={b.key}>
                <div className="hist__main">
                  <b className={b.payout > 0 ? 'is-up' : b.settled ? 'is-down' : ''}>
                    {b.payout > 0 ? `+${money(toTaka(b.payout), 2)}` : b.settled ? `−${money(toTaka(b.stake), 2)}` : 'চলছে…'}
                  </b>
                  <span className="hist__ch">Aviator · রাউন্ড #{b.round}</span>
                </div>
                <div className="hist__side">
                  <span className={`hist__state ${b.payout > 0 ? 'hist__state--approved' : b.settled ? 'hist__state--rejected' : 'hist__state--pending'}`}>
                    {b.payout > 0 ? `${b.multiplier?.toFixed(2)}x` : b.settled ? 'উড়ে গেছে' : 'চলছে'}
                  </span>
                  <small>{when(b.at)}</small>
                </div>
                <p className="hist__note">স্টেক {money(toTaka(b.stake))}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  );
}
