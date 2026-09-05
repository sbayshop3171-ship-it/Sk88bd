'use client';

import { useState } from 'react';
import { money } from '@/lib/brand';
import { fmtX, type Phase } from '@/lib/aviator';

/** Sample table of other players. Real rows arrive from Supabase once
    bets are persisted; the shape here is what that query will return. */
const SEATS = [
  { user: '*******418', stake: 500 },
  { user: '*******902', stake: 1200 },
  { user: '*******147', stake: 250 },
  { user: '*******660', stake: 3000 },
  { user: '*******035', stake: 800 },
  { user: '*******571', stake: 150 },
  { user: '*******284', stake: 2000 },
  { user: '*******719', stake: 600 },
];

const TABS = ['সব বেট', 'আগের', 'টপ'] as const;

/** Deterministic per-seat target, so the table does not reshuffle each frame. */
const targetFor = (i: number) => 1.2 + ((i * 37) % 45) / 10;

export default function LiveBets({ phase, multiplier }: { phase: Phase; multiplier: number }) {
  const [tab, setTab] = useState(0);
  const rows = tab === 2 ? [...SEATS].sort((a, b) => b.stake - a.stake) : SEATS;

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

      <div className="av-live__count">
        <b>{SEATS.length}</b> জন বেট করেছে
      </div>

      <div className="av-bets">
        <div className="av-bets__head">
          <span>প্লেয়ার</span><span>বেট</span><span>x</span><span>জিত</span>
        </div>
        {rows.map((s, i) => {
          const target = targetFor(i);
          const out = (phase === 'flying' || phase === 'crashed') && multiplier >= target;
          return (
            <div className={`av-bets__row${out ? ' is-out' : ''}`} key={s.user}>
              <span className="av-bets__u">{s.user}</span>
              <span className="av-bets__s">{money(s.stake)}</span>
              <span className="av-bets__x">{out ? fmtX(target) : '—'}</span>
              <span className="av-bets__w">{out ? money(Math.round(s.stake * target)) : '—'}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
