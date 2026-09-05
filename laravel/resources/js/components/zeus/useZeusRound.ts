import { useCallback, useEffect, useRef, useState } from 'react';
import { postJson } from '../../lib/http';
import {
    GLYPH,
    HOLD,
    type Frame,
    type Round,
    type SpinResponse,
    SCATTER,
    toFrames,
} from '../../lib/zeus';

/** Wallpaper for the idle board. Decoration only — no round, no money. */
export function idleGrid(): string[][] {
    const faces = Object.keys(GLYPH).filter((k) => k !== SCATTER);

    return Array.from({ length: 5 }, () =>
        Array.from({ length: 6 }, () => faces[Math.floor(Math.random() * faces.length)]),
    );
}

export interface Banner {
    kind: 'bonus-in' | 'bonus-out' | 'win';
    text: string;
    sub?: string;
}

/**
 * Plays a resolved round back, one frame at a time.
 *
 * The server has already decided everything by the time this runs, so the hook
 * never branches on an outcome — it walks the frame list and holds each one
 * for its beat. Turbo divides the beat; it cannot skip a frame, because the
 * board would then jump past a win the player is owed the sight of.
 */
export function useZeusRound({
    stake,
    turbo,
    onBalance,
    onError,
}: {
    stake: number;
    turbo: boolean;
    onBalance: (paisa: number) => void;
    onError: (message: string) => void;
}) {
    const [board, setBoard] = useState<string[][]>(idleGrid);
    const [winning, setWinning] = useState<Set<string>>(new Set());
    const [dropping, setDropping] = useState(false);
    const [multiplier, setMultiplier] = useState(1);
    const [wonUnits, setWonUnits] = useState(0);
    const [free, setFree] = useState<{ spin: number; of: number } | null>(null);
    const [banner, setBanner] = useState<Banner | null>(null);
    const [busy, setBusy] = useState(false);

    const timer = useRef<number | null>(null);
    const turboRef = useRef(turbo);
    turboRef.current = turbo;

    const stop = useCallback(() => {
        if (timer.current !== null) {
            window.clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);

    useEffect(() => stop, [stop]);

    const apply = useCallback((frame: Frame) => {
        switch (frame.kind) {
            case 'drop':
                setBoard(frame.grid);
                setWinning(new Set());
                setDropping(true);
                setMultiplier(frame.multiplier);
                setFree(frame.of > 0 ? { spin: frame.free, of: frame.of } : null);
                break;

            case 'win':
                setDropping(false);
                setWinning(new Set(frame.cells.map(([r, c]) => `${r}-${c}`)));
                break;

            case 'fall':
                setBoard(frame.grid);
                setWinning(new Set());
                setDropping(true);
                break;

            case 'orbs':
                setDropping(false);
                setMultiplier(frame.multiplier);
                setWonUnits(frame.units);
                break;

            case 'bonus-in':
                setBanner({ kind: 'bonus-in', text: `${frame.spins} ফ্রি স্পিন`, sub: 'জিউসের দরজা খুলেছে' });
                break;

            case 'bonus-out':
                setBanner({ kind: 'bonus-out', text: 'ফ্রি স্পিন শেষ', sub: `মোট ${frame.units.toFixed(2)}x` });
                break;

            case 'done':
                setDropping(false);
                setWinning(new Set());
                setWonUnits(frame.units);
                setFree(null);
                break;
        }

        if (frame.kind !== 'bonus-in' && frame.kind !== 'bonus-out') {
            setBanner(null);
        }
    }, []);

    const play = useCallback((round: Round, done: () => void) => {
        const frames = toFrames(round);
        let i = 0;

        const tick = () => {
            const frame = frames[i];
            apply(frame);

            if (i >= frames.length - 1) {
                timer.current = null;
                done();

                return;
            }

            timer.current = window.setTimeout(() => {
                i++;
                tick();
            }, Math.round(HOLD[frame.kind] / (turboRef.current ? 3 : 1)));
        };

        tick();
    }, [apply]);

    const spin = useCallback(async (buy = false) => {
        if (busy) {
            return;
        }

        stop();
        setBusy(true);
        setWonUnits(0);
        setBanner(null);

        try {
            const res = await postJson<SpinResponse>('/game/zeus/spin', { stake, buy });

            if (res.balance !== undefined) {
                onBalance(res.balance);
            }

            play(res.round, () => setBusy(false));
        } catch (e) {
            setBusy(false);
            onError(e instanceof Error ? e.message : 'স্পিন করা গেল না');
        }
    }, [busy, stake, stop, play, onBalance, onError]);

    return { board, winning, dropping, multiplier, wonUnits, free, banner, busy, spin };
}
