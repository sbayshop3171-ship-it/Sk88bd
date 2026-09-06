'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Wordmark } from './Header';

/** How long the branded curtain stays up before the game shows. */
export const GAME_LOADING_MS = 3000;

/**
 * The three-second curtain every game opens behind: the wordmark, a filling
 * bar and a percentage, then a fade. The game itself is mounted underneath
 * the whole time, so its own assets load while the curtain is up and it is
 * usually ready the moment the curtain lifts.
 */
export default function GameLoading({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<'on' | 'fade' | 'off'>('on');
  const [pct, setPct] = useState(0);
  /* The player asks the browser for real fullscreen as soon as it mounts. In
     that mode only the fullscreen element paints, so the curtain moves inside
     it — otherwise it would sit hidden underneath for the whole three
     seconds. */
  const [host, setHost] = useState<Element | null>(null);

  useEffect(() => {
    const sync = () => setHost(document.fullscreenElement);
    sync();
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / GAME_LOADING_MS);
      // quick off the line, easing into 100 — reads as real work, not a timer
      setPct(Math.round(100 * (1 - Math.pow(1 - p, 2.2))));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const fade = setTimeout(() => setPhase('fade'), GAME_LOADING_MS);
    const off = setTimeout(() => setPhase('off'), GAME_LOADING_MS + 450);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fade);
      clearTimeout(off);
    };
  }, []);

  const curtain = phase !== 'off' && (
    <div className={`gload${phase === 'fade' ? ' gload--out' : ''}`} aria-live="polite" aria-busy={phase === 'on'}>
      <span className="gload__glow" aria-hidden />
      <Wordmark />
      <span className="gload__ring" aria-hidden><i /></span>
      <span className="gload__bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
      <p className="gload__txt">গেম লোড হচ্ছে… <b>{pct}%</b></p>
    </div>
  );

  return (
    <>
      {children}
      {host ? createPortal(curtain, host) : curtain}
    </>
  );
}
