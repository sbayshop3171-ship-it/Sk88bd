/* ============================================================
   The aircraft, drawn three-quarter from behind so it reads as a
   solid object rather than a flat glyph: each surface carries its
   own gradient, the port wing sits in shadow, and the engines glow.

   Red livery, which is the convention for this game type — the
   geometry below is our own.

   Pure SVG — a WebGL model would look sharper but costs a runtime,
   a mesh download and battery on the low-end Android handsets this
   site is built for.
   ============================================================ */

export default function Plane3D({ thrust }: { thrust: boolean }) {
  return (
    <g>
      <defs>
        <linearGradient id="pl-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff6b7f" />
          <stop offset="40%" stopColor="#e8123c" />
          <stop offset="100%" stopColor="#7d0620" />
        </linearGradient>
        <linearGradient id="pl-wing-lit" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#ff8095" />
          <stop offset="100%" stopColor="#d40f36" />
        </linearGradient>
        <linearGradient id="pl-wing-dark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#a80a2a" />
          <stop offset="100%" stopColor="#5e0417" />
        </linearGradient>
        <linearGradient id="pl-fin" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff5570" />
          <stop offset="100%" stopColor="#b80c2e" />
        </linearGradient>
        <radialGradient id="pl-flame" cx="30%" cy="50%" r="70%">
          <stop offset="0%" stopColor="#fff6cf" />
          <stop offset="45%" stopColor="#ff8a00" />
          <stop offset="100%" stopColor="#ff4d4f" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* contact shadow — sells the object as having volume */}
      <ellipse cx="0" cy="7.5" rx="9" ry="1.7" fill="#000" opacity=".22" />

      {/* starboard wing (catching the light) */}
      <path d="M1 0 L14 6.5 L17 6.2 L5.5 -1.2 Z" fill="url(#pl-wing-lit)"
            stroke="#3d0210" strokeWidth=".45" strokeLinejoin="round" />
      {/* port wing (turned away, in shadow) */}
      <path d="M1 -0.6 L13 -6.6 L16 -6.2 L5.5 0.4 Z" fill="url(#pl-wing-dark)"
            stroke="#3d0210" strokeWidth=".45" strokeLinejoin="round" />

      {/* tailplane */}
      <path d="M-8 0 L-3.5 3.2 L-2 3 L-6 -0.2 Z" fill="url(#pl-wing-dark)"
            stroke="#3d0210" strokeWidth=".4" strokeLinejoin="round" />
      {/* vertical fin */}
      <path d="M-8.4 -0.4 L-6.6 -5.4 L-5 -5 L-5.4 -0.4 Z" fill="url(#pl-fin)"
            stroke="#3d0210" strokeWidth=".4" strokeLinejoin="round" />

      {/* fuselage */}
      <path d="M10.5 0 C10.5 -1.5 7 -2.4 2 -2.4 L-8 -1.9 C-9.4 -1.9 -9.4 1.9 -8 1.9 L2 2.4 C7 2.4 10.5 1.5 10.5 0 Z"
            fill="url(#pl-body)" stroke="#3d0210" strokeWidth=".5" strokeLinejoin="round" />
      {/* belly shading */}
      <path d="M-8 1.9 L2 2.4 C6 2.4 9.2 1.7 10.3 0.7 C8 1.5 3 1.6 -8 1.9 Z" fill="#5e0417" opacity=".6" />

      {/* cockpit glass */}
      <path d="M5.6 -1.4 C7.6 -1.4 9.4 -0.8 10.2 -0.2 L6.4 0 Z" fill="#2a2f3a" opacity=".95" />
      {/* windows */}
      {[-5.5, -3.5, -1.5, 0.5, 2.5].map((x) => (
        <circle key={x} cx={x} cy="-0.35" r=".42" fill="#39404d" opacity=".9" />
      ))}
      {/* upper highlight */}
      <path d="M-7 -1.5 C-2 -2 4 -2 8.6 -1 C4 -1.6 -2 -1.6 -7 -1.5 Z" fill="#ffb8c4" opacity=".55" />

      {/* propeller: a blurred disc with blades turning inside it */}
      <g className={thrust ? 'av-prop is-spinning' : 'av-prop'} transform="translate(10.8 0)">
        <ellipse rx="1.1" ry="4.6" fill="#ffd7de" opacity=".2" />
        <g className="av-prop__blades">
          <rect x="-.28" y="-4.4" width=".56" height="8.8" rx=".28" fill="#ffd7de" />
          <rect x="-.28" y="-4.4" width=".56" height="8.8" rx=".28" fill="#c9909c"
                transform="rotate(60)" />
          <rect x="-.28" y="-4.4" width=".56" height="8.8" rx=".28" fill="#c9909c"
                transform="rotate(120)" />
        </g>
        <circle r=".8" fill="#ffd7de" stroke="#3d0210" strokeWidth=".4" />
      </g>

      {/* engine exhaust */}
      {thrust && (
        <g className="av-thrust">
          <ellipse cx="-12.5" cy="0" rx="5.5" ry="1.5" fill="url(#pl-flame)" />
          <ellipse cx="-10.5" cy="0" rx="2.6" ry=".8" fill="#fff6cf" opacity=".85" />
        </g>
      )}
    </g>
  );
}
