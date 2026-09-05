/* ============================================================
   The aircraft, drawn in SVG — our own paths, sized to the same
   150:74 proportions the reference board's plane sits in: a red
   low-wing monoplane seen from the left, nose to the right, with
   a tall fin, a dark canopy, and a spinner at the nose that the
   propeller disc whirls over.

   Units: the drawing is 150 wide × 74 high; PlaneSprite scales it.
   ============================================================ */

export const PLANE_W = 150;
export const PLANE_H = 74;

/** Where the propeller hub sits on the drawing (front of the nose). */
export const PLANE_HUB: [number, number] = [141, 38];

export default function PlaneVector({ dim = false }: { dim?: boolean }) {
  const body = dim ? '#8a1220' : '#e10512';
  const shade = dim ? '#5c0c16' : '#a3040e';
  const light = dim ? '#b13a45' : '#ff5a63';

  return (
    <g>
      {/* tail fin — tall and swept, the board plane's signature */}
      <path d="M12 8 L34 8 L44 40 L10 44 Z" fill={shade} />
      <path d="M14 10 L32 10 L40 36 L14 40 Z" fill={body} />

      {/* rear wing (horizontal stabiliser) behind the fuselage */}
      <path d="M4 44 L30 41 L34 52 L10 54 Z" fill={shade} />

      {/* fuselage: cigar shape, tapering to the tail on the left */}
      <path
        d="M10 46 C 30 30, 70 26, 118 30 C 132 31, 140 34, 141 38 C 140 43, 132 47, 118 48 C 70 52, 30 54, 10 50 Z"
        fill={body}
      />
      {/* belly shade and top highlight give it roundness */}
      <path d="M12 49 C 40 53, 80 51, 118 47 C 130 46, 138 43, 140 40 C 136 45, 128 48, 118 49 C 80 53, 40 55, 12 51 Z" fill={shade} />
      <path d="M22 37 C 50 31, 90 29, 122 33 C 112 32, 60 33, 24 39 Z" fill={light} opacity=".75" />

      {/* canopy — dark glass, two panes */}
      <path d="M78 30 C 84 24, 100 24, 108 30 L 104 31 C 98 27, 86 27, 82 31 Z" fill="#16171a" />
      <path d="M84 31 L 100 31 L 98 29 L 87 29 Z" fill="#3a3b40" />

      {/* main wing, coming toward the viewer under the canopy */}
      <path d="M62 46 L 112 44 L 120 56 L 54 60 Z" fill={shade} />
      <path d="M64 46 L 110 44 L 116 53 L 58 57 Z" fill={body} />
      <path d="M66 47 L 108 45 L 110 48 L 66 50 Z" fill={light} opacity=".5" />

      {/* landing gear tucked under the wing */}
      <path d="M92 58 L 96 58 L 97 66 L 91 66 Z" fill="#2a2b2f" />
      <circle cx="94" cy="67" r="4" fill="#111214" />
      <circle cx="94" cy="67" r="1.6" fill="#4a4b50" />

      {/* nose cowl and spinner */}
      <path d="M120 30 C 134 31, 141 35, 141 38 C 141 42, 134 47, 120 48 Z" fill={shade} />
      <circle cx="141" cy="38" r="4.5" fill="#1b1c1f" />
      <circle cx="141" cy="38" r="2" fill="#6b6c72" />
    </g>
  );
}
