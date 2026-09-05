/* ============================================================
   The aircraft on the board: the client's own plane artwork,
   split into two layers so the propeller really turns —
     plane-body.png   everything but the prop
     plane-prop.png   the blade and spinner, on the same canvas
   Both layers are the same 535×328 canvas, so they line up by
   construction; the prop layer is spun about the hub by CSS.

   The art is drawn climbing (~18° nose-up), so it is rotated
   level here and the canvas applies the flight angle on top.
   ============================================================ */

const BASE = '/games/aviator';

/** the body layer is 535×328 — keep that ratio so nothing squashes */
const ART_W = 535;
const ART_H = 328;
/** the art's own nose-up tilt, undone here so the canvas owns the angle */
const ART_TILT = -17.7;
/** propeller hub, as a fraction of the body canvas */
const HUB_FX = 0.9099;
const HUB_FY = 0.4976;
/** the prop layer is a square centred on the hub, this wide relative to the
    body — so the group's fill-box centre IS the hub, and the CSS spin turns
    it about the right point */
const PROP_SIDE_RATIO = 0.4374;

/** width in canvas units (the canvas is 100 wide) */
const SPRITE_W = 27;
const SPRITE_H = SPRITE_W * (ART_H / ART_W);
const HUB_X = (HUB_FX - 0.5) * SPRITE_W;
const HUB_Y = (HUB_FY - 0.5) * SPRITE_H;
const PROP_SIDE = SPRITE_W * PROP_SIDE_RATIO;

type Mode = 'idle' | 'fly' | 'wreck';

export default function PlaneSprite({ mode }: { mode: Mode }) {
  const spinning = mode !== 'wreck';
  const layer = { width: SPRITE_W, height: SPRITE_H, preserveAspectRatio: 'xMidYMid meet' as const };

  return (
    <g transform={`rotate(${-ART_TILT})`}>
      <image
        href={`${BASE}/plane-body.png`}
        x={-SPRITE_W / 2}
        y={-SPRITE_H / 2}
        {...layer}
        className={`av-plane av-plane--${mode}`}
      />
      {/* the prop layer is a square with the hub at its centre, placed so that
          centre sits on the hub — the CSS spin rotates about the fill-box
          centre, which is therefore the hub */}
      <g transform={`translate(${HUB_X} ${HUB_Y})`}>
        <g className={spinning ? 'av-prop' : undefined}>
          <image
            href={`${BASE}/plane-prop.png`}
            x={-PROP_SIDE / 2}
            y={-PROP_SIDE / 2}
            width={PROP_SIDE}
            height={PROP_SIDE}
            preserveAspectRatio="xMidYMid meet"
            className={`av-plane av-plane--${mode}`}
          />
        </g>
      </g>
    </g>
  );
}
