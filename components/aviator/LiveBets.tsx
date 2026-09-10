'use client';

import { useMemo, useState } from 'react';
import { fmtX, type Phase } from '@/lib/aviator';
import { fmtAmt } from './BetPanel';

/** Rows drawn on screen. The board's head count (1,000+) is the crowd;
    the table is the slice of it that fits, scrolled. */
const VISIBLE_ROWS = 40;

const STAKES = [50, 100, 150, 200, 250, 300, 500, 500, 600, 800, 1000, 1000, 1200, 1500, 2000, 2500, 3000, 5000];

const TABS = ['All Bets', 'Previous', 'Top'] as const;

type Seat = { user: string; stake: number; target: number };

/** Small deterministic PRNG so a round's table never reshuffles mid-flight. */
function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A fresh table of masked players for the round: their stakes and the
    multiplier each one will cash out at, weighted towards early exits the
    way a real board is. */
function seatsFor(roundId: number): Seat[] {
  const rnd = mulberry32(roundId * 7919 + 17);
  return Array.from({ length: VISIBLE_ROWS }, () => ({
    user: `*******${String(Math.floor(rnd() * 1000)).padStart(3, '0')}`,
    stake: STAKES[Math.floor(rnd() * STAKES.length)],
    target: Math.round((1.05 + Math.pow(rnd(), 2.2) * 9) * 100) / 100,
  }));
}

export default function LiveBets({
  phase,
  multiplier,
  players,
  roundId,
}: {
  phase: Phase;
  multiplier: number;
  /** heads on the board this round — the same figure as the canvas pill */
  players: number;
  roundId?: number | null;
}) {
  const [tab, setTab] = useState(0);
  const seats = useMemo(() => seatsFor(roundId ?? 0), [roundId]);
  const rows = tab === 2 ? [...seats].sort((a, b) => b.stake - a.stake) : seats;

  const settled = phase === 'flying' || phase === 'crashed';
  const won = seats.filter((s) => settled && multiplier >= s.target);
  const share = won.length / seats.length;

  /* The visible rows stand in for the whole crowd: however many of them have
     cashed out, the same share of the head count has, and the round's total
     win is their winnings scaled up to the crowd. */
  const cashed = Math.round(share * players);
  const scale = seats.length ? players / seats.length : 0;
  const totalWin = Math.round(won.reduce((sum, s) => sum + s.stake * s.target, 0) * scale);

  return (
    <section className="sec av-live">
      {/* All Bets / Previous / Top — the reference board's tab bar */}
      <div className="av-live__tabs" role="tablist">
        {TABS.map((label, i) => (
          <button
            key={label} type="button" role="tab" aria-selected={tab === i}
            className={tab === i ? 'on' : ''} onClick={() => setTab(i)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* the board's sunk summary card: three heads, cashed-out / seats, the
          round's total win on the right, and a fill bar along the foot */}
      <div className="av-live__meta">
        <div className="av-live__heads" aria-hidden><i /><i /><i /></div>
        <div className="av-live__count">
          <b>{(settled ? cashed : players).toLocaleString('en-US')}/{players.toLocaleString('en-US')}</b> Bets
        </div>
        <div className="av-live__total">
          <b>{fmtAmt(totalWin)}</b>
          <small>Total win BDT</small>
        </div>
        <div className="av-live__fill"><i style={{ width: `${Math.round(share * 100)}%` }} /></div>
      </div>

      <div className="av-bets">
        <div className="av-bets__head">
          <span>Player</span><span>Bet BDT</span><span>X</span><span>Win BDT</span>
        </div>
        <div className="av-bets__scroll">
          {rows.map((s, i) => {
            const out = settled && multiplier >= s.target;
            return (
              <div className={`av-bets__row${out ? ' is-out' : ''}`} key={`${s.user}-${i}`}>
                <span className="av-bets__u"><i aria-hidden />{s.user}</span>
                <span className="av-bets__s">{fmtAmt(s.stake)}</span>
                <span className="av-bets__x">{out ? <em>{fmtX(s.target)}</em> : ''}</span>
                <span className="av-bets__w">{out ? fmtAmt(Math.round(s.stake * s.target)) : ''}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
