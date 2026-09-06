'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import {
  MINI_ERROR,
  fmtX,
  flightMultiplierAt,
  type FairnessInfo,
  type FlightRoundView,
  type FlightSettled,
  type MiniReason,
} from '@/lib/mini-games';

type Phase = 'idle' | 'flying' | 'settled';

const W = 100;
const H = 62;
/** how often the screen asks whether the round is still in the air */
const POLL_MS = 500;

/**
 * Crash and JetX. One player, one round: the stake leaves the wallet on
 * take-off and the multiplier climbs on the server's clock. The browser is
 * never told where the round busts — it finds out the same way the player
 * does, by asking and being told the round is over.
 */
export default function FlightBoard({ game }: { game: 'crash' | 'jetx' }) {
  useImmersive();
  const g = useMiniGame(game);

  const [phase, setPhase] = useState<Phase>('idle');
  const [multiplier, setMultiplier] = useState(1);
  const [settled, setSettled] = useState<FlightSettled | null>(null);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  const [autoOn, setAutoOn] = useState(false);
  const [autoAt, setAutoAt] = useState(2);

  /** server clock − ours, so the curve is drawn off the same start the
      payout is measured from */
  const skew = useRef(0);
  const startedAt = useRef(0);
  const phaseRef = useRef<Phase>('idle');
  phaseRef.current = phase;
  const cashingRef = useRef(false);

  const now = useCallback(() => Date.now() + skew.current, []);

  const adopt = useCallback((round: FlightRoundView) => {
    skew.current = round.serverNow - Date.now();
    startedAt.current = round.startedAt;
    setFairness(round.fairness);
    setSettled(null);
    setMultiplier(1);
    setPhase('flying');
  }, []);

  /* ---------- settle ---------- */

  const cashOut = useCallback(async () => {
    if (cashingRef.current) return;
    cashingRef.current = true;
    g.setBusy(true);
    try {
      const data = await g.call({ action: 'cashout' });
      if (!data.ok) {
        // the round was already gone — drop back to idle rather than hang
        g.setErr(MINI_ERROR[(data as { reason: MiniReason }).reason] ?? MINI_ERROR['db-error']);
        setPhase('idle');
        return;
      }
      const s = data.settled!;
      setSettled(s);
      setFairness(s.fairness);
      setMultiplier(s.won ? s.multiplier : s.crashAt);
      g.setSettledBalance(toTaka(s.balance));
      g.remember(s.multiplier, s.won);
      setPhase('settled');
    } catch {
      g.setErr(MINI_ERROR['db-error']);
      setPhase('idle');
    } finally {
      cashingRef.current = false;
      g.setBusy(false);
    }
  }, [g]);

  /* ---------- the climb ---------- */

  useEffect(() => {
    if (phase !== 'flying') return;
    let raf = 0;
    const tick = () => {
      const m = flightMultiplierAt(game, now() - startedAt.current);
      setMultiplier(m);
      if (autoOn && m >= autoAt) { void cashOut(); return; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, game, now, autoOn, autoAt, cashOut]);

  /* The server is the only one that knows where the round dies, so the
     screen asks. When it answers "nothing in the air", the round has busted
     and settling reveals the seed and the crash point. */
  useEffect(() => {
    if (phase !== 'flying') return;
    const id = setInterval(async () => {
      if (cashingRef.current) return;
      try {
        const res = await fetch(`/api/mini-games?game=${game}`, { cache: 'no-store' });
        const data = (await res.json()) as { ok: boolean; round: FlightRoundView | null };
        if (data.ok && !data.round && phaseRef.current === 'flying') void cashOut();
      } catch { /* a dropped poll just means we ask again */ }
    }, POLL_MS);
    return () => clearInterval(id);
  }, [phase, game, cashOut]);

  /* Reload mid-flight and the round is still there — pick it back up. */
  useEffect(() => {
    let live = true;
    fetch(`/api/mini-games?game=${game}`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: { ok: boolean; round: FlightRoundView | null }) => {
        if (live && data.ok && data.round) adopt(data.round);
      })
      .catch(() => undefined);
    return () => { live = false; };
  }, [game, adopt]);

  /* ---------- take off ---------- */

  const takeOff = async () => {
    if (g.busy) return;
    if (g.stake > g.balance) { g.setErr(MINI_ERROR['insufficient-balance']); return; }
    g.setBusy(true);
    g.setErr('');
    try {
      const data = await g.call({ action: 'takeoff', stake: toPaisa(g.stake) });
      if (!data.ok) {
        g.setErr(MINI_ERROR[(data as { reason: MiniReason }).reason] ?? MINI_ERROR['db-error']);
        return;
      }
      adopt(data.round!);
    } catch {
      g.setErr(MINI_ERROR['db-error']);
    } finally {
      g.setBusy(false);
    }
  };

  /* ---------- the curve ---------- */

  const elapsed = phase === 'flying' ? now() - startedAt.current : 0;
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

  const busted = phase === 'settled' && settled ? !settled.won : false;
  const label = busted ? fmtX(settled!.crashAt) : fmtX(multiplier);

  return (
    <GameShell
      game={game}
      balance={g.balance}
      history={g.history}
      fairness={fairness}
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
            checked={autoOn}
            disabled={phase === 'flying'}
            onChange={(e) => setAutoOn(e.target.checked)}
          />
          <span>অটো ক্যাশ আউট</span>
          <input
            className="mg-auto__at"
            type="number"
            step={0.1}
            min={1.01}
            max={1000}
            value={autoAt}
            disabled={phase === 'flying' || !autoOn}
            onChange={(e) => setAutoAt(Math.max(1.01, Number(e.target.value)))}
          />
          <em>x</em>
        </label>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={phase === 'flying' || g.busy} />

        {g.err && <p className="cz-err">{g.err}</p>}

        {phase === 'flying' ? (
          <button type="button" className="btn btn--block mg-go mg-go--cash" onClick={() => void cashOut()}>
            ক্যাশ আউট {fmtX(multiplier)} — {money(Math.floor(g.stake * multiplier))}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn--gold btn--block mg-go"
            disabled={g.busy}
            onClick={() => void takeOff()}
          >
            {g.busy ? 'শুরু হচ্ছে…' : `${money(g.stake)} বাজি — উড়ান শুরু`}
          </button>
        )}
      </div>
    </GameShell>
  );
}
