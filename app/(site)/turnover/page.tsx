'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useLedger } from '@/components/useLedger';
import { useBonus } from '@/components/useBonus';
import { useLightSheet } from '@/components/useLightSheet';
import { useUI } from '@/components/UIProvider';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { VIP_TIERS } from '@/lib/promotions';
import { t } from '@/lib/strings';

/* ============================================================
   Rebate.

   A rebate is a share of what was staked, so the figure a player
   wants is what they staked — per product, for a day. That is
   read from the ledger here rather than kept anywhere, which is
   why it always agrees with Betting Record.

   Claiming is real: the share, the floor and whether it runs at
   all are the operator's, set at /admin/bonus, and the server
   works out what is owed and writes it — this screen only asks.
   It pays for a finished day, so the figure cannot move while
   somebody is looking at it.

   Turnover — the wagering a bonus has left to run — is the other
   thing this screen answers, and it is real, so it stays at the
   bottom where somebody who came looking for it will find it.
   ============================================================ */

const CATS: [string, string, string][] = [
  ['slot', 'Slot', 'is-indigo'],
  ['live', 'Live', 'is-violet'],
  ['poker', 'Poker', 'is-teal'],
  ['fish', 'Fish', 'is-pink'],
  ['sports', 'Sports', 'is-coral'],
];

const dayOf = (d: Date) =>
  new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);

export default function RebatePage() {
  useLightSheet();
  const { wallet, profile } = useAuth();
  const { ready, signedIn, rows } = useLedger(1000);
  const { toast } = useUI();
  const { state, busy, claim } = useBonus();

  const today = dayOf(new Date());
  /* The engine pays for a finished day, so the screen opens on the one it
     will actually pay for rather than on a total that is still moving. */
  const [day, setDay] = useState('');
  const payFor = state?.rebate.day ?? '';
  const shown = day || payFor || today;
  const [tab, setTab] = useState<'manual' | 'history'>('manual');

  /* Everything we settle runs on our own engine, which the lobby files under
     Slot — so that is the only line with a figure in it today. The rest are
     drawn because they are what a player expects to count, and they fill the
     day an aggregator does. */
  const staked = useMemo(() => {
    const onDay = (rows ?? []).filter(
      (r) => r.kind === 'bet' && r.created_at.slice(0, 10) === shown,
    );
    return -onDay.reduce((n, r) => n + r.amount, 0);
  }, [rows, shown]);

  const perCat: Record<string, number> = { slot: staked, live: 0, poker: 0, fish: 0, sports: 0 };
  const total = Object.values(perCat).reduce((a, b) => a + b, 0);

  const level = profile?.vip_level ?? 0;
  const rate = level > 0 ? VIP_TIERS[Math.min(level, VIP_TIERS.length) - 1].rebate : '0.3%';

  const claimable = Boolean(
    signedIn && state?.rebate.active && !state.rebate.claimed && (state.rebate.amount ?? 0) > 0,
  );

  /* Every claim is a ledger row, so the history is the ledger read back
     rather than a second list that could disagree with it. */
  const history = useMemo(
    () => (rows ?? []).filter((r) => r.kind === 'rebate' && r.ref?.startsWith('rebate:')),
    [rows],
  );

  const need = wallet?.turnover_need ?? 0;
  const done = wallet?.turnover_done ?? 0;
  const pct = need > 0 ? Math.min(100, Math.round((done / need) * 100)) : 0;

  return (
    <>
      <PageHeader title="Rebate" />

      <div className="rb__tabs">
        <button type="button" className={tab === 'manual' ? 'on' : ''} onClick={() => setTab('manual')}>Manual Rebate</button>
        <button type="button" className={tab === 'history' ? 'on' : ''} onClick={() => setTab('history')}>Rebate History</button>
      </div>

      {ready && !signedIn && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      {tab === 'manual' ? (
        <div className="rb">
          <div className="rb__row is-date">
            <span>Date</span>
            <input type="date" value={shown} max={today} onChange={(e) => setDay(e.target.value)} />
          </div>
          {CATS.map(([key, label, tone]) => (
            <div className="rb__row" key={key}>
              <span className={tone}>{label}</span>
              <b>{money(toTaka(perCat[key]), 2)}</b>
            </div>
          ))}
          <div className="rb__row is-total">
            <span>Total</span>
            <b>{money(toTaka(total), 2)}</b>
          </div>

          <p className="rb__rate">আপনার স্তরে রিবেট হার <b>{rate}</b> — উপরের অঙ্ক ওই দিনের মোট বাজি। ক্লেইম হয় শেষ হওয়া দিনের ({payFor || '—'}) জন্য।</p>

          <button
            type="button"
            className={`rb__claim${claimable ? ' is-on' : ''}`}
            disabled={!claimable || busy !== null}
            onClick={async () => {
              const reply = await claim('rebate');
              toast(reply.ok
                ? `${money(toTaka(reply.amount))} যোগ হয়েছে`
                : reply.message ?? 'নেওয়া গেল না');
            }}
          >
            {state?.rebate.claimed
              ? `${payFor} এর রিবেট নেওয়া হয়েছে`
              : claimable
                ? `Claim ${money(toTaka(state?.rebate.amount ?? 0))}`
                : 'Claim'}
          </button>

          {signedIn && need > 0 && (
            <div className="tov">
              <div className="tov__hd"><span>Turnover in progress</span><b>{pct}%</b></div>
              <div className="tov__bar"><i style={{ width: `${pct}%` }} /></div>
              <div className="tov__row"><span>Completed</span><b>{money(toTaka(done))}</b></div>
              <div className="tov__row"><span>Required</span><b>{money(toTaka(need))}</b></div>
              <div className="tov__row"><span>Remaining</span><b>{money(toTaka(Math.max(0, need - done)))}</b></div>
            </div>
          )}

          <p className="pr__note">
            <i aria-hidden>!</i> মনে রাখুন: উপরের হিসাব বাংলাদেশ সময় (GMT+6) অনুযায়ী।
          </p>
        </div>
      ) : (
        history.length === 0 ? (
          <p className="ml__empty">No data</p>
        ) : (
          <div className="rb">
            {history.map((r) => (
              <div className="rb__row" key={r.id}>
                <span className="is-indigo">{r.ref?.split(':')[1] ?? '—'}</span>
                <b>{money(toTaka(r.amount), 2)}</b>
              </div>
            ))}
          </div>
        )
      )}
    </>
  );
}
