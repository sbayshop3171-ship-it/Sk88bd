'use client';

import { useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import SlotBoard, { SlotPaytable } from '@/components/mini/SlotBoard';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { money } from '@/lib/brand';
import { type FairnessInfo } from '@/lib/mini-games';
import type { SlotRound } from '@/lib/slots';

export default function GoldenAcePage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('golden-ace');

  const [round, setRound] = useState<SlotRound | null>(null);
  /** the stake the round on screen was played at — the box can move while a
      replay is still running, and the win must be read against the old one */
  const [playedFor, setPlayedFor] = useState(0);
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  const [replaying, setReplaying] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const spin = async () => {
    if (g.busy || replaying) return;
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
          onDone={() => setReplaying(false)}
        />

        <StakeBar
          stake={g.stake}
          setStake={g.setStake}
          balance={g.balance}
          disabled={busy}
        />

        <button
          type="button"
          className="btn btn--gold btn--block mg-slot__spin"
          disabled={busy}
          onClick={spin}
        >
          {g.busy ? 'Dealing…' : replaying ? 'Playing…' : `Spin ${money(g.stake)}`}
        </button>

        {g.err && <p className="field__err">{g.err}</p>}

        <button
          type="button"
          className="sl-pay__toggle"
          onClick={() => setPayOpen((v) => !v)}
          aria-expanded={payOpen}
        >
          Paytable &amp; rules
          <span className={`cz-chev${payOpen ? ' up' : ''}`} aria-hidden>⌃</span>
        </button>
        {payOpen && <SlotPaytable />}
      </div>
    </GameShell>
  );
}
