'use client';

import { useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import SlotBoard, { SlotPaytable } from '@/components/mini/SlotBoard';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { type FairnessInfo } from '@/lib/mini-games';
import type { SlotRound } from '@/lib/slots';

export default function GoldenAcePage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('golden-ace');

  const [round, setRound] = useState<SlotRound | null>(null);
  /** the stake the round on screen was played at — the bet sheet can move
      while a replay is still running, and the win has to be read against
      the stake that actually bought it */
  const [playedFor, setPlayedFor] = useState(0);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [sheet, setSheet] = useState<'bet' | 'pay' | null>(null);

  const spin = async () => {
    if (g.busy || replaying) return;
    setSheet(null);
    setRound(null);
    const result = await g.play({});
    if (!result?.slot) return;
    setPlayedFor(result.stake / 100);
    setRound(result.slot);
    setFairness(result.fairness);
    setReplaying(true);
  };

  const busy = g.busy || replaying;

  return (
    <GameShell
      game="golden-ace"
      balance={g.balance}
      history={g.history}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className="mg-board mg-slot">
        <SlotBoard
          round={round}
          spinning={g.busy}
          stake={playedFor || g.stake}
          balance={g.balance}
          busy={busy}
          rounds={g.history.length}
          onSpin={spin}
          onBet={() => setSheet((s) => (s === 'bet' ? null : 'bet'))}
          onInfo={() => setSheet((s) => (s === 'pay' ? null : 'pay'))}
          onDone={() => setReplaying(false)}
        />

        {g.err && <p className="field__err sa__err">{g.err}</p>}

        {sheet === 'bet' && (
          <div className="sa-sheet">
            <h3>Bet per spin</h3>
            <StakeBar
              stake={g.stake}
              setStake={g.setStake}
              balance={g.balance}
              disabled={busy}
            />
            <button type="button" className="btn btn--gold btn--block" onClick={() => setSheet(null)}>
              Done
            </button>
          </div>
        )}

        {sheet === 'pay' && <SlotPaytable />}
      </div>
    </GameShell>
  );
}
