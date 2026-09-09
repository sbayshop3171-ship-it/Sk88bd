'use client';

import Link from 'next/link';
import { useState } from 'react';
import FairPanel from '@/components/mini/FairPanel';
import { money } from '@/lib/brand';
import {
  HOUSE_EDGE,
  MINI_GAMES,
  fmtX,
  type FairnessInfo,
  type MiniGameId,
} from '@/lib/mini-games';
import type { Played } from './useMiniGame';

/**
 * The frame every one of the house's games sits in: who you are playing,
 * what you have, what the last rounds did, and the commit–reveal receipt for
 * the round just settled. Only the board in the middle differs.
 */
export default function GameShell({
  game,
  balance,
  history,
  fairness,
  clientSeed,
  onNewSeed,
  hideFair,
  runs,
  children,
}: {
  game: MiniGameId;
  balance: number;
  history: Played[];
  fairness: FairnessInfo | null;
  clientSeed: string;
  onNewSeed: () => void;
  /** the board shows the commit–reveal receipt itself, so the strip at the
      foot would only repeat it */
  hideFair?: boolean;
  /** A game whose pills should read something other than the payout
      multiplier supplies them itself — Limbo's strip shows the number that
      was actually drawn, which is the interesting figure on a loss too. */
  runs?: { id: string; label: string; won: boolean }[];
  children: React.ReactNode;
}) {
  const def = MINI_GAMES[game];
  const [fairOpen, setFairOpen] = useState(false);
  const pills = runs ?? history.map((h) => ({
    id: h.id, label: h.won ? fmtX(h.multiplier) : '—', won: h.won,
  }));

  return (
    <div className="mg" style={{ ['--mg-accent' as string]: def.accent }}>
      <header className="mg__top">
        <Link href="/" className="mg__back" aria-label="Back">‹</Link>
        <div className="mg__id">
          <b>{def.name}</b>
          <small>{def.tagline}</small>
        </div>
        <div className="mg__bal">
          <small>Balance</small>
          <b>{money(balance, 2)}</b>
        </div>
      </header>

      {pills.length > 0 && (
        <div className="mg__runs scroll-x">
          {pills.map((r) => (
            <span key={r.id} className={`mg__run${r.won ? ' win' : ' lose'}`}>
              {r.label}
            </span>
          ))}
        </div>
      )}

      {children}

      {!hideFair && (
      <div className="mg__foot">
        <button type="button" className="mg__fairbtn" onClick={() => setFairOpen((v) => !v)} aria-expanded={fairOpen}>
          🔒 Provably fair — RTP {Math.round((1 - HOUSE_EDGE) * 100)}%
          <span className={`cz-chev${fairOpen ? ' up' : ''}`} aria-hidden>⌃</span>
        </button>

        {fairOpen && <FairPanel fairness={fairness} clientSeed={clientSeed} onNewSeed={onNewSeed} />}
      </div>
      )}
    </div>
  );
}
