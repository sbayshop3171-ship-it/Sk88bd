'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import AviatorCurtain from './aviator/AviatorCurtain';
import { Wordmark } from './Header';

/** Which curtain a game opens behind. */
export type GameCurtain = 'house' | 'aviator';

/** How long each curtain stays up before the game shows. Aviator's runs
    shorter: it plays the stamp and a connect, and hands the partners card to
    the board itself. */
const CURTAIN_MS: Record<GameCurtain, number> = { house: 3000, aviator: 2600 };

/** How long the house curtain stays up. */
export const GAME_LOADING_MS = CURTAIN_MS.house;

/**
 * The three-second curtain every game opens behind: the wordmark, a filling
 * bar and a percentage, then a fade. The game itself is mounted underneath
 * the whole time, so its own assets load while the curtain is up and it is
 * usually ready the moment the curtain lifts.
 *
 * A game may ask for its own curtain with `skin` — Aviator opens on its own
 * title card. The timing below is shared either way.
 */
export default function GameLoading({
  children,
  skin = 'house',
}: {
  children: React.ReactNode;
  skin?: GameCurtain;
}) {
  const [phase, setPhase] = useState<'on' | 'fade' | 'off'>('on');
  /* One piece of state, advanced every frame: how far through the curtain we
     are, 0→1 and linear. The percentage the house bar shows is an eased read
     of it, and Aviator's beats are cut from it directly. */
  const [t, setT] = useState(0);
  const pct = Math.round(100 * (1 - Math.pow(1 - t, 2.2)));
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
    const total = CURTAIN_MS[skin];
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / total);
      setT(p);
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    const fade = setTimeout(() => setPhase('fade'), total);
    const off = setTimeout(() => setPhase('off'), total + 450);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(fade);
      clearTimeout(off);
    };
  }, [skin]);

  const curtain = phase !== 'off' && (
    skin === 'aviator' ? (
      <AviatorCurtain t={t} out={phase === 'fade'} />
    ) : (
    <div className={`gload${phase === 'fade' ? ' gload--out' : ''}`} aria-live="polite" aria-busy={phase === 'on'}>
      <span className="gload__glow" aria-hidden />
      <Wordmark />
      <span className="gload__ring" aria-hidden><i /></span>
      <span className="gload__bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
      <p className="gload__txt">Loading the game… <b>{pct}%</b></p>
    </div>
    )
  );

  return (
    <>
      {children}
      {host ? createPortal(curtain, host) : curtain}
    </>
  );
}
