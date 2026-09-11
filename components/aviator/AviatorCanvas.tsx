'use client';

import { bandFor, fmtX, multiplierAt, timeToReach, type Phase } from '@/lib/aviator';
import PlaneSprite from './PlaneSprite';

/* 100×76 sits on the reference board's 374×283, so the stage's
   `aspect-ratio` and this box agree and nothing drawn here is stretched. */
const W = 100, H = 76;
/** where the plane arrives once it has climbed into frame — the top of its wave */
const TIP_X = 71, TIP_Y = 12, FLOOR = 71;
const STEPS = 34;

/** Multiplier by which the aircraft has finished climbing into frame. On
    the reference board the plane is still low at 1.16x and parked top-right
    by 1.5x — the climb is quick. */
const CRUISE_AT = 1.6;

/* The cruise wave, measured off the reference board: once up, the plane
   rides a long slow swell on a diagonal — sinking down-and-right, rising
   up-and-left — about 30% of the board's height and 12% of its width, one
   swell every ~8s, the nose dipping as it sinks. It starts at the top, where
   the climb left it, so there is no jump. */
const WAVE_DX = 12;
const WAVE_DY = 23;
const WAVE_PERIOD_MS = 8000;
const WAVE_PITCH_DEG = 4;

/** 0 on the runway, 1 once the nose reaches cruise — eased both ends: the
    reference plane rolls along the bottom until about 1.2x, then climbs
    hard and settles. */
function travelOf(multiplier: number) {
  if (multiplier <= 1) return 0;
  const t = Math.min(1, Math.log(multiplier) / Math.log(CRUISE_AT));
  return t * t * (3 - 2 * t);
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

  /* The wave is timed by the flight itself — milliseconds flown since the
     plane reached cruise — not by a clock of the page's own. The multiplier
     is recomputed every frame from the server's time, so every screen puts
     the plane at the same point of the same swell, and on the bust it
     leaves from exactly where it was. The line's tip rides with it: the
     curve is bent toward the plane so the two never part. */
  const cruiseMs = Math.max(0, timeToReach(multiplier) - timeToReach(CRUISE_AT));
  const wave = (cruiseMs / WAVE_PERIOD_MS) * Math.PI * 2;
  const up = flying || crashed;
  const dip = up ? (1 - Math.cos(wave)) / 2 : 0;   // 0 at the crest, 1 in the trough
  const waveX = dip * WAVE_DX;
  const waveY = dip * WAVE_DY;
  // nose down while it sinks, up while it rises
  const pitch = up ? Math.sin(wave) * WAVE_PITCH_DEG : 0;

  const pts = path(multiplier, travel).map(([x, y], i, all) => {
    // root stays on the runway; the bend grows toward the tip
    const f = i / (all.length - 1);
    const bend = f * f * f;
    return [
      Number((x + waveX * bend).toFixed(2)),
      Number((y + waveY * bend).toFixed(2)),
    ] as [number, number];
  });
  const [tx, ty] = pts[pts.length - 1];

  // The nose angle is a smooth function of how far the plane has climbed, not
  // the slope between two sampled points — that sampling shifted every frame
  // and made the plane tremble. Steeper nose-up at take-off, easing to a gentle
  // climb as it reaches cruise. The wobble on top is a separate CSS layer.
  const angle = Number((-24 + travel * 14 + pitch).toFixed(2));

  // climbing away from the viewer: further along the climb, slightly smaller
  const scale = (1.05 - travel * 0.25).toFixed(3);

  const bloom = { low: '#2C8FD6', mid: '#8E33D6', high: '#C017B4' }[bandFor(multiplier)];

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
          {/* the glow behind the figure takes the colour of the multiplier's
              band — blue under 2x, violet to 10x, magenta past it — the
              same three the history strip uses */}
          <radialGradient id="av-bloom" cx="46%" cy="40%" r="55%">
            <stop offset="0%" stopColor={bloom} stopOpacity=".5" />
            <stop offset="45%" stopColor={bloom} stopOpacity=".22" />
            <stop offset="100%" stopColor={bloom} stopOpacity="0" />
          </radialGradient>
          {/* the board's red: a solid line over a near-even crimson wash
              that runs all the way down to the floor */}
          <linearGradient id="av-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E10512" stopOpacity=".5" />
            <stop offset="100%" stopColor="#E10512" stopOpacity=".42" />
          </linearGradient>
          <filter id="av-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation=".9" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect width={W} height={H} fill="#000" fillOpacity="0" />

        {/* the glow belongs to the flight alone; on a bust and between rounds
            the board is plain black and grey, the way the reference sits */}
        {flying && <rect width={W} height={H} fill="url(#av-bloom)" />}

        {/* ---- flight path — drawn only while the plane is up; on a bust the
              plane flies off and the board goes bare, the way Aviator does ---- */}
        {flying && (
          <>
            <path d={area} fill="url(#av-area)" />
            <path d={d} fill="none" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"
                  stroke="#F00B3E" filter="url(#av-glow)" />
          </>
        )}

        {/* ---- the aircraft ---- */}
        {idle && (
          /* parked in the corner, wheels on the board's bottom edge */
          <g transform={`translate(15 ${FLOOR})`}>
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

      {/* Between rounds the board carries the partners card, the way the
          reference fills its betting window: no label and no clock on it —
          the bar drains, and that is the countdown. */}
      {idle && (
        <div className="av-promo">
          <img
            className="av-promo__art"
            src="/games/aviator/promo-lockup.png"
            alt="UFC and Aviator — official partners"
          />
          <span className="av-promo__bar" aria-hidden>
            <i style={{ width: `${betting ? Math.max(0, Math.min(100, (bettingLeft / bettingTotal) * 100)) : 100}%` }} />
          </span>
          <img
            className="av-promo__seal"
            src="/games/aviator/promo-seal.png"
            alt="Spribe — official game since 2019"
          />
        </div>
      )}

      <div className="av-stage__hud">
        {!idle && (
          <>
            {crashed && <div className="av-hud__flew">FLEW AWAY!</div>}
            <div className={`av-hud__mult${crashed ? ' is-crashed' : ''}`}>{fmtX(multiplier)}</div>
          </>
        )}
      </div>

      <span className="av-stage__fair">LIVE SIGNAL</span>

      {players > 0 && (
        <span className="av-stage__crowd" aria-label={`${players} players`}>
          <i /><i /><i />
          <b>{players.toLocaleString('en-IN')}</b>
        </span>
      )}
    </div>
  );
}
