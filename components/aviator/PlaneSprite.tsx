/* ============================================================
   The aircraft on the board: the client's own plane artwork
   (public/games/aviator/plane.png, a flat red silhouette with
   the propeller already drawn in). One image for every phase.

   The art is drawn climbing (~18° nose-up), so it is rotated
   level here and the canvas applies the flight angle on top.
   A faint two-blade blur spins over the nose so the painted
   propeller reads as turning.
   ============================================================ */

const BASE = '/games/aviator';

/** plane.png is 535×328 — keep that ratio so nothing squashes. */
const ART_W = 535;
const ART_H = 328;
/** the art's own nose-up tilt, undone here so the canvas owns the angle */
const ART_TILT = -17.7;
/** propeller hub, as a fraction of the art box */
const HUB_FX = 0.91;
const HUB_FY = 0.50;

/** width in canvas units (the canvas is 100 wide) */
const SPRITE_W = 27;
const SPRITE_H = SPRITE_W * (ART_H / ART_W);

type Mode = 'idle' | 'fly' | 'wreck';

export default function PlaneSprite({ mode }: { mode: Mode }) {
  const spinning = mode !== 'wreck';
  const hubX = (HUB_FX - 0.5) * SPRITE_W;
  const hubY = (HUB_FY - 0.5) * SPRITE_H;

  return (
    <g transform={`rotate(${-ART_TILT})`}>
      <image
        href={`${BASE}/plane.png`}
        x={-SPRITE_W / 2}
        y={-SPRITE_H / 2}
        width={SPRITE_W}
        height={SPRITE_H}
        preserveAspectRatio="xMidYMid meet"
        className={`av-plane av-plane--${mode}`}
      />
      {spinning && (
        /* the spin lives on the inner group so the hub translate is not reset */
        <g transform={`translate(${hubX} ${hubY})`}>
          <g className="av-prop">
            <path
              d="M -0.4 0 Q -0.28 -4.1 0 -4.3 Q 0.28 -4.1 0.4 0 Q 0.28 4.1 0 4.3 Q -0.28 4.1 -0.4 0 Z"
              fill="#ffd6dc"
              opacity=".26"
            />
          </g>
        </g>
      )}
    </g>
  );
}
