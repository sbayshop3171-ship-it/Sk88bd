'use client';

import { useEffect, useState } from 'react';
import { fmtX, multiplierAt, timeToReach, type Phase } from '@/lib/aviator';
import PlaneSprite from './PlaneSprite';

const W = 100, H = 62;
/** where the nose settles once it has climbed into frame */
const TIP_X = 76, TIP_Y = 12, FLOOR = 55;
const STEPS = 34;

/** Multiplier by which the aircraft has finished climbing into frame. The
    reference board's plane is parked top-right by roughly 2.5x. */
const CRUISE_AT = 2.4;

/** the cruise ride: how far the plane (and the line's tip) swell, how fast,
    and how much the nose pitches with it */
const BOB_AMPLITUDE = 3.2;
const BOB_PERIOD_MS = 2600;
const BOB_PITCH_DEG = 1.4;

/** 0 on the runway, 1 once the nose reaches cruise — eased out, so the
    plane leaps off the corner and settles rather than crawling up. */
function travelOf(multiplier: number) {
  if (multiplier <= 1) return 0;
  const t = Math.min(1, Math.log(multiplier) / Math.log(CRUISE_AT));
  return 1 - (1 - t) * (1 - t);
}

/**
 * Flight path. Below CRUISE_AT the nose genuinely travels out of the
 * bottom-left corner; above it the nose holds and the curve steepens
 * underneath, so a 1.2x round and a 40x round are equally readable.
 */
function path(multiplier: number, travel: number) {
  const span = Math.max(multiplier - 1, 0.0001);
  const total = timeToReach(multiplier);
  const spanX = travel * TIP_X;
  const spanY = travel * (FLOOR - TIP_Y);
  const pts: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const f = i / STEPS;
    const m = multiplierAt(total * f);
    pts.push([
      Number((f * spanX).toFixed(2)),
      Number((FLOOR - ((m - 1) / span) * spanY).toFixed(2)),
    ]);
  }
  return pts;
}

/** A timestamp that advances every animation frame while `on`, so a render
    that depends on the clock re-runs each frame; frozen at 0 otherwise. */
function useFrameClock(on: boolean) {
  const [now, setNow] = useState(0);
  useEffect(() => {
    if (!on) return;
    let raf = 0;
    const loop = () => { setNow(performance.now()); raf = requestAnimationFrame(loop); };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [on]);
  return now;
}

export default function AviatorCanvas({
  phase,
  multiplier,
  bettingLeft,
  bettingTotal,
  players = 0,
}: {
  phase: Phase;
  multiplier: number;
  bettingLeft: number;
  bettingTotal: number;
  /** how many seats are in this round — shown in the corner pill */
  players?: number;
}) {
  const waiting = phase === 'waiting';
  const betting = phase === 'betting';
  const flying = phase === 'flying';
  const crashed = phase === 'crashed';
  const idle = waiting || betting;

  const travel = travelOf(multiplier);

  /* The ride: once the plane is up it swells up and down, and the line's
     tip rides with it — the curve is bent toward the plane so they never
     part. Driven off our own frame clock rather than a CSS animation on the
     plane alone, because the path is drawn by React and the two have to
     agree; the clock keeps ticking even while the multiplier is pinned at
     the round's cap, so the plane never freezes mid-air. Scaled by
     `travel`, so take-off is clean. */
  const now = useFrameClock(flying);
  const swell = flying ? Math.sin((now / BOB_PERIOD_MS) * Math.PI * 2) * travel : 0;
  const bobY = swell * -BOB_AMPLITUDE;
  const pitch = swell * -BOB_PITCH_DEG;

  const pts = path(multiplier, travel).map(([x, y], i, all) => {
    // root stays on the runway; the bend grows toward the tip
    const f = i / (all.length - 1);
    return [x, Number((y + bobY * f * f * f).toFixed(2))] as [number, number];
  });
  const [tx, ty] = pts[pts.length - 1];

  // The nose angle is a smooth function of how far the plane has climbed, not
  // the slope between two sampled points — that sampling shifted every frame
  // and made the plane tremble. Steeper nose-up at take-off, easing to a gentle
  // climb as it reaches cruise. The wobble on top is a separate CSS layer.
  const angle = Number((-24 + travel * 14 + pitch).toFixed(2));

  // climbing away from the viewer: further along the climb, slightly smaller
  const scale = (1.05 - travel * 0.25).toFixed(3);

  const d = `M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}`;
  // the fill drops straight down at the nose, giving the hard right edge
  const area = `${d} L ${tx} ${FLOOR} L 0 ${FLOOR} Z`;

  return (
    <div className={`av-stage av-stage--${phase}`}>
      {/* the rays: a huge conic-gradient disc whose centre sits on the launch
          corner, turning all the time — the same construction the reference
          board uses, so the light flows the same way whatever the phase */}
      <div className="av-stage__rays" aria-hidden><i /></div>

      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="av-stage__sky" aria-hidden>
        <defs>
          <radialGradient id="av-bloom" cx="46%" cy="40%" r="55%">
            <stop offset="0%" stopColor="#8e33d6" stopOpacity=".62" />
            <stop offset="45%" stopColor="#c017b4" stopOpacity=".3" />
            <stop offset="100%" stopColor="#3a1e6b" stopOpacity="0" />
          </radialGradient>
          {/* the board's red: a solid line, and a wash under it that fades to
              nothing at the floor */}
          <linearGradient id="av-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E10512" stopOpacity=".55" />
            <stop offset="100%" stopColor="#E10512" stopOpacity=".04" />
          </linearGradient>
          <filter id="av-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation=".9" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="#000" fillOpacity="0" />

        {/* the violet glow belongs to the flight; while the board waits it is
            plain black and grey, the way the reference board sits */}
        {(flying || crashed) && <rect width={W} height={H} fill="url(#av-bloom)" />}

        {/* ---- flight path — drawn only while the plane is up; on a bust the
              plane flies off and the board goes bare, the way Aviator does ---- */}
        {flying && (
          <>
            <path d={area} fill="url(#av-area)" />
            <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  stroke="#E10512" filter="url(#av-glow)" />
          </>
        )}

        {/* ---- the aircraft ---- */}
        {idle && (
          <g transform={`translate(15 ${FLOOR - 7})`}>
            {/* the bob lives on an inner group: a CSS transform replaces the
                SVG transform attribute outright, which would reset the
                position to the origin */}
            <g className="av-craft av-craft--idle">
              <PlaneSprite mode="idle" />
            </g>
          </g>
        )}
        {flying && (
          <g transform={`translate(${tx} ${ty}) rotate(${angle}) scale(${scale})`}>
            {/* inner group carries the CSS wobble; React drives the outer one
                every frame and a CSS animation there would overwrite it. The
                wobble runs the whole flight, so the plane always has gentle,
                smooth life rather than snapping to a hold. */}
            <g className="av-craft">
              <PlaneSprite mode="fly" />
            </g>
          </g>
        )}

        {crashed && (
          /* the plane keeps going and leaves the frame, top-right */
          <g transform={`translate(${tx} ${ty}) rotate(${angle})`}>
            <g className="av-craft av-craft--gone">
              <PlaneSprite mode="fly" />
            </g>
          </g>
        )}
      </svg>

      <div className="av-stage__hud">
        {waiting ? (
          <>
            <div className="av-hud__label">পরবর্তী রাউন্ড প্রস্তুত হচ্ছে</div>
            <div className="av-hud__count">{(bettingLeft / 1000).toFixed(1)}s</div>
            <div className="av-hud__bar">
              <i style={{ width: `${Math.max(0, Math.min(100, 100 - (bettingLeft / bettingTotal) * 100))}%` }} />
            </div>
          </>
        ) : betting ? (
          <>
            <div className="av-hud__label">পরবর্তী রাউন্ড শুরু হচ্ছে</div>
            <div className="av-hud__count">{(bettingLeft / 1000).toFixed(1)}s</div>
            <div className="av-hud__bar">
              <i style={{ width: `${Math.max(0, Math.min(100, (bettingLeft / bettingTotal) * 100))}%` }} />
            </div>
          </>
        ) : (
          <>
            {crashed && <div className="av-hud__flew">উড়ে গেছে!</div>}
            <div className={`av-hud__mult${crashed ? ' is-crashed' : ''}`}>{fmtX(multiplier)}</div>
          </>
        )}
      </div>

      <span className="av-stage__fair">লাইভ সিগন্যাল</span>

      {players > 0 && (
        <span className="av-stage__crowd" aria-label={`${players} জন খেলছে`}>
          <i /><i /><i />
          <b>{players.toLocaleString('en-IN')}</b>
        </span>
      )}
    </div>
  );
}
