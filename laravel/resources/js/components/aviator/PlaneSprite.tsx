/* ============================================================
   The aircraft, drawn from the client's own sprite sheet.

   Frames are stacked and cross-faded by CSS `steps()` rather than
   swapped in React state: the propeller runs at ~12fps without
   costing a re-render, which matters because the surrounding canvas
   already re-renders every animation frame.
   ============================================================ */

const BASE = '/games/aviator';

/** Sprite is ~233x71; keep that ratio so nothing squashes. */
const SPRITE_W = 25;
const SPRITE_H = SPRITE_W * (71 / 233);

type Mode = 'idle' | 'fly' | 'wreck';

const FRAMES: Record<Mode, string[]> = {
  idle: ['takeoff_1'],
  fly: ['flight_1', 'flight_2', 'flight_3', 'flight_4'],
  wreck: ['boom_4'],
};

export default function PlaneSprite({ mode }: { mode: Mode }) {
  const frames = FRAMES[mode];
  const cycling = frames.length > 1;

  return (
    <g>
      {frames.map((f, i) => (
        <image
          key={f}
          href={`${BASE}/${f}.png`}
          x={-SPRITE_W / 2}
          y={-SPRITE_H / 2}
          width={SPRITE_W}
          height={SPRITE_H}
          preserveAspectRatio="xMidYMid meet"
          className={cycling ? `av-spr av-spr--${i + 1}` : undefined}
        />
      ))}
    </g>
  );
}
