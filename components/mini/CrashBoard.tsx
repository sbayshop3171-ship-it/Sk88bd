'use client';

import { noseAngle, trailPoints, travelOf, yForMultiplier, type Stage } from '@/components/mini/flightPath';
import GameShell from '@/components/mini/GameShell';
import LiveBoard, { type MyRow } from '@/components/mini/LiveBoard';
import RocketSprite from '@/components/mini/RocketSprite';
import StakeBar from '@/components/mini/StakeBar';
import { useFlightRound } from '@/components/mini/useFlightRound';
import { useImmersive } from '@/components/mini/useImmersive';
import { useLiveBoard } from '@/components/mini/useLiveBoard';
import { money } from '@/lib/brand';
import { fmtX } from '@/lib/mini-games';

/* ============================================================
   Crash. The same rounds as JetX — one wallet, one commit–reveal
   draw — read as a chart instead of a sky: a rocket climbing a
   plotted curve over labelled gridlines, and an explosion on the
   line where the round died.

   Everything that decides money lives in useFlightRound; the
   geometry lives in flightPath. This file only draws.
   ============================================================ */

const STAGE: Stage = {
  W: 100, H: 76,
  padX: 10, floor: 64,
  tipX: 72, tipY: 14,
  /* Crash's curve is the gentler of the two, so it takes longer to fill the
     frame — the board should not have finished climbing before the number is
     worth watching. */
  cruiseAt: 2.6,
  steps: 40,
  launchPitch: -40, minPitch: -56, maxPitch: -8,
};

/** the rungs the y axis is labelled with — whichever of them the round has
    actually passed are the ones drawn */
const RUNGS = [1.5, 2, 3, 5, 10, 25, 50, 100, 250, 500, 1000];
const VISIBLE_RUNGS = 4;

/** the chart's own vertical rules — fixed, so the plot reads as a graph
    rather than a sky */
const COLUMNS = [22, 34, 46, 58, 70, 82, 94];

export default function CrashBoard() {
  useImmersive();
  const r = useFlightRound('crash');
  const board = useLiveBoard();
  const { g, phase, multiplier, settled, busted } = r;

  const flying = phase === 'flying';
  /* A settled round holds its last frame: a win parks the rocket where it was
     taken, a bust blows it up there. Idle sits it on the pad. */
  const shown = flying || phase === 'settled' ? multiplier : 1;
  const travel = travelOf(STAGE, shown);
  const pts = trailPoints('crash', STAGE, shown, travel);
  const [tx, ty] = pts[pts.length - 1];
  const angle = noseAngle(STAGE, pts, travel);
  const scale = (1 - travel * 0.16).toFixed(3);

  const line = `M ${pts.map(([x, y]) => `${x} ${y}`).join(' L ')}`;
  const area = `${line} L ${tx} ${STAGE.floor} L ${STAGE.padX} ${STAGE.floor} Z`;

  /* Only the rungs the round has passed, and only the top few — a young round
     would otherwise be crowded with lines it has not reached. */
  const rungs = RUNGS.filter((m) => m > 1.05 && m < shown * 0.96)
    .slice(-VISIBLE_RUNGS)
    .map((m) => ({ m, y: yForMultiplier(STAGE, shown, travel, m) }));

  const label = busted ? fmtX(settled!.crashAt) : fmtX(shown);
  const cashNow = Math.floor(g.stake * multiplier);

  /* the player's own row in the table beside the board */
  const mine: MyRow | null = flying
    ? { stake: g.stake, multiplier, out: false }
    : settled
      ? { stake: settled.stake / 100, multiplier: settled.multiplier, out: settled.won }
      : null;

  return (
    <GameShell
      game="crash"
      balance={g.balance}
      history={g.history}
      fairness={r.fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
      hideFair
    >
      <div className={`cr${busted ? ' is-busted' : ''}${flying ? ' is-live' : ''}`}>
        <div className="cr-stage">
          <span className="cr-stage__stars" aria-hidden />
          <span className="cr-stage__moon" aria-hidden />

          <svg className="cr-stage__svg" viewBox={`0 0 ${STAGE.W} ${STAGE.H}`} preserveAspectRatio="none" aria-hidden>
            <defs>
              <linearGradient id="cr-area" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#ff5a5a" stopOpacity=".34" />
                <stop offset="100%" stopColor="#ff5a5a" stopOpacity="0" />
              </linearGradient>
              {/* the climb reads as heat: safe at the root, hot at the head */}
              <linearGradient id="cr-line" x1="0" y1="1" x2="1" y2="0">
                <stop offset="0%" stopColor="#3ddc84" />
                <stop offset="45%" stopColor="#ffc42e" />
                <stop offset="100%" stopColor="#ff3b30" />
              </linearGradient>
              <filter id="cr-glow" x="-40%" y="-40%" width="180%" height="180%">
                <feGaussianBlur stdDeviation=".85" result="b" />
                <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
              </filter>
            </defs>

            {/* the graph paper */}
            <g className="cr-grid">
              {COLUMNS.map((x) => (
                <line key={x} x1={x} y1="2" x2={x} y2={STAGE.floor} />
              ))}
              <line className="cr-grid__axis" x1={STAGE.padX} y1={STAGE.floor} x2={STAGE.W} y2={STAGE.floor} />
              <line className="cr-grid__axis" x1={STAGE.padX} y1="2" x2={STAGE.padX} y2={STAGE.floor} />
            </g>

            {/* the rungs the round has passed, labelled */}
            {rungs.map(({ m, y }) => (
              <g className="cr-rung" key={m}>
                <line x1={STAGE.padX} y1={y} x2={STAGE.W} y2={y} />
                <text x={STAGE.padX - 1.5} y={y + 1.6} textAnchor="end">{m}x</text>
              </g>
            ))}

            {!busted && travel > 0 && (
              <>
                <path d={area} fill="url(#cr-area)" />
                <path
                  d={line}
                  fill="none"
                  stroke="url(#cr-line)"
                  strokeWidth="1.9"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#cr-glow)"
                />
              </>
            )}

            <g transform={`translate(${tx} ${ty}) rotate(${angle}) scale(${scale})`}>
              {/* the wobble rides an inner group: React rewrites the outer
                  transform every frame and would overwrite a CSS animation
                  put there */}
              <g className={`cr-craft${flying ? ' is-flying' : ''}`}>
                <RocketSprite gone={busted} />
              </g>
            </g>

            {/* the blast is left on the line where the round died */}
            {busted && (
              <g transform={`translate(${tx} ${ty})`}>
                <circle className="cr-burst" r="7" />
                <circle className="cr-burst cr-burst--core" r="3.4" />
              </g>
            )}
          </svg>

          <div className="fl-hud">
            {busted && <b className="fl-hud__flew">Crashed!</b>}
            <div className={`fl-hud__x${busted ? ' is-busted' : phase === 'settled' ? ' is-won' : ''}`}>
              {label}
            </div>
            {flying ? (
              <div className="fl-hud__take">Take now {money(cashNow)}</div>
            ) : phase === 'settled' && settled?.won ? (
              <div className="fl-hud__take is-won">You got {money(settled.payout / 100)}</div>
            ) : (
              <div className="fl-hud__idle">Place a bet — launch the rocket</div>
            )}
          </div>

          <span className="cr-stage__tag" aria-hidden>CRASH</span>

          {board.players > 0 && (
            <span className="fl-crowd" aria-label={`${board.players} playing`}>
              <i aria-hidden /><b>{board.players.toLocaleString('en-IN')}</b>
            </span>
          )}
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
          <span>Auto cash out</span>
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
          <button type="button" className="btn btn--block fl-go fl-go--cash" onClick={() => void r.cashOut()}>
            <b>Cash Out</b>
            <span>{fmtX(multiplier)} — {money(cashNow)}</span>
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--block fl-go fl-go--bet"
            disabled={g.busy}
            onClick={() => void r.takeOff()}
          >
            <b>{g.busy ? 'Launching…' : 'Bet'}</b>
            <span>{money(g.stake)}</span>
          </button>
        )}
      </div>

      <LiveBoard
        players={board.players}
        seats={board.seats}
        recent={board.recent}
        mine={mine}
        fairness={r.fairness}
        clientSeed={g.clientSeed}
        onNewSeed={g.newSeed}
      />
    </GameShell>
  );
}
