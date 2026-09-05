/* ============================================================
   The aircraft, drawn in SVG — our own paths, in the 150:74
   proportions of the reference board's plane: a chunky red
   low-wing monoplane seen from the left, nose to the right.
   Fat belly, a tall fin swept back over the tail, a small dark
   canopy, one wing angled down toward the viewer, two wheels
   under it and a tail skid. The propeller is drawn by
   PlaneSprite over PLANE_HUB so it can spin on its own.

   Units: 150 wide × 74 high; PlaneSprite scales it.
   ============================================================ */

export const PLANE_W = 150;
export const PLANE_H = 74;

/** Propeller hub: the very tip of the nose. */
export const PLANE_HUB: [number, number] = [146, 37];

export default function PlaneVector({ dim = false }: { dim?: boolean }) {
  const body = dim ? '#8a1220' : '#e10512';
  const shade = dim ? '#5c0c16' : '#a8040f';
  const deep = dim ? '#3d0810' : '#7a020b';
  const light = dim ? '#b13a45' : '#ff4b57';

  return (
    <g>
      {/* ---- tail fin: rises from the tail, swept back (leaning left) ---- */}
      <path d="M 6 42 L 16 6 L 34 6 L 48 40 Z" fill={shade} />
      <path d="M 10 40 L 19 9 L 31 9 L 44 38 Z" fill={body} />
      <path d="M 20 12 L 28 12 L 38 34 L 30 34 Z" fill={light} opacity=".35" />

      {/* ---- tailplane behind the fuselage ---- */}
      <path d="M 0 46 L 30 42 L 36 54 L 4 56 Z" fill={deep} />
      <path d="M 2 46 L 28 43 L 32 51 L 6 53 Z" fill={shade} />

      {/* ---- fuselage: fat in the middle, tapering to the tail ---- */}
      <path
        d="M 6 46 C 22 28, 62 22, 112 26 C 130 27, 142 31, 146 37 C 142 44, 130 50, 112 53 C 62 58, 22 58, 6 50 Z"
        fill={body}
      />
      {/* belly */}
      <path d="M 8 50 C 30 56, 70 57, 112 53 C 128 51, 138 47, 144 40 C 140 47, 130 52, 112 55 C 70 60, 30 59, 8 52 Z" fill={shade} />
      {/* spine highlight */}
      <path d="M 20 36 C 50 27, 90 24, 126 29 C 112 28, 60 29, 22 38 Z" fill={light} opacity=".6" />

      {/* ---- canopy: a small dark bump behind the nose ---- */}
      <path d="M 82 27 C 88 20, 106 20, 114 27 Z" fill="#141518" />
      <path d="M 88 26 C 92 22, 104 22, 108 26 Z" fill="#3b3d44" />

      {/* ---- main wing, angled down toward the viewer ---- */}
      <path d="M 62 50 L 118 45 L 130 62 L 56 66 Z" fill={deep} />
      <path d="M 66 50 L 116 46 L 126 60 L 60 64 Z" fill={body} />
      <path d="M 68 51 L 114 47 L 118 52 L 70 55 Z" fill={light} opacity=".45" />

      {/* ---- wheels under the wing, and a tail skid ---- */}
      <path d="M 96 62 L 102 62 L 103 68 L 95 68 Z" fill="#26272b" />
      <circle cx="99" cy="69" r="4.2" fill="#0f1012" />
      <circle cx="99" cy="69" r="1.5" fill="#55575e" />
      <path d="M 118 60 L 124 60 L 125 66 L 117 66 Z" fill="#26272b" />
      <circle cx="121" cy="67" r="4.2" fill="#0f1012" />
      <circle cx="121" cy="67" r="1.5" fill="#55575e" />
      <path d="M 16 52 L 20 52 L 21 58 L 15 58 Z" fill="#26272b" />
      <circle cx="18" cy="59" r="2.6" fill="#0f1012" />

      {/* ---- nose cowl and spinner cone ---- */}
      <path d="M 122 27 C 136 29, 144 33, 146 37 C 144 42, 136 48, 122 51 Z" fill={shade} />
      <path d="M 138 31 C 144 33, 147 35, 148 37 C 147 39, 144 41, 138 43 Z" fill="#1b1c1f" />
    </g>
  );
}
