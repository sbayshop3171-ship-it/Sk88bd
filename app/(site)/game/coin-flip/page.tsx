'use client';

import { useState } from 'react';
import GameGate from '@/components/GameGate';
import GameShell from '@/components/mini/GameShell';
import StakeBar from '@/components/mini/StakeBar';
import { useImmersive } from '@/components/mini/useImmersive';
import { useMiniGame } from '@/components/mini/useMiniGame';
import { money } from '@/lib/brand';
import { COIN_MULTIPLIER, fmtX, type CoinSide, type FairnessInfo } from '@/lib/mini-games';

const SIDES: { id: CoinSide; label: string; face: string }[] = [
  { id: 'heads', label: 'হেড', face: '৳' },
  { id: 'tails', label: 'টেইল', face: '★' },
];

export default function CoinFlipPage() {
  return <GameGate><Board /></GameGate>;
}

function Board() {
  useImmersive();
  const g = useMiniGame('coin-flip');
  const [side, setSide] = useState<CoinSide>('heads');
  const [fairness, setFairness] = useState<FairnessInfo | null>(null);
  const [face, setFace] = useState<CoinSide | null>(null);
  const [spinning, setSpinning] = useState(false);
  const [won, setWon] = useState<boolean | null>(null);
  const [payout, setPayout] = useState(0);

  const flip = async () => {
    setWon(null);
    setSpinning(true);
    const result = await g.play({ side });
    if (!result) { setSpinning(false); return; }

    // let the coin turn for a beat before it lands on the drawn face
    setTimeout(() => {
      setFace(result.detail.face as CoinSide);
      setFairness(result.fairness);
      setWon(result.won);
      setPayout(result.payout / 100);
      setSpinning(false);
    }, 900);
  };

  const shown = face ?? side;

  return (
    <GameShell
      game="coin-flip"
      balance={g.balance}
      history={g.history}
      fairness={fairness}
      clientSeed={g.clientSeed}
      onNewSeed={g.newSeed}
    >
      <div className="mg-board mg-coin">
        <div className={`mg-coin__coin${spinning ? ' spin' : ''}${shown === 'tails' ? ' tails' : ''}`}>
          <span className="mg-coin__face mg-coin__face--h">৳</span>
          <span className="mg-coin__face mg-coin__face--t">★</span>
        </div>

        <p className="mg-board__line">
          {spinning
            ? 'কয়েন ঘুরছে…'
            : won === null
              ? `জিতলে ${fmtX(COIN_MULTIPLIER)} — ${money(Math.round(g.stake * COIN_MULTIPLIER))}`
              : won
                ? `${SIDES.find((s) => s.id === face)?.label} — জিতেছেন ${money(payout)}`
                : `${SIDES.find((s) => s.id === face)?.label} — এবার হয়নি`}
        </p>
      </div>

      <div className="mg-panel">
        <div className="mg-pick">
          {SIDES.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`mg-pick__btn${side === s.id ? ' on' : ''}`}
              disabled={g.busy || spinning}
              onClick={() => { setSide(s.id); g.setErr(''); }}
            >
              <i aria-hidden>{s.face}</i>
              <span>{s.label}</span>
            </button>
          ))}
        </div>

        <StakeBar stake={g.stake} setStake={g.setStake} balance={g.balance} disabled={g.busy || spinning} />

        {g.err && <p className="cz-err">{g.err}</p>}

        <button
          type="button"
          className="btn btn--gold btn--block mg-go"
          disabled={g.busy || spinning}
          onClick={() => void flip()}
        >
          {g.busy || spinning ? 'টস হচ্ছে…' : `${money(g.stake)} বাজি — টস করুন`}
        </button>
      </div>
    </GameShell>
  );
}
