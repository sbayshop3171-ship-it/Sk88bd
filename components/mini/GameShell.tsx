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
  children: React.ReactNode;
}) {
  const def = MINI_GAMES[game];
  const [fairOpen, setFairOpen] = useState(false);

  return (
    <div className="mg" style={{ ['--mg-accent' as string]: def.accent }}>
      <header className="mg__top">
        <Link href="/" className="mg__back" aria-label="পিছনে">‹</Link>
        <div className="mg__id">
          <b>{def.name}</b>
          <small>{def.tagline}</small>
        </div>
        <div className="mg__bal">
          <small>ব্যালেন্স</small>
          <b>{money(balance, 2)}</b>
        </div>
      </header>

      {history.length > 0 && (
        <div className="mg__runs scroll-x">
          {history.map((h) => (
            <span key={h.id} className={`mg__run${h.won ? ' win' : ' lose'}`}>
              {h.won ? fmtX(h.multiplier) : '—'}
            </span>
          ))}
        </div>
      )}

      {children}

      {!hideFair && (
      <div className="mg__foot">
        <button type="button" className="mg__fairbtn" onClick={() => setFairOpen((v) => !v)} aria-expanded={fairOpen}>
          🔒 প্রভাবলি ফেয়ার — RTP {Math.round((1 - HOUSE_EDGE) * 100)}%
          <span className={`cz-chev${fairOpen ? ' up' : ''}`} aria-hidden>⌃</span>
        </button>

        {fairOpen && <FairPanel fairness={fairness} clientSeed={clientSeed} onNewSeed={onNewSeed} />}
      </div>
      )}
    </div>
  );
}
