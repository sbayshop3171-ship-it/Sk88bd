'use client';

import { money } from '@/lib/brand';
import { MAX_STAKE, MIN_STAKE } from './useMiniGame';

const CHIPS = [50, 100, 500, 1000];

/** The stake box every game shares: type it, halve it, double it, or take a
    chip. Clamped to the same range the server enforces, so the button never
    sends something that comes straight back as an error. */
export default function StakeBar({
  stake,
  setStake,
  balance,
  disabled,
}: {
  stake: number;
  setStake: (n: number) => void;
  balance: number;
  disabled?: boolean;
}) {
  const clamp = (n: number) =>
    Math.max(MIN_STAKE, Math.min(MAX_STAKE, Math.round(n)));

  return (
    <div className="mg-stake">
      <div className="mg-stake__row">
        <label className="mg-stake__box">
          <span>৳</span>
          <input
            type="number"
            inputMode="numeric"
            min={MIN_STAKE}
            max={MAX_STAKE}
            value={Number.isFinite(stake) ? stake : ''}
            disabled={disabled}
            onChange={(e) => setStake(Number(e.target.value))}
          />
        </label>
        <button type="button" disabled={disabled} onClick={() => setStake(clamp(stake / 2))}>½</button>
        <button type="button" disabled={disabled} onClick={() => setStake(clamp(stake * 2))}>2×</button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => setStake(clamp(Math.min(balance, MAX_STAKE)))}
        >
          Max
        </button>
      </div>
      <div className="mg-stake__chips">
        {CHIPS.map((c) => (
          <button
            key={c}
            type="button"
            className={stake === c ? 'on' : undefined}
            disabled={disabled}
            onClick={() => setStake(c)}
          >
            {money(c)}
          </button>
        ))}
      </div>
    </div>
  );
}
