'use client';

import { useEffect, useRef, useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { money } from '@/lib/brand';
import {
  LIMBO_MAX_TARGET,
  LIMBO_MIN_TARGET,
  RTP,
  fmtX,
  randomHex,
  type FairnessInfo,
} from '@/lib/mini-games';

const QUICK = [1.5, 2, 5, 10, 50];

/** The two fields are one number seen twice: staking on t pays RTP whatever
    t is, so the chance of clearing it is fixed at RTP/t. Either box may be
    typed into and the other follows. */
const chanceOf = (target: number) => (RTP / target) * 100;
const targetOf = (chance: number) => (RTP / (chance / 100));

const clampTarget = (n: number) =>
  Math.round(Math.min(LIMBO_MAX_TARGET, Math.max(LIMBO_MIN_TARGET, n)) * 100) / 100;

/** Four decimals: at 1000x the chance is 0.0970%, and rounding it to two
    would read as a flat zero. */
const fmtChance = (n: number) => `${n.toFixed(n < 1 ? 4 : 2)}%`;

/** One past round as the strip shows it — the drawn number every time, since
    on a loss that is the only thing worth looking at. */
type Run = { id: string; label: string; won: boolean };

export default function LimboPage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('limbo');
  const [target, setTarget] = useState(2);
  const [targetText, setTargetText] = useState('2.00');
  const [chanceText, setChanceText] = useState(chanceOf(2).toFixed(2));
  const [shown, setShown] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [rolling, setRolling] = useState(false);
  const [runs, setRuns] = useState<Run[]>([]);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);

  const chance = chanceOf(target);
  const profit = Math.floor(g.stake * target) - g.stake;

  /* One number, two boxes. Whichever the player typed keeps their own text
     while it is being edited — reformatting mid-keystroke would fight them —
     and the other is rewritten from the committed value. */
  const commit = (next: number, keep: 'target' | 'chance') => {
    const t = clampTarget(next);
    setTarget(t);
    if (keep !== 'target') setTargetText(t.toFixed(2));
    if (keep !== 'chance') setChanceText(chanceOf(t).toFixed(chanceOf(t) < 1 ? 4 : 2));
    g.setErr('');
  };

  const setT = (n: number) => {
    const t = clampTarget(n);
    setTarget(t);
    setTargetText(t.toFixed(2));
    setChanceText(chanceOf(t).toFixed(chanceOf(t) < 1 ? 4 : 2));
    g.setErr('');
  };

  /* The draw lands in one go on the server, so the number has to earn the
     wait: it riffles through plausible values for a beat and then stops on
     the real one. A count-up from 1.00 gives the answer away early — you can
     see it coasting past your target long before it stops. */
  const timers = useRef<number[]>([]);
  const stopRoll = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => stopRoll, []);

  const reduced = () =>
    typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

  const riffle = (result: number, settle: () => void) => {
    stopRoll();
    if (reduced()) { setShown(result); settle(); return; }

    setRolling(true);
    const SPAN = 620;
    const started = performance.now();
    const step = () => {
      const left = SPAN - (performance.now() - started);
      if (left <= 0) {
        setRolling(false);
        setShown(result);
        settle();
        return;
      }
      // the same 1/(1−r) shape the draw itself has, so the flicker never
      // shows a number the game could not produce
      setShown(Math.max(1, Math.floor((RTP / (1 - Math.random())) * 100) / 100));
      // slows as it lands: 40ms at the start, ~110ms on the last few
      timers.current.push(window.setTimeout(step, 40 + (1 - left / SPAN) * 70));
    };
    step();
  };

  const send = async () => {
    if (g.busy || rolling) return;
    setWon(null);
    stopRoll();
    const r = await g.play({ target });
    if (!r) return;
    const drawn = r.detail.result as number;
    setFairness(r.fairness);
    riffle(drawn, () => {
      setWon(r.won);
      setRuns((prev) => [{ id: randomHex(4), label: fmtX(drawn), won: r.won }, ...prev].slice(0, 12));
    });
  };

  const state = rolling ? 'rolling' : won === null ? 'idle' : won ? 'win' : 'lose';
  const busy = g.busy || rolling;

  return (
    <GameShell
      game="limbo"
      balance={g.balance}
      history={g.history}
      runs={runs}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className={`mg-board mg-limbo is-${state}`}>
        <div className="mg-limbo__stage">
          <span className="mg-limbo__glow" aria-hidden />
          <div className="mg-limbo__num" aria-live="polite">
            {fmtX(shown ?? 1)}
          </div>
          <p className="mg-limbo__mark">
            <span>Target</span>
            <b>{fmtX(target)}</b>
          </p>
        </div>

        <p className="mg-board__line">
          {state === 'rolling'
            ? 'Drawing…'
            : state === 'idle'
              ? `Win if it lands on ${fmtX(target)} or above`
              : state === 'win'
                ? `Passed ${fmtX(target)} — you won ${money(Math.floor(g.stake * target))}`
                : `It did not reach ${fmtX(target)}`}
        </p>
      </div>

      <div className="mg-panel">
        <div className="mg-limbo__pair">
          <label className="mg-field">
            <span>Target multiplier</span>
            <input
              type="text"
              inputMode="decimal"
              value={targetText}
              disabled={busy}
              onChange={(e) => {
                setTargetText(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) commit(n, 'target');
              }}
              onBlur={() => setT(Number(targetText) || target)}
            />
          </label>
          <label className="mg-field">
            <span>Win chance</span>
            <input
              type="text"
              inputMode="decimal"
              value={chanceText}
              disabled={busy}
              onChange={(e) => {
                setChanceText(e.target.value);
                const n = Number(e.target.value);
                if (Number.isFinite(n) && n > 0) commit(targetOf(n), 'chance');
              }}
              onBlur={() => setT(target)}
            />
            <i aria-hidden>%</i>
          </label>
        </div>

        <div className="mg-stake__chips">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              className={target === q ? 'on' : undefined}
              disabled={busy}
              onClick={() => setT(q)}
            >
              {fmtX(q)}
            </button>
          ))}
        </div>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={busy} />

        <div className="mg-odds">
          <p><span>Chance</span><b>{fmtChance(chance)}</b></p>
          <p><span>Profit if you win</span><b className="gold">+{money(profit)}</b></p>
          <p><span>Returns</span><b>{money(Math.floor(g.stake * target))}</b></p>
        </div>

        {g.err && <p className="cz-err">{g.err}</p>}

        <button
          type="button"
          className="btn btn--gold btn--block mg-go"
          disabled={busy}
          onClick={() => void send()}
        >
          {busy ? 'Drawing…' : `Stake ${money(g.stake)} — Play`}
        </button>
      </div>
    </GameShell>
  );
}
