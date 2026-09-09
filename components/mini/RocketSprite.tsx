/* ============================================================
   The Crash craft: a rocket, drawn rather than loaded, so it
   scales with the board and re-colours from CSS.

   Nose points along +x and the sprite is centred on the origin,
   so the board can drop it on the head of the curve with a plain
   translate/rotate — the same contract JetSprite has with the
   JetX stage. Units are canvas units (the canvas is 100 wide).
   ============================================================ */

export default function RocketSprite({ gone }: { gone?: boolean }) {
  return (
    <g className={`cr-rocket${gone ? ' is-gone' : ''}`}>
      <defs>
        <linearGradient id="cr-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="52%" stopColor="#e9eef6" />
          <stop offset="100%" stopColor="#9fb0c6" />
        </linearGradient>
        <linearGradient id="cr-flame" x1="1" y1="0" x2="0" y2="0">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="42%" stopColor="#ff9d2e" />
          <stop offset="100%" stopColor="#ff2d55" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* exhaust — three sleeves on their own beats, so the burn never
          pulses as one solid block */}
      <g className="cr-rocket__burn">
        <path className="cr-rocket__flame f1" d="M-12 0 L-29 -3.4 L-39 0 L-29 3.4 Z" fill="url(#cr-flame)" />
        <path className="cr-rocket__flame f2" d="M-12 0 L-23 -2 L-31 0 L-23 2 Z" fill="#ffb03a" />
        <path className="cr-rocket__flame f3" d="M-12 0 L-18 -1 L-22 0 L-18 1 Z" fill="#fff6cf" />
      </g>

      {/* fins, then the hull */}
      <path d="M-4.5 3.3 L-13 9 L-10.5 3.3 Z" fill="#b8332a" />
      <path d="M-4.5 -3.3 L-13 -9 L-10.5 -3.3 Z" fill="#f0563f" />
      <path
        d="M4 -4 L-11 -4 L-11 4 L4 4 C 10 4, 15 1.6, 17 0 C 15 -1.6, 10 -4, 4 -4 Z"
        fill="url(#cr-body)"
      />
      {/* the red nose band and the ring at the tail */}
      <path d="M8 -3.05 C 12 -2.2, 15.2 -1, 17 0 C 15.2 1, 12 2.2, 8 3.05 Z" fill="#e5203f" />
      <rect x="-12.2" y="-4.3" width="2.3" height="8.6" rx=".8" fill="#c3d0de" />
      {/* porthole */}
      <circle cx="0.5" cy="0" r="2.3" fill="#74dcff" />
      <circle cx="0.5" cy="0" r="2.3" fill="none" stroke="#aebfd2" strokeWidth=".7" />
    </g>
  );
}
