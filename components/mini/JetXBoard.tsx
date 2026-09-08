'use client';

import GameShell from '@/components/mini/GameShell';
import JetSprite from '@/components/mini/JetSprite';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useFlightRound } from '@/components/mini/useFlightRound';
import { money } from '@/lib/brand';
import { fmtX, flightMultiplierAt, flightTimeToReach } from '@/lib/mini-games';

/* ============================================================
   JetX. Same rounds as Crash — same wallet, same commit–reveal
   draw — behind the screen the game is known for: a jet climbing
   out of a purple sky on a burning trail, the multiplier huge in
   the middle, and FLEW AWAY when the round dies.

   Everything that decides money lives in useFlightRound; this
   file only draws.
   ============================================================ */

/* The stage is locked to this aspect in CSS, so the SVG can be stretched
   edge to edge (preserveAspectRatio="none") without the jet ever squashing. */
const W = 100, H = 76;
/** the pad the jet waits on, and where the nose settles once it is up */
const PAD_X = 12, FLOOR = 63;
const TIP_X = 74, TIP_Y = 15;
const STEPS = 40;

/** Multiplier by which the jet has finished climbing into frame. Below it the
    nose genuinely travels out of the corner; above it the nose holds and the
    trail steepens underneath, so a 1.3x round and a 60x round are equally
    readable on a phone. */
const CRUISE_AT = 3;

/** 0 on the pad, 1 once the nose reaches cruise — eased out, so the jet
    leaps off the corner and settles rather than crawling up. */
function travelOf(multiplier: number) {
  if (multiplier <= 1) return 0;
  const t = Math.min(1, Math.log(multiplier) / Math.log(CRUISE_AT));
  return 1 - (1 - t) * (1 - t);
}

function trail(multiplier: number, travel: number): [number, number][] {
  const span = Math.max(multiplier - 1, 0.0001);
  const total = flightTimeToReach('jetx', multiplier);
  const spanX = travel * (TIP_X - PAD_X);
  const spanY = travel * (FLOOR - TIP_Y);
  const pts: [number, number][] = [];
  for (let i = 0; i <= STEPS; i++) {
    const f = i / STEPS;
    const m = flightMultiplierAt('jetx', total * f);
    pts.push([
      Number((PAD_X + f * spanX).toFixed(2)),
      Number((FLOOR - ((m - 1) / span) * spanY).toFixed(2)),
    ]);
  }
  return pts;
}

export default function JetXBoard() {
  useImmersive();
  const r = useFlightRound('jetx');
  const { g, phase, multiplier, settled, busted } = r;

  const flying = phase === 'flying';
  /* A settled round holds its last frame: the win parks the jet where it was
     taken, the bust lets it fly off. Idle sits it on the pad. */
  const shown = flying || phase === 'settled' ? multiplier : 1;
  const travel = travelOf(shown);
  const pts = trail(shown, travel);
  const [tx, ty] = pts[pts.length - 1];

  /* The nose follows the trail: the chord over the last fifth of the path,
     not the last pair of samples — a two-point slope shifts every frame and
     makes the jet tremble. The stage is locked to the viewBox's own aspect,
     so an angle measured in viewBox units is the angle drawn on screen.
     Off the pad there is no path yet, so it sits at a launch pitch. */
  const back = pts[Math.max(0, STEPS - 8)];
  const angle = Number(
    (travel < 0.05
      ? -46
      : Math.max(-58, Math.min(-8, (Math.atan2(ty - back[1], tx - back[0]) * 180) / Math.PI))
    ).toFixed(2),
  );
  const scale = (1 - travel * 0.18).toFixed(3);

  const line = `M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}`;
  const area = `${line} L ${tx} ${FLOOR} L ${PAD_X} ${FLOOR} Z`;

  const label = busted ? fmtX(settled!.crashAt) : fmtX(shown);
  const cashNow = Math.floor(g.stake * multiplier);

  return (
    <GameShell
      game="jetx"
      balance={g.balance}
      history={g.history}
      fairness={r.fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className={`jx${busted ? ' is-busted' : ''}${flying ? ' is-live' : ''}`}>
        <div className="jx-stage">
          {/* the sky: drifting stars, a planet on the horizon and a grid that
              slides past, so the jet reads as moving even while the nose is
              parked at cruise */}
          <span className="jx-stage__stars" aria-hidden />
          <span className="jx-stage__planet" aria-hidden />
          <span className="jx-stage__grid" aria-hidden />

          <svg className="jx-stage__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="jx-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff3b30" stopOpacity=".38" />
                <stop offset="100%" stopColor="#ff3b30" stopOpacity="0" />
              </linearGradient>
              <linearGradient id="jx-line" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#ff2d55" />
                <stop offset="60%" stopColor="#ff7a1a" />
                <stop offset="100%" stopColor="#ffd166" />
              </linearGradient>
              <filter id="jx-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation=".9" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* the burn mark is the round's; once it busts the sky goes bare
                and only the jet leaves the frame */}
            {!busted && travel > 0 && (
              <>
                <path d={area} fill="url(#jx-area)" />
                <path
                  d={line}
                  fill="none"
                  stroke="url(#jx-line)"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#jx-glow)"
                />
              </>
            )}

            <g transform={`translate(${tx} ${ty}) rotate(${angle}) scale(${scale})`}>
              {/* the wobble lives on an inner group: React drives the outer
                  transform every frame and a CSS animation there would be
                  overwritten by it */}
              <g className={`jx-craft${flying ? ' is-flying' : ''}`}>
                <JetSprite gone={busted} />
              </g>
            </g>
          </svg>

          <div className="jx-hud">
            {busted && <b className="jx-hud__flew">উড়ে গেছে!</b>}
            <div className={`jx-hud__x${busted ? ' is-busted' : phase === 'settled' ? ' is-won' : ''}`}>
              {label}
            </div>
            {flying ? (
              <div className="jx-hud__take">এখন নিলে {money(cashNow)}</div>
            ) : phase === 'settled' && settled?.won ? (
              <div className="jx-hud__take is-won">পেয়েছেন {money(settled.payout / 100)}</div>
            ) : (
              <div className="jx-hud__idle">বাজি দিন — জেট ছাড়ুন</div>
            )}
          </div>

          <span className="jx-stage__tag" aria-hidden>JETX</span>
        </div>
      </div>

      <div className="mg-panel">
        <label className="mg-auto">
          <input
            type="checkbox"
            checked={r.autoOn}
            disabled={flying}
            onChange={(e) => r.setAutoOn(e.target.checked)}
          />
          <span>অটো ক্যাশ আউট</span>
          <input
            className="mg-auto__at"
            type="number"
            step={0.1}
            min={1.01}
            max={1000}
            value={r.autoAt}
            disabled={flying || !r.autoOn}
            onChange={(e) => r.setAutoAt(Math.max(1.01, Number(e.target.value)))}
          />
          <em>x</em>
        </label>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={flying || g.busy} />

        {g.err && <p className="cz-err">{g.err}</p>}

        {flying ? (
          <button type="button" className="btn btn--block jx-go jx-go--cash" onClick={() => void r.cashOut()}>
            <b>ক্যাশ আউট</b>
            <span>{fmtX(multiplier)} — {money(cashNow)}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--block jx-go jx-go--bet"
            disabled={g.busy}
            onClick={() => void r.takeOff()}
          >
            <b>{g.busy ? 'ছাড়া হচ্ছে…' : 'বাজি'}</b>
            <span>{money(g.stake)}</span>
          </button>
        )}
      </div>
    </GameShell>
  );
}
