'use client';

import { fmtX, type Phase } from '@/lib/aviator';
import { money } from '@/lib/brand';

const QUICK = [100, 200, 500, 10000];
export const MIN_STAKE = 10;

/** One betting seat. A round can carry two of these, independently. */
export interface Slot {
  stake: number;
  /** blank = manual cash out */
  autoAt: string;
  /** re-place the bet automatically every round */
  auto: boolean;
  /** locked in for the current round, or null if sitting out */
  staked: number | null;
  /** multiplier the player cashed out at, if they did */
  cashedAt: number | null;
  /** waiting for the next betting window */
  queued: boolean;
}

export const emptySlot = (stake: number): Slot => ({
  stake, autoAt: '', auto: false, staked: null, cashedAt: null, queued: false,
});

export default function BetPanel({
  slot, phase, multiplier, balance,
  onPatch, onPlace, onCancel, onCashOut,
}: {
  slot: Slot;
  phase: Phase;
  multiplier: number;
  balance: number;
  onPatch: (patch: Partial<Slot>) => void;
  onPlace: () => void;
  onCancel: () => void;
  onCashOut: () => void;
}) {
  const live = slot.staked !== null;
  const locked = live || slot.queued;
  const tooPoor = slot.stake > balance;
  const invalid = slot.stake < MIN_STAKE || tooPoor;

  const action = (() => {
    if (live && phase === 'flying' && slot.cashedAt === null) {
      return (
        <button className="av-act av-act--out" type="button" onClick={onCashOut}>
          Cash Out
          <small>{money(Math.floor(slot.staked! * multiplier))}</small>
        </button>
      );
    }
    if (slot.cashedAt !== null) {
      return (
        <button className="av-act av-act--done" type="button" disabled>
          Cash Out<small>{fmtX(slot.cashedAt)}</small>
        </button>
      );
    }
    if (live) {
      return (
        <button className="av-act av-act--live" type="button" disabled>
          Bet running<small>{money(slot.staked!)}</small>
        </button>
      );
    }
    if (slot.queued) {
      return (
        <button className="av-act av-act--queued" type="button" onClick={onCancel}>
          Cancel<small>next round</small>
        </button>
      );
    }
    return (
      <button className="av-act av-act--bet" type="button" onClick={onPlace} disabled={invalid}>
        Bet<small>{money(slot.stake)}</small>
      </button>
    );
  })();

  return (
    <div className={`av-slot${live ? ' is-live' : ''}`}>
      {/* tabs span the top; below them the controls sit left and the big
          action button right — the compact two-column seat the board uses. */}
      <div className="av-slot__tabs" role="tablist">
        <button
          type="button" role="tab" aria-selected={!slot.auto}
          className={!slot.auto ? 'on' : ''}
          onClick={() => onPatch({ auto: false })}
        >
          Bet
        </button>
        <button
          type="button" role="tab" aria-selected={slot.auto}
          className={slot.auto ? 'on' : ''}
          onClick={() => onPatch({ auto: true })}
        >
          Auto
        </button>
      </div>

      <div className="av-slot__ctl">
        <div className="av-stepper">
          <button type="button" aria-label="Decrease" disabled={locked}
                  onClick={() => onPatch({ stake: Math.max(MIN_STAKE, slot.stake - 100) })}>−</button>
          <input
            type="number" inputMode="numeric" value={slot.stake} disabled={locked}
            onChange={(e) => onPatch({ stake: Math.max(0, Number(e.target.value) || 0) })}
          />
          <button type="button" aria-label="Increase" disabled={locked}
                  onClick={() => onPatch({ stake: slot.stake + 100 })}>+</button>
        </div>

        <div className="av-quick">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={locked} onClick={() => onPatch({ stake: q })}>
              {money(q)}
            </button>
          ))}
        </div>

        {slot.auto && (
          <label className="av-auto">
            <span>Auto cash out</span>
            <input
              type="number" step="0.1" min="1.01" placeholder="—"
              value={slot.autoAt} disabled={locked}
              onChange={(e) => onPatch({ autoAt: e.target.value })}
            />
          </label>
        )}
      </div>

      {action}

      {tooPoor && <div className="field__err av-slot__err">Low balance</div>}
    </div>
  );
}
