'use client';

import { memo, useState } from 'react';
import { type Phase } from '@/lib/aviator';

const QUICK = [100, 200, 500, 10000];
export const MIN_STAKE = 10;
/** the reference stepper moves the stake by this per tap */
const STEP = 10;

/** "10.00" / "1,234.50" — the board's money figure, currency written after it */
export const fmtAmt = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

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

/* Memoised, and every handler takes the seat index, so the page can hand the
   same functions down on every frame: a seat re-renders only when its own
   slot, its busy flag or — while it is riding — the multiplier moves. The
   board used to redraw both seats sixty times a second, and on a slow phone
   that is what swallowed taps. */
export default memo(function BetPanel({
  index, slot, phase, multiplier, balance, busy,
  onPatch, onPlace, onCancel, onCashOut,
}: {
  index: 0 | 1;
  slot: Slot;
  phase: Phase;
  /** 1 unless this seat is riding a flight — it only feeds the Cash Out figure */
  multiplier: number;
  balance: number;
  /** a request for this seat is on its way */
  busy: boolean;
  onPatch: (i: 0 | 1, patch: Partial<Slot>) => void;
  onPlace: (i: 0 | 1) => void;
  onCancel: (i: 0 | 1) => void;
  onCashOut: (i: 0 | 1) => void;
}) {
  const i = index;
  const riding = slot.staked !== null && slot.cashedAt === null;
  const locked = riding || slot.queued;
  const tooPoor = slot.stake > balance;
  const invalid = slot.stake < MIN_STAKE || tooPoor;

  /* The reference button has four faces: green Bet; red Cancel while the
     stake waits for the next round ("Waiting for next round" under it) or
     while the round is still taking bets; orange Cash Out with the running
     payout once the plane is up. After a cash-out the seat is simply free
     again, so it goes straight back to green. */
  const action = (() => {
    if (riding && phase === 'flying') {
      return (
        <button className={`av-act av-act--out${busy ? ' is-busy' : ''}`} type="button" onClick={() => onCashOut(i)}>
          Cash Out
          <small>{fmtAmt(Math.floor(slot.staked! * multiplier * 100) / 100)} <i>BDT</i></small>
        </button>
      );
    }
    if (slot.queued) {
      return (
        <button className="av-act av-act--cancel" type="button" onClick={() => onCancel(i)}>
          Cancel<small className="av-act__wait">Waiting for next round</small>
        </button>
      );
    }
    if (riding) {
      return (
        <button className={`av-act av-act--cancel${busy ? ' is-busy' : ''}`} type="button" onClick={() => onCancel(i)}>
          Cancel
        </button>
      );
    }
    return (
      <button className={`av-act av-act--bet${busy ? ' is-busy' : ''}`} type="button" onClick={() => onPlace(i)} disabled={invalid}>
        Bet<small>{fmtAmt(slot.stake)} <i>BDT</i></small>
      </button>
    );
  })();

  return (
    <div className={`av-slot${riding ? ' is-live' : ''}`}>
      {/* tabs span the top; below them the controls sit left and the big
          action button right — the compact two-column seat the board uses. */}
      <div className="av-slot__tabs" role="tablist">
        <button
          type="button" role="tab" aria-selected={!slot.auto}
          className={!slot.auto ? 'on' : ''}
          onClick={() => onPatch(i, { auto: false })}
        >
          Bet
        </button>
        <button
          type="button" role="tab" aria-selected={slot.auto}
          className={slot.auto ? 'on' : ''}
          onClick={() => onPatch(i, { auto: true })}
        >
          Auto
        </button>
      </div>

      <div className="av-slot__ctl">
        <div className="av-stepper">
          <button type="button" aria-label="Decrease" disabled={locked}
                  onClick={() => onPatch(i, { stake: Math.max(MIN_STAKE, slot.stake - STEP) })}>−</button>
          <StakeField value={slot.stake} disabled={locked} onChange={(v) => onPatch(i, { stake: v })} />
          <button type="button" aria-label="Increase" disabled={locked}
                  onClick={() => onPatch(i, { stake: slot.stake + STEP })}>+</button>
        </div>

        <div className="av-quick">
          {QUICK.map((q) => (
            <button key={q} type="button" disabled={locked} onClick={() => onPatch(i, { stake: q })}>
              {q.toLocaleString('en-US')}
            </button>
          ))}
        </div>

        {slot.auto && (
          <label className="av-auto">
            <span>Auto cash out</span>
            <input
              type="number" step="0.1" min="1.01" placeholder="—"
              value={slot.autoAt} disabled={locked}
              onChange={(e) => onPatch(i, { autoAt: e.target.value })}
            />
          </label>
        )}
      </div>

      {action}

      {tooPoor && <div className="field__err av-slot__err">Low balance</div>}
    </div>
  );
});

/** The stake reads "10.00" like the board's, but while it is being typed the
    raw text stands, so the two decimals do not fight the keyboard. */
function StakeField({ value, disabled, onChange }: {
  value: number; disabled: boolean; onChange: (v: number) => void;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="text" inputMode="decimal"
      value={draft ?? fmtAmt(value)} disabled={disabled}
      onFocus={() => setDraft(String(value))}
      onBlur={() => setDraft(null)}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d.]/g, '');
        setDraft(raw);
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(Math.max(0, Math.floor(n * 100) / 100));
      }}
    />
  );
}
