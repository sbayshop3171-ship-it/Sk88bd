'use client';

import { useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { money } from '@/lib/brand';
import {
  DICE_MAX_TARGET,
  DICE_MIN_TARGET,
  diceChance,
  diceMultiplier,
  fmtX,
  type DiceMode,
  type FairnessInfo,
} from '@/lib/mini-games';

export default function DicePage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('dice');
  const [mode, setMode] = useState<DiceMode>('over');
  const [target, setTarget] = useState(50);
  const [roll, setRoll] = useState<number | null>(null);
  const [won, setWon] = useState<boolean | null>(null);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);

  const chance = diceChance(mode, target) * 100;
  const multiplier = diceMultiplier(mode, target);

  const send = async () => {
    setWon(null);
    const result = await g.play({ mode, target });
    if (!result) return;
    setRoll(result.detail.roll as number);
    setWon(result.won);
    setFairness(result.fairness);
  };

  return (
    <GameShell
      game="dice"
      balance={g.balance}
      history={g.history}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className="mg-board mg-dice">
        <div className={`mg-dice__roll${won === null ? '' : won ? ' win' : ' lose'}`}>
          {roll === null ? '—' : roll.toFixed(2)}
        </div>

        {/* the track: the winning side is lit, the marker sits where it landed */}
        <div className="mg-dice__track">
          <span
            className={`mg-dice__zone${mode === 'under' ? ' on' : ''}`}
            style={{ width: `${target}%` }}
          />
          <span
            className={`mg-dice__zone mg-dice__zone--r${mode === 'over' ? ' on' : ''}`}
            style={{ width: `${100 - target}%` }}
          />
          <span className="mg-dice__cut" style={{ left: `${target}%` }} />
          {roll !== null && (
            <span className={`mg-dice__pin${won ? ' win' : ' lose'}`} style={{ left: `${roll}%` }}>
              <b>{roll.toFixed(2)}</b>
            </span>
          )}
        </div>
        <div className="mg-dice__ends"><span>0</span><span>50</span><span>100</span></div>

        <input
          className="mg-dice__slider"
          type="range"
          min={DICE_MIN_TARGET}
          max={DICE_MAX_TARGET}
          value={target}
          disabled={g.busy}
          onChange={(e) => { setTarget(Number(e.target.value)); g.setErr(''); }}
        />

        <div className="mg-odds">
          <p><span>{mode === 'over' ? 'Over' : 'Under'}</span><b>{target}</b></p>
          <p><span>Win chance</span><b>{chance.toFixed(2)}%</b></p>
          <p><span>Multiplier</span><b className="gold">{fmtX(multiplier)}</b></p>
        </div>
      </div>

      <div className="mg-panel">
        <div className="mg-pick">
          {(['under', 'over'] as DiceMode[]).map((m) => (
            <button
              key={m}
              type="button"
              className={`mg-pick__btn${mode === m ? ' on' : ''}`}
              disabled={g.busy}
              onClick={() => { setMode(m); g.setErr(''); }}
            >
              <i aria-hidden>{m === 'under' ? '▼' : '▲'}</i>
              <span>{m === 'under' ? 'Under' : 'Over'}</span>
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
          {g.busy ? 'Rolling…' : `Stake ${money(g.stake)} — win ${money(Math.floor(g.stake * multiplier))}`}
        </button>
      </div>
    </GameShell>
  );
}
