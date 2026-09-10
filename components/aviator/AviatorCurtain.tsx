'use client';

import { BRAND } from '@/lib/brand';

/**
 * Aviator opens on its own title card instead of the house curtain: the
 * lockup on black, a bar that fills, then a short "connecting" beat before
 * the board takes the screen — the shape a crash game is expected to open
 * with.
 *
 * All timing lives in GameLoading; this only draws the frame it is handed.
 * The card holds until the bar is nearly home, then hands over to the beat.
 */
export default function AviatorCurtain({ pct, out }: { pct: number; out: boolean }) {
  const linking = pct >= 78;

  return (
    <div
      className={`avld${out ? ' avld--out' : ''}${linking ? ' avld--link' : ''}`}
      aria-live="polite"
      aria-busy={!out}
    >
      <span className="avld__rays" aria-hidden><i /></span>

      <div className="avld__card">
        <div className="avld__lock">
          <span className="avld__brand">{BRAND.light}<i>{BRAND.accent}</i></span>
          <span className="avld__rule" aria-hidden />
          <span className="avld__game">
            <img className="avld__plane" src="/games/aviator/plane.png" alt="" aria-hidden />
            <img className="avld__word" src="/games/aviator/wordmark.png" alt="Aviator" />
          </span>
        </div>

        <p className="avld__tag">House Original</p>

        <span className="avld__bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>

        <span className="avld__seal">
          <b>{BRAND.name.toUpperCase()}</b>
          <em>Provably fair <i aria-hidden>✓</i></em>
          <small>Since 2026</small>
        </span>
      </div>

      <p className="avld__link">Connecting<i aria-hidden /><i aria-hidden /><i aria-hidden /></p>
    </div>
  );
}
