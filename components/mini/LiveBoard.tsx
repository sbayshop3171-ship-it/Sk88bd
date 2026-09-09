'use client';

import { useState } from 'react';
import FairPanel from '@/components/mini/FairPanel';
import type { RecentWin, Seat } from '@/components/mini/useLiveBoard';
import { money } from '@/lib/brand';
import { fmtX, type FairnessInfo } from '@/lib/mini-games';

const TABS = ['Live Bets', 'Top Bets', 'Fairness'] as const;

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
    <section className="lb">
      {recent.length > 0 && (
        <div className="lb-wins">
          <span className="lb-wins__tag">Recent wins</span>
          <div className="lb-wins__rail scroll-x">
            {recent.map((w) => (
              <span className="lb-wins__chip" key={w.id}>
                <b>{w.user}</b>
                <i>{fmtX(w.multiplier)}</i>
                <em>{money(w.win)}</em>
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="lb__tabs" role="tablist">
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
          <div className="lb__meta">
            <div className="lb__count">
              <i className="lb__dot" aria-hidden />
              <b>{players.toLocaleString('en-IN')}</b> playing now
            </div>
            <div className="lb__total">
              <b>{money(totalWin)}</b>
              <small>Won on the board</small>
            </div>
          </div>
          <div className="lb__fill"><i style={{ width: `${Math.round(share * 100)}%` }} /></div>

          <div className="lb-bets">
            <div className="lb-bets__head">
              <span>Player</span><span>Bet</span><span>x</span><span>Won</span>
            </div>
            <div className="lb-bets__scroll">
              {mine && (
                <div className={`lb-bets__row is-mine${mine.out ? ' is-out' : ''}`}>
                  <span className="lb-bets__u">You</span>
                  <span className="lb-bets__s">{money(mine.stake)}</span>
                  <span className="lb-bets__x">{mine.out ? fmtX(mine.multiplier) : '—'}</span>
                  <span className="lb-bets__w">
                    {mine.out ? money(Math.round(mine.stake * mine.multiplier)) : '—'}
                  </span>
                </div>
              )}
              {rows.map((s) => (
                <div className={`lb-bets__row${s.out ? ' is-out' : ''}`} key={s.id}>
                  <span className="lb-bets__u">{s.user}</span>
                  <span className="lb-bets__s">{money(s.stake)}</span>
                  <span className="lb-bets__x">{s.out ? fmtX(s.target) : '—'}</span>
                  <span className="lb-bets__w">{s.out ? money(Math.round(s.stake * s.target)) : '—'}</span>
                </div>
              ))}
              {seats.length === 0 && <div className="lb-bets__empty">Loading the board…</div>}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
