/* ============================================================
   The aircraft on the board. PlaneVector draws it (our own paths,
   in the 150:74 proportions the reference board's plane keeps);
   this wrapper scales it to canvas units, rotates it along the
   flight path, and whirls a propeller disc over the nose so the
   plane reads as running, not a still.
   ============================================================ */

import PlaneVector, { PLANE_H, PLANE_HUB, PLANE_W } from './PlaneVector';

/** width in canvas units (the canvas is 100 wide) */
const SPRITE_W = 27;
const SCALE = SPRITE_W / PLANE_W;
const SPRITE_H = PLANE_H * SCALE;

type Mode = 'idle' | 'fly' | 'wreck';

export default function PlaneSprite({ mode }: { mode: Mode }) {
  const spinning = mode !== 'wreck';
  const [hubX, hubY] = PLANE_HUB;

  return (
    <g className={`av-plane av-plane--${mode}`}>
      {/* centre the drawing on the origin so rotation pivots on the plane */}
      <g transform={`translate(${-SPRITE_W / 2} ${-SPRITE_H / 2}) scale(${SCALE})`}>
        <PlaneVector dim={mode === 'wreck'} />
      </g>
      {spinning && (
        /* the spin lives on the inner group so the hub translate is not reset */
        <g transform={`translate(${hubX * SCALE - SPRITE_W / 2} ${hubY * SCALE - SPRITE_H / 2})`}>
          <g className="av-prop">
            {/* the whirl: a translucent disc the size of the prop's sweep,
                then three blades. Spun by CSS, they smear into the disc and
                the plane reads as running. */}
            <circle r="4.6" fill="#fff" opacity=".1" />
            <circle r="4.6" fill="none" stroke="#fff" strokeWidth=".2" opacity=".28" />
            {[0, 120, 240].map((a) => (
              <path
                key={a}
                d="M -0.55 0 Q -0.4 -4.3 0 -4.6 Q 0.4 -4.3 0.55 0 Z"
                fill="#f3f0ea"
                opacity=".8"
                transform={`rotate(${a})`}
              />
            ))}
            <circle r=".9" fill="#1b1c1f" />
          </g>
        </g>
      )}
    </g>
  );
}
