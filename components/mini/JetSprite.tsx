/* ============================================================
   The JetX craft: drawn rather than loaded, so it scales with
   the board and re-colours from CSS instead of shipping art.

   Nose points along +x and the sprite is centred on the origin,
   so the board can drop it on the head of the trail with a plain
   translate/rotate — the same contract PlaneSprite has with the
   Aviator canvas. Units are canvas units (the canvas is 100 wide).
   ============================================================ */

export default function JetSprite({ gone }: { gone?: boolean }) {
  return (
    <g className={`jx-jet${gone ? ' is-gone' : ''}`}>
      <defs>
        <linearGradient id="jx-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="55%" stopColor="#e7f0fb" />
          <stop offset="100%" stopColor="#a9bdd4" />
        </linearGradient>
        <linearGradient id="jx-flame" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="45%" stopColor="#ff9d2e" />
          <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* exhaust — three sleeves, each flickering on its own beat so the
          burn never pulses as one solid block */}
      <g className="jx-jet__burn">
        <path className="jx-jet__flame f1" d="M-12 0 L-30 -3.1 L-41 0 L-30 3.1 Z" fill="url(#jx-flame)" />
        <path className="jx-jet__flame f2" d="M-12 0 L-24 -1.9 L-32 0 L-24 1.9 Z" fill="#ffb03a" />
        <path className="jx-jet__flame f3" d="M-12 0 L-18 -0.9 L-23 0 L-18 0.9 Z" fill="#fff6cf" />
      </g>

      {/* tail fin, then the wings — the far wing sits a shade lighter than
          the near one so the jet reads as banked, not flat */}
      <path d="M-10.5 -0.6 L-15.2 -6.6 L-8.2 -1.4 Z" fill="#a8241a" />
      <path d="M-3 0.4 L-13 8.6 L-4.4 2.7 Z" fill="#d93a26" />
      <path d="M-3 -0.4 L-13 -8.6 L-4.4 -2.7 Z" fill="#ff6b4d" />

      <path
        d="M15 0 C 9 -2.9, -1 -3.7, -12.6 -2.7 L -12.6 2.7 C -1 3.7, 9 2.9, 15 0 Z"
        fill="url(#jx-body)"
      />
      {/* the red flash down the flank and the glass over it */}
      <path d="M-12.6 1.5 C -2 2.6, 7 2.1, 13.4 0.6 L 15 0 L -12.6 2.7 Z" fill="#e03c2a" />
      <path
        d="M7.4 -0.9 C 4 -2.2, 0.4 -2.5, -2.2 -2.2 L -2.2 -0.5 C 1.4 -0.8, 4.7 -0.7, 7.4 -0.9 Z"
        fill="#74dcff"
        opacity=".9"
      />
    </g>
  );
}
