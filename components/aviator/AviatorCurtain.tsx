'use client';

import { BRAND } from '@/lib/brand';

/**
 * Aviator opens on its own title card instead of the house curtain, in three
 * beats — the shape a crash game is expected to open with:
 *
 *   1. the lockup and a bar that fills
 *   2. the maker's stamp, with the pair of dots ticking under it
 *   3. a short "connecting", and the board takes the screen
 *
 * All timing lives in GameLoading, which hands this `t` — how far through the
 * curtain we are, 0→1 and linear. The beats below are cut from it, so the
 * three always add up to exactly one curtain however long that is set to be.
 */

/** where the lockup gives way to the stamp, and the stamp to the connect */
const CARD_END = 0.58;
const STAMP_END = 0.86;
/** the bar reaches full a shade before the lockup leaves, never on the way out */
const BAR_SPAN = CARD_END - 0.06;

export default function AviatorCurtain({ t, out }: { t: number; out: boolean }) {
  const beat = t < CARD_END ? 'card' : t < STAMP_END ? 'stamp' : 'link';
  // quick off the line, easing home — reads as real work, not a timer
  const filled = Math.min(1, t / BAR_SPAN);
  const pct = Math.round(100 * (1 - Math.pow(1 - filled, 2.2)));

  return (
    <div
      className={`avld avld--${beat}${out ? ' avld--out' : ''}`}
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

      {/* the maker's stamp: a halftone disc, the name, and the ticking pair */}
      <div className="avld__stamp">
        <p className="avld__by">Powered by</p>
        <span className="avld__maker">
          <span className="avld__mark" aria-hidden><i /><b>{BRAND.light[0]}</b></span>
          <span className="avld__made">
            <b>{BRAND.name.toUpperCase()}</b>
            <small>Original casino games</small>
          </span>
        </span>
        <span className="avld__pair" aria-hidden><i /><i /></span>
      </div>

      <p className="avld__link">Connecting<i aria-hidden /><i aria-hidden /><i aria-hidden /></p>
    </div>
  );
}
