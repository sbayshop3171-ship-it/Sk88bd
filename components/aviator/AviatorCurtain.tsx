'use client';

/**
 * Aviator's opening. The reference shows one frame before the board arrives —
 * the maker's stamp on black with its dots ticking — and then a short
 * "connecting" while the socket comes up. The partners card is not here; on
 * the reference it belongs to the board, and it runs in the stage between
 * rounds rather than over the whole screen.
 *
 * All timing lives in GameLoading, which hands this `t`: how far through the
 * curtain we are, 0→1 and linear. The two beats are cut from it, so they add
 * up to exactly one curtain however long that is set to be.
 */

/** where the stamp gives way to the connect */
const STAMP_END = 0.72;

export default function AviatorCurtain({ t, out }: { t: number; out: boolean }) {
  const beat = t < STAMP_END ? 'stamp' : 'link';

  return (
    <div
      className={`avld avld--${beat}${out ? ' avld--out' : ''}`}
      aria-live="polite"
      aria-busy={!out}
    >
      <div className="avld__stamp">
        <img className="avld__made" src="/games/aviator/splash-powered.png" alt="Powered by Spribe" />
        <span className="avld__pair" aria-hidden><i /><i /><i /></span>
      </div>

      <p className="avld__link">Connecting<i aria-hidden /><i aria-hidden /><i aria-hidden /></p>
    </div>
  );
}
