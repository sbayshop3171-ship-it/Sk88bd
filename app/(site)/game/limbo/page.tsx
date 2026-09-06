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
  type FairnessInfo,
} from '@/lib/mini-games';

const QUICK = [1.5, 2, 5, 10, 50];

export default function LimboPage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('limbo');
  const [target, setTarget] = useState(2);
  const [result, setResult] = useState<number | null>(null);
  const [shown, setShown] = useState(1);
  const [won, setWon] = useState<boolean | null>(null);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);

  const chance = (RTP / Math.max(LIMBO_MIN_TARGET, target)) * 100;

  /* The drawn number counts up to where it landed — the whole tension of
     limbo is watching it climb past your target, or stall short of it. */
  const raf = useRef(0);
  useEffect(() => {
    if (result === null) return;
    const from = 1;
    const started = performance.now();
    const span = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - started) / span);
      // ease-out so it slows into the final number
      const eased = 1 - Math.pow(1 - p, 3);
      setShown(from + (result - from) * eased);
      if (p < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [result]);

  const send = async () => {
    setWon(null);
    setResult(null);
    setShown(1);
    const r = await g.play({ target });
    if (!r) return;
    setResult(r.detail.result as number);
    setWon(r.won);
    setFairness(r.fairness);
  };

  const setT = (n: number) => {
    const clamped = Math.min(LIMBO_MAX_TARGET, Math.max(LIMBO_MIN_TARGET, n));
    setTarget(Math.round(clamped * 100) / 100);
    g.setErr('');
  };

  return (
    <GameShell
      game="limbo"
      balance={g.balance}
      history={g.history}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className="mg-board mg-limbo">
        <div className={`mg-limbo__num${won === null ? '' : won ? ' win' : ' lose'}`}>
          {fmtX(result === null ? 1 : shown)}
        </div>
        <p className="mg-board__line">
          {won === null
            ? `${fmtX(target)} বা তার বেশি উঠলে জয়`
            : won
              ? `${fmtX(target)} পেরিয়েছে — জিতেছেন`
              : `${fmtX(target)} পর্যন্ত ওঠেনি`}
        </p>

        <div className="mg-odds">
          <p><span>টার্গেট</span><b>{fmtX(target)}</b></p>
          <p><span>সম্ভাবনা</span><b>{chance.toFixed(2)}%</b></p>
          <p><span>জিতলে</span><b className="gold">{money(Math.floor(g.stake * target))}</b></p>
        </div>
      </div>

      <div className="mg-panel">
        <label className="mg-target">
          <span>টার্গেট গুণ</span>
          <input
            type="number"
            inputMode="decimal"
            step={0.01}
            min={LIMBO_MIN_TARGET}
            max={LIMBO_MAX_TARGET}
            value={target}
            disabled={g.busy}
            onChange={(e) => setT(Number(e.target.value))}
          />
        </label>
        <div className="mg-stake__chips">
          {QUICK.map((q) => (
            <button
              key={q}
              type="button"
              className={target === q ? 'on' : undefined}
              disabled={g.busy}
              onClick={() => setT(q)}
            >
              {fmtX(q)}
            </button>
          ))}
        </div>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={g.busy} />

        {g.err && <p className="cz-err">{g.err}</p>}

        <button
          type="button"
          className="btn btn--gold btn--block mg-go"
          disabled={g.busy}
          onClick={() => void send()}
        >
          {g.busy ? 'ড্র হচ্ছে…' : `${money(g.stake)} বাজি — খেলুন`}
        </button>
      </div>
    </GameShell>
  );
}
