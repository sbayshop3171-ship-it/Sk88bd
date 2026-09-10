'use client';

/**
 * Aviator opens on its own curtain instead of the house one, in three beats:
 *
 *   1. the partners card, with a bar that fills
 *   2. the maker's stamp, with the pair of dots ticking under it
 *   3. a short "connecting", and the board takes the screen
 *
 * Both title frames are the reference artwork itself, lifted off its
 * background so the curtain's own rays run behind it. The bar was taken out
 * of the card image and is drawn live over the gap it left, which is why the
 * percentages below are so exact — they are that gap, measured.
 *
 * All timing lives in GameLoading, which hands this `t`: how far through the
 * curtain we are, 0→1 and linear. The beats are cut from it, so the three
 * always add up to exactly one curtain however long that is set to be.
 */

/** where the card gives way to the stamp, and the stamp to the connect */
const CARD_END = 0.58;
const STAMP_END = 0.86;
/** the bar reaches full a shade before the card leaves, never on the way out */
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
        <img
          className="avld__art"
          src="/games/aviator/splash-partners.png"
          alt="UFC and Aviator — official partners"
        />
        <span className="avld__bar" aria-hidden><i style={{ width: `${pct}%` }} /></span>
      </div>

      <div className="avld__stamp">
        <img className="avld__made" src="/games/aviator/splash-powered.png" alt="Powered by Spribe" />
        <span className="avld__pair" aria-hidden><i /><i /></span>
      </div>

      <p className="avld__link">Connecting<i aria-hidden /><i aria-hidden /><i aria-hidden /></p>
    </div>
  );
}
