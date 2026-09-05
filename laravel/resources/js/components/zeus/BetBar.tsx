import { taka, toPaisa, toTaka } from '../../lib/brand';

/** Stake steps, in paisa. */
const STEPS = [1000, 2000, 5000, 10000, 20000, 50000, 100000, 200000];

/**
 * Stake control, spin button and the buy.
 *
 * The buy price is shown in taka rather than as "100x" because that is the
 * number that leaves the wallet, and a player who misreads it loses a hundred
 * spins in one press.
 */
export default function BetBar({
    stake,
    minStake,
    maxStake,
    buyCost,
    balance,
    busy,
    turbo,
    onStake,
    onSpin,
    onBuy,
    onTurbo,
}: {
    stake: number;
    minStake: number;
    maxStake: number;
    buyCost: number;
    balance: number;
    busy: boolean;
    turbo: boolean;
    onStake: (paisa: number) => void;
    onSpin: () => void;
    onBuy: () => void;
    onTurbo: () => void;
}) {
    const step = (dir: -1 | 1) => {
        const at = STEPS.findIndex((s) => s >= stake);
        const next = STEPS[Math.min(STEPS.length - 1, Math.max(0, (at < 0 ? STEPS.length - 1 : at) + dir))];
        onStake(Math.min(maxStake, Math.max(minStake, next)));
    };

    return (
        <div className="zg-bar">
            <div className="zg-bar__stake">
                <span className="zg-bar__label">বেট</span>
                <div className="zg-stepper">
                    <button type="button" onClick={() => step(-1)} disabled={busy || stake <= minStake} aria-label="বেট কমান">−</button>
                    <input
                        inputMode="numeric"
                        value={toTaka(stake)}
                        onChange={(e) => {
                            const taka = Number(e.target.value.replace(/\D/g, ''));
                            onStake(Number.isFinite(taka) ? toPaisa(taka) : minStake);
                        }}
                        onBlur={() => onStake(Math.min(maxStake, Math.max(minStake, stake)))}
                        disabled={busy}
                    />
                    <button type="button" onClick={() => step(1)} disabled={busy || stake >= maxStake} aria-label="বেট বাড়ান">+</button>
                </div>
            </div>

            <div className="zg-bar__actions">
                <button
                    type="button"
                    className={`zg-turbo${turbo ? ' is-on' : ''}`}
                    onClick={onTurbo}
                    aria-pressed={turbo}
                    aria-label="টার্বো"
                >
                    ⚡
                </button>

                <button type="button" className="zg-spin" onClick={onSpin} disabled={busy}>
                    <span>{busy ? '…' : 'স্পিন'}</span>
                </button>

                <button
                    type="button"
                    className="zg-buy"
                    onClick={onBuy}
                    disabled={busy || stake * buyCost > balance}
                >
                    <b>ফ্রি স্পিন কিনুন</b>
                    <span>{taka(stake * buyCost)}</span>
                </button>
            </div>
        </div>
    );
}
