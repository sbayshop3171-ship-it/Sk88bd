'use client';

import { useState } from 'react';
import FairPanel from '@/components/mini/FairPanel';
import type { RecentWin, Seat } from '@/components/mini/useLiveBoard';
import { money } from '@/lib/brand';
import { fmtX, type FairnessInfo } from '@/lib/mini-games';

const TABS = ['লাইভ বেট', 'টপ বেট', 'ফেয়ারনেস'] as const;

/** the player's own seat, when they have one in the air or just settled */
export interface MyRow {
  stake: number;
  multiplier: number;
  out: boolean;
}

/**
 * What sits under the JetX board: who is on it right now, what the last
 * winners took, and — on its own tab rather than a strip at the foot — the
 * commit–reveal receipt for the round just played.
 */
export default function LiveBoard({
  players,
  seats,
  recent,
  mine,
  fairness,
  clientSeed,
  onNewSeed,
}: {
  players: number;
  seats: Seat[];
  recent: RecentWin[];
  mine: MyRow | null;
  fairness: FairnessInfo | null;
  clientSeed: string;
  onNewSeed: () => void;
}) {
  const [tab, setTab] = useState(0);

  const out = seats.filter((s) => s.out);
  const share = seats.length ? out.length / seats.length : 0;
  /* What the seats on screen have taken. Deliberately not scaled up to the
     head count: a number in the lakhs beside forty rows reads as invented. */
  const totalWin = Math.round(out.reduce((sum, s) => sum + s.stake * s.target, 0));

  const rows = tab === 1 ? [...seats].sort((a, b) => b.stake - a.stake) : seats;

  return (
    <section className="jx-live">
      {recent.length > 0 && (
        <div className="jx-wins">
          <span className="jx-wins__tag">সাম্প্রতিক জয়</span>
          <div className="jx-wins__rail scroll-x">
            {recent.map((w) => (
              <span className="jx-wins__chip" key={w.id}>
                <b>{w.user}</b>
                <i>{fmtX(w.multiplier)}</i>
                <em>{money(w.win)}</em>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="jx-live__tabs" role="tablist">
        {TABS.map((label, i) => (
          <button
            key={label}
            type="button"
            role="tab"
            aria-selected={tab === i}
            className={tab === i ? 'on' : undefined}
            onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 2 ? (
        <FairPanel fairness={fairness} clientSeed={clientSeed} onNewSeed={onNewSeed} />
      ) : (
        <>
          <div className="jx-live__meta">
            <div className="jx-live__count">
              <i className="jx-live__dot" aria-hidden />
              <b>{players.toLocaleString('en-IN')}</b> জন এখন খেলছে
            </div>
            <div className="jx-live__total">
              <b>{money(totalWin)}</b>
              <small>বোর্ডে জেতা</small>
            </div>
          </div>
          <div className="jx-live__fill"><i style={{ width: `${Math.round(share * 100)}%` }} /></div>

          <div className="jx-bets">
            <div className="jx-bets__head">
              <span>প্লেয়ার</span><span>বাজি</span><span>x</span><span>জিত</span>
            </div>
            <div className="jx-bets__scroll">
              {mine && (
                <div className={`jx-bets__row is-mine${mine.out ? ' is-out' : ''}`}>
                  <span className="jx-bets__u">আপনি</span>
                  <span className="jx-bets__s">{money(mine.stake)}</span>
                  <span className="jx-bets__x">{mine.out ? fmtX(mine.multiplier) : '—'}</span>
                  <span className="jx-bets__w">
                    {mine.out ? money(Math.round(mine.stake * mine.multiplier)) : '—'}
                  </span>
                </div>
              )}
              {rows.map((s) => (
                <div className={`jx-bets__row${s.out ? ' is-out' : ''}`} key={s.id}>
                  <span className="jx-bets__u">{s.user}</span>
                  <span className="jx-bets__s">{money(s.stake)}</span>
                  <span className="jx-bets__x">{s.out ? fmtX(s.target) : '—'}</span>
                  <span className="jx-bets__w">{s.out ? money(Math.round(s.stake * s.target)) : '—'}</span>
                </div>
              ))}
              {seats.length === 0 && <div className="jx-bets__empty">বোর্ড লোড হচ্ছে…</div>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
