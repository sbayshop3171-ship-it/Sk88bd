'use client';

import Link from 'next/link';
import { useState } from 'react';
import { money } from '@/lib/brand';
import {
  HOUSE_EDGE,
  MAX_PAYOUT_PAISA,
  MAX_STAKE_PAISA,
  MIN_STAKE_PAISA,
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
  children,
}: {
  game: MiniGameId;
  balance: number;
  history: Played[];
  fairness: FairnessInfo | null;
  clientSeed: string;
  onNewSeed: () => void;
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

      <div className="mg__foot">
        <button type="button" className="mg__fairbtn" onClick={() => setFairOpen((v) => !v)} aria-expanded={fairOpen}>
          🔒 প্রভাবলি ফেয়ার — RTP {Math.round((1 - HOUSE_EDGE) * 100)}%
          <span className={`cz-chev${fairOpen ? ' up' : ''}`} aria-hidden>⌃</span>
        </button>

        {fairOpen && (
          <div className="mg__fair">
            <p>
              বাজি ধরার <b>আগেই</b> সার্ভার একটি গোপন সিড বেছে নেয় আর তার SHA-256
              হ্যাশ আপনাকে দেখায়। ফলাফল বের হয় SHA-256(সার্ভার সিড : আপনার সিড :
              নন্স) থেকে। রাউন্ড শেষ হলে সার্ভার সিডটি খুলে দেওয়া হয় — আপনি নিজে
              হ্যাশ মিলিয়ে দেখতে পারেন ফলাফল আগে থেকেই ঠিক করা ছিল।
            </p>

            <label className="mg__seed">
              <span>আপনার সিড</span>
              <input value={clientSeed} readOnly />
              <button type="button" onClick={onNewSeed}>নতুন</button>
            </label>

            {fairness ? (
              <dl className="mg__proof">
                <div><dt>সার্ভার সিড হ্যাশ</dt><dd><code>{fairness.serverSeedHash}</code></dd></div>
                {fairness.serverSeed && (
                  <div><dt>সার্ভার সিড (প্রকাশিত)</dt><dd><code>{fairness.serverSeed}</code></dd></div>
                )}
                <div><dt>আপনার সিড</dt><dd><code>{fairness.clientSeed}</code></dd></div>
                <div><dt>নন্স</dt><dd><code>{fairness.nonce}</code></dd></div>
              </dl>
            ) : (
              <p className="mg__hint">একটি রাউন্ড খেললে এখানে তার প্রমাণ দেখা যাবে।</p>
            )}

            <p className="mg__hint">
              বাজি {money(MIN_STAKE_PAISA / 100)} — {money(MAX_STAKE_PAISA / 100)} ·
              এক রাউন্ডে সর্বোচ্চ জয় {money(MAX_PAYOUT_PAISA / 100)}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
