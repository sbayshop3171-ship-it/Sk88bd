/* ============================================================
   The bust. Flash, two shockwave rings, radiating debris and a
   smoke puff — all CSS-driven off a single mount, so it costs one
   render rather than a per-frame animation loop.
   ============================================================ */

/** Fixed angles: the burst must look identical on server and client. */
const SHARDS = Array.from({ length: 14 }, (_, i) => {
  const a = (i * 360) / 14 + (i % 3) * 7;
  const r = 16 + (i % 4) * 6;
  return {
    x: Number((Math.cos((a * Math.PI) / 180) * r).toFixed(2)),
    y: Number((Math.sin((a * Math.PI) / 180) * r).toFixed(2)),
    s: 0.7 + (i % 3) * 0.45,
    d: (i % 5) * 0.035,
  };
});

export default function Blast() {
  return (
    <g className="av-blast">
      <defs>
        <radialGradient id="bl-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fffdf2" />
          <stop offset="35%" stopColor="#ffc42e" />
          <stop offset="70%" stopColor="#ff6a00" />
          <stop offset="100%" stopColor="#ff4d4f" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="bl-smoke" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6b6b6b" stopOpacity=".85" />
          <stop offset="100%" stopColor="#2b2b2b" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle className="av-blast__flash" r="30" fill="#fff" />
      <circle className="av-blast__ring av-blast__ring--1" r="6" fill="none" stroke="#ffd95e" strokeWidth="1.6" />
      <circle className="av-blast__ring av-blast__ring--2" r="6" fill="none" stroke="#ff6a00" strokeWidth="1.1" />
      <circle className="av-blast__core" r="11" fill="url(#bl-core)" />

      <g className="av-blast__shards">
        {SHARDS.map((s, i) => (
          <rect
            key={i}
            x="-0.9" y="-0.5" width="1.8" height="1"
            rx=".3"
            fill={i % 3 === 0 ? '#ffd95e' : i % 3 === 1 ? '#ff8a00' : '#e8f3f1'}
            style={{
              // custom properties drive the keyframe so each shard flies its own way
              ['--sx' as string]: `${s.x}px`,
              ['--sy' as string]: `${s.y}px`,
              ['--ss' as string]: s.s,
              animationDelay: `${s.d}s`,
            }}
          />
        ))}
      </g>

      <circle className="av-blast__smoke" r="14" fill="url(#bl-smoke)" />
    </g>
  );
}
