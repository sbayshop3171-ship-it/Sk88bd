'use client';

import { useEffect, useRef, useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { money } from '@/lib/brand';
import {
  PLINKO_ROWS,
  PLINKO_TABLES,
  type FairnessInfo,
  type PlinkoRisk,
  type PlinkoRows,
} from '@/lib/mini-games';

const RISKS: { id: PlinkoRisk; label: string }[] = [
  { id: 'low', label: 'Low' },
  { id: 'medium', label: 'Medium' },
  { id: 'high', label: 'High' },
];

/* The board is drawn in a 100-wide viewBox: a triangle of pegs with row i
   holding i+1 of them, so R rows leave R+1 slots at the bottom — exactly the
   buckets the payout table is indexed by. */
const W = 100;
const TOP = 8;

export default function PlinkoPage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('plinko');
  const [rows, setRows] = useState<PlinkoRows>(12);
  const [risk, setRisk] = useState<PlinkoRisk>('medium');
  const [path, setPath] = useState<number[] | null>(null);
  const [step, setStep] = useState(0);
  const [landed, setLanded] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  /** the settled bucket, held back until the ball actually gets there —
      lighting it up early would give the round away */
  const pending = useRef<{ bucket: number; won: boolean } | null>(null);

  const table = PLINKO_TABLES[risk][rows];
  const sx = W / (rows + 2);
  const sy = 82 / (rows + 1);
  const H = TOP + sy * (rows + 1) + 6;

  /* Drop the ball one row at a time so the path on screen is the path the
     server drew, not a re-roll in the browser. */
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!path) return;
    setStep(0);
    timer.current = setInterval(() => {
      setStep((s) => {
        if (s >= path.length) {
          if (timer.current) clearInterval(timer.current);
          // the ball is home: only now is the bucket allowed to light up
          if (pending.current) {
            setLanded(pending.current.bucket);
            setWon(pending.current.won);
            pending.current = null;
          }
          return s;
        }
        return s + 1;
      });
    }, 90);
    return () => { if (timer.current) clearInterval(timer.current); };
  }, [path]);

  const dropping = path !== null && step < path.length;

  const send = async () => {
    setWon(null);
    setLanded(null);
    setPath(null);
    const r = await g.play({ rows, risk });
    if (!r) return;
    pending.current = { bucket: r.detail.bucket as number, won: r.won };
    setPath(r.detail.path as number[]);
    setFairness(r.fairness);
  };

  // where the ball sits after `step` rows
  const passed = path ? path.slice(0, step) : [];
  const rights = passed.reduce((a, b) => a + b, 0);
  const ballX = W / 2 + (rights - step / 2) * sx;
  const ballY = TOP + step * sy;

  return (
    <GameShell
      game="plinko"
      balance={g.balance}
      history={g.history}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className="mg-board mg-plinko">
        <svg className="mg-plinko__svg" viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Plinko board">
          {Array.from({ length: rows }, (_, i) =>
            Array.from({ length: i + 1 }, (_, j) => (
              <circle
                key={`${i}-${j}`}
                cx={W / 2 + (j - i / 2) * sx}
                cy={TOP + (i + 1) * sy}
                r={Math.max(0.7, sx * 0.11)}
                className="mg-plinko__peg"
              />
            )),
          )}
          <circle cx={ballX} cy={ballY} r={sx * 0.3} className="mg-plinko__ball" />
        </svg>

        <div className={`mg-plinko__buckets rows-${rows}`}>
          {table.map((m, i) => (
            <span
              key={i}
              className={`mg-plinko__bucket${landed === i ? (won ? ' hit win' : ' hit') : ''}`}
              style={{ ['--heat' as string]: String(Math.min(1, m / table[0])) }}
            >
              {m >= 100 ? Math.round(m) : m.toFixed(m >= 10 ? 1 : 2)}
            </span>
          ))}
        </div>

        <p className="mg-board__line">
          {dropping
            ? 'The ball is dropping…'
            : landed === null
              ? `${rows} rows · risk ${RISKS.find((r) => r.id === risk)?.label}`
              : `${table[landed]}× — ${won ? `returns ${money(Math.floor(g.stake * table[landed]))}` : 'not this time'}`}
        </p>
      </div>

      <div className="mg-panel">
        <div className="mg-seg">
          {PLINKO_ROWS.map((r) => (
            <button
              key={r}
              type="button"
              className={rows === r ? 'on' : undefined}
              disabled={g.busy || dropping}
              onClick={() => { setRows(r); setLanded(null); setPath(null); }}
            >
              {r} rows
            </button>
          ))}
        </div>
        <div className="mg-seg">
          {RISKS.map((r) => (
            <button
              key={r.id}
              type="button"
              className={risk === r.id ? 'on' : undefined}
              disabled={g.busy || dropping}
              onClick={() => { setRisk(r.id); setLanded(null); setPath(null); }}
            >
              Risk {r.label}
            </button>
          ))}
        </div>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={g.busy || dropping} />

        {g.err && <p className="cz-err">{g.err}</p>}

        <button
          type="button"
          className="btn btn--gold btn--block mg-go"
          disabled={g.busy || dropping}
          onClick={() => void send()}
        >
          {g.busy || dropping ? 'The ball is dropping…' : `Stake ${money(g.stake)} — Drop the ball`}
        </button>
      </div>
    </GameShell>
  );
}
