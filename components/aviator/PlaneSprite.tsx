/* ============================================================
   The aircraft — the client's own red plane (public/games/aviator/
   plane.png). One image for every phase; the canvas rotates it along
   the flight path, and a spinning propeller is drawn over the nose so
   the plane reads as running, not a still.
   ============================================================ */

const BASE = '/games/aviator';

/** plane.png is 420x244 — keep that ratio so nothing squashes. */
const SPRITE_W = 27;
const SPRITE_H = SPRITE_W * (244 / 420);

/** Propeller hub, measured off the plane art (front of the nose). */
const HUB_X = SPRITE_W * (0.9 - 0.5);   // ~ right of centre, at the nose
const HUB_Y = SPRITE_H * (0.34 - 0.5);  // ~ just above centre

type Mode = 'idle' | 'fly' | 'wreck';

export default function PlaneSprite({ mode }: { mode: Mode }) {
  const spinning = mode !== 'wreck';
  return (
    <g>
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
        <g transform={`translate(${HUB_X} ${HUB_Y})`}>
          <g className="av-prop">
            {/* a faint disc, then two thin blades — as it whirls it reads as a
                propeller catching the light */}
            <ellipse rx="1.1" ry="3.6" fill="#fff" opacity=".16" />
            <line x1="0" y1="-3.6" x2="0" y2="3.6" stroke="#ffe9d6" strokeWidth=".55" opacity=".6" />
            <line x1="-1.6" y1="0" x2="1.6" y2="0" stroke="#ffe9d6" strokeWidth=".4" opacity=".35" />
          </g>
        </g>
      )}
    </g>
  );
}
