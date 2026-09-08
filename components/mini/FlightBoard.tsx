'use client';

import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useFlightRound } from '@/components/mini/useFlightRound';
import { money } from '@/lib/brand';
import { fmtX, flightMultiplierAt, flightTimeToReach } from '@/lib/mini-games';

const W = 100;
const H = 62;

/**
 * Crash: a bare line on a dark card, which is the whole point of the game —
 * nothing to look at but the number going up. JetX flies the same rounds
 * behind a very different screen (see JetXBoard); the rules they share live
 * in useFlightRound.
 */
export default function FlightBoard({ game }: { game: 'crash' | 'jetx' }) {
  useImmersive();
  const r = useFlightRound(game);
  const { g, phase, multiplier, settled, busted } = r;

  /* ---------- the curve ---------- */

  const elapsed = phase === 'flying' ? flightTimeToReach(game, multiplier) : 0;
  const spanMs = Math.max(6000, elapsed * 1.1);
  const top = Math.max(2, multiplier * 1.15);
  const points: string[] = [];
  const STEPS = 48;
  for (let i = 0; i <= STEPS; i++) {
    const t = (spanMs * i) / STEPS;
    if (t > elapsed && phase === 'flying') break;
    const m = flightMultiplierAt(game, Math.min(t, elapsed || spanMs));
    points.push(`${(t / spanMs) * W},${H - ((m - 1) / (top - 1)) * H}`);
    if (t >= elapsed && phase !== 'flying') break;
  }
  const head = points[points.length - 1]?.split(',').map(Number) ?? [0, H];

  const label = busted ? fmtX(settled!.crashAt) : fmtX(multiplier);

  return (
    <GameShell
      game={game}
      balance={g.balance}
      history={g.history}
      fairness={r.fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className={`mg-board mg-flight${busted ? ' busted' : ''}${phase === 'flying' ? ' live' : ''}`}>
        <div className={`mg-flight__x${busted ? ' lose' : phase === 'settled' ? ' win' : ''}`}>{label}</div>

        {/* the craft rides the head of the curve, so it is positioned inside
            the plot box rather than the card — percentages of the card would
            put it anywhere but on the line. */}
        <div className="mg-flight__plot">
        <svg className="mg-flight__svg" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden>
          <defs>
            <linearGradient id={`mg-fill-${game}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--mg-accent)" stopOpacity="0.35" />
              <stop offset="100%" stopColor="var(--mg-accent)" stopOpacity="0" />
            </linearGradient>
          </defs>
          {points.length > 1 && (
            <>
              <polygon
                className="mg-flight__fill"
                points={`0,${H} ${points.join(' ')} ${head[0]},${H}`}
                fill={`url(#mg-fill-${game})`}
              />
              <polyline className="mg-flight__line" points={points.join(' ')} />
            </>
          )}
          <circle className="mg-flight__head" cx={head[0]} cy={head[1]} r={1.8} />
        </svg>
          <span
            className={`mg-flight__craft${busted ? ' gone' : ''}`}
            style={{ left: `${head[0]}%`, top: `${(head[1] / H) * 100}%` }}
            aria-hidden
          >
            {game === 'jetx' ? '🚀' : '📈'}
          </span>
        </div>

        <p className="mg-board__line">
          {phase === 'flying'
            ? `${money(g.stake)} উড়ছে — এখন ক্যাশ আউট করলে ${money(Math.floor(g.stake * multiplier))}`
            : phase === 'settled' && settled
              ? settled.won
                ? `${fmtX(settled.multiplier)} এ নেমেছেন — পেয়েছেন ${money(settled.payout / 100)}`
                : `${fmtX(settled.crashAt)} এ শেষ — ${money(settled.stake / 100)} হেরেছেন`
              : 'বাজি দিয়ে উড়ান শুরু করুন'}
        </p>
      </div>

      <div className="mg-panel">
        <label className="mg-auto">
          <input
            type="checkbox"
            checked={r.autoOn}
            disabled={phase === 'flying'}
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
            disabled={phase === 'flying' || !r.autoOn}
            onChange={(e) => r.setAutoAt(Math.max(1.01, Number(e.target.value)))}
          />
          <em>x</em>
        </label>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={phase === 'flying' || g.busy} />

        {g.err && <p className="cz-err">{g.err}</p>}

        {phase === 'flying' ? (
          <button type="button" className="btn btn--block mg-go mg-go--cash" onClick={() => void r.cashOut()}>
            ক্যাশ আউট {fmtX(multiplier)} — {money(Math.floor(g.stake * multiplier))}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--gold btn--block mg-go"
            disabled={g.busy}
            onClick={() => void r.takeOff()}
          >
            {g.busy ? 'শুরু হচ্ছে…' : `${money(g.stake)} বাজি — উড়ান শুরু`}
          </button>
        )}
      </div>
    </GameShell>
  );
}
