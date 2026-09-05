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
            {/* a faint disc, then two thin blades — as it whirls it reads as a
                propeller catching the light */}
            <ellipse rx="1.1" ry="4.2" fill="#fff" opacity=".18" />
            <line x1="0" y1="-4.2" x2="0" y2="4.2" stroke="#ffe9d6" strokeWidth=".55" opacity=".7" />
            <line x1="-1.7" y1="0" x2="1.7" y2="0" stroke="#ffe9d6" strokeWidth=".4" opacity=".4" />
          </g>
        </g>
      )}
    </g>
  );
}
