import { fmtX, type Phase } from '../../lib/aviator';
import { taka } from '../../lib/brand';

/** Quick-pick stakes, in paisa. */
const QUICK = [10000, 50000, 100000, 500000];

/** One betting seat. A round can carry two of these, independently. */
export interface Slot {
    /** paisa */
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
    slot, phase, multiplier, balance, minStake, disabled, disabledLabel,
    onPatch, onPlace, onCancel, onCashOut,
}: {
    slot: Slot;
    phase: Phase;
    multiplier: number;
    balance: number;
    minStake: number;
    disabled?: boolean;
    disabledLabel?: string;
    onPatch: (patch: Partial<Slot>) => void;
    onPlace: () => void;
    onCancel: () => void;
    onCashOut: () => void;
}) {
    const live = slot.staked !== null;
    const locked = live || slot.queued;
    const tooPoor = slot.stake > balance;
    const invalid = slot.stake < minStake || tooPoor;
    const step = Math.max(minStake, 10000);

    const action = (() => {
        if (disabled) {
            return (
                <button className="av-act av-act--bet" type="button" onClick={onPlace}>
                    {disabledLabel ?? 'লগইন করুন'}
                </button>
            );
        }
        if (live && phase === 'flying' && slot.cashedAt === null) {
            return (
                <button className="av-act av-act--out" type="button" onClick={onCashOut}>
                    ক্যাশ আউট
                    <small>{taka(Math.floor(slot.staked! * multiplier))}</small>
                </button>
            );
        }
        if (slot.cashedAt !== null) {
            return (
                <button className="av-act av-act--done" type="button" disabled>
                    ক্যাশ আউট<small>{fmtX(slot.cashedAt)}</small>
                </button>
            );
        }
        if (live) {
            return (
                <button className="av-act av-act--live" type="button" disabled>
                    বেট চলছে<small>{taka(slot.staked!)}</small>
                </button>
            );
        }
        if (slot.queued) {
            return (
                <button className="av-act av-act--queued" type="button" onClick={onCancel}>
                    বাতিল<small>পরের রাউন্ডে</small>
                </button>
            );
        }
        return (
            <button className="av-act av-act--bet" type="button" onClick={onPlace} disabled={invalid}>
                বেট<small>{taka(slot.stake)}</small>
            </button>
        );
    })();

    return (
        <div className={`av-slot${live ? ' is-live' : ''}`}>
            <div className="av-slot__tabs" role="tablist">
                <button
                    type="button" role="tab" aria-selected={!slot.auto}
                    className={!slot.auto ? 'on' : ''}
                    onClick={() => onPatch({ auto: false })}
                >
                    বেট
                </button>
                <button
                    type="button" role="tab" aria-selected={slot.auto}
                    className={slot.auto ? 'on' : ''}
                    onClick={() => onPatch({ auto: true })}
                >
                    অটো
                </button>
            </div>

            <div className="av-stepper">
                <button type="button" aria-label="কমান" disabled={locked}
                        onClick={() => onPatch({ stake: Math.max(minStake, slot.stake - step) })}>−</button>
                <input
                    type="number" inputMode="numeric" value={slot.stake / 100} disabled={locked}
                    onChange={(e) => onPatch({ stake: Math.max(0, Math.round((Number(e.target.value) || 0) * 100)) })}
                />
                <button type="button" aria-label="বাড়ান" disabled={locked}
                        onClick={() => onPatch({ stake: slot.stake + step })}>+</button>
            </div>

            <div className="av-quick">
                {QUICK.map((q) => (
                    <button key={q} type="button" disabled={locked} onClick={() => onPatch({ stake: q })}>
                        {taka(q)}
                    </button>
                ))}
            </div>

            {action}

            <label className="av-auto">
                <span>অটো ক্যাশ আউট</span>
                <input
                    type="number" step="0.1" min="1.01" placeholder="—"
                    value={slot.autoAt} disabled={locked}
                    onChange={(e) => onPatch({ autoAt: e.target.value })}
                />
            </label>

            {!disabled && tooPoor && <div className="field__err">ব্যালেন্স কম</div>}
        </div>
    );
}
