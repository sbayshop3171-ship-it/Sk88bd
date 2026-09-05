import { useCallback, useEffect, useRef, useState } from 'react';
import {
    HOUSE_EDGE, multiplierAt, timeToReach,
    type HistoryEntry, type OpenRound, type Phase, type SettledRound,
} from '../../lib/aviator';
import { postJson } from '../../lib/http';

/** How often the flight asks the server whether the round has busted.
    The crash point is withheld until then, so there is nothing to poll less. */
const SETTLE_POLL_MS = 600;

export interface SeatBet {
    seat: number;
    stake: number;
    auto_at: number | null;
}

export interface RoundView {
    id: number | null;
    nonce: number | null;
    serverSeedHash: string | null;
    clientSeed: string | null;
    /** published only after the bust */
    serverSeed: string | null;
    crashAt: number | null;
}

export interface RoundState {
    phase: Phase;
    multiplier: number;
    bettingLeft: number;
    round: RoundView;
    history: HistoryEntry[];
}

interface Options {
    /** false for a signed-out visitor, who gets a local preview instead */
    live: boolean;
    bettingMs: number;
    crashedMs: number;
    initialHistory: HistoryEntry[];
    initialClientSeed: string;
    /** seats to stake when the next betting window opens */
    collectSeats: () => SeatBet[];
    /** which seats actually went live this round */
    onRoundOpen: (seats: number[]) => void;
    onCrash: (crashAt: number) => void;
    onCashedOut: (seat: number, multiplier: number, payout: number) => void;
    onBalance: (paisa: number) => void;
    onError: (message: string) => void;
}

const EMPTY_ROUND: RoundView = {
    id: null, nonce: null, serverSeedHash: null, clientSeed: null, serverSeed: null, crashAt: null,
};

/**
 * Drives betting -> flying -> crashed, forever.
 *
 * When `live`, every round is opened by the server: it commits the seed, takes
 * the stakes and keeps the crash point to itself, so the flight has to ask
 * whether the aircraft is still up. That round trip is the price of a fairness
 * commitment that actually holds — a client that knew the crash point could
 * always cash out one tick before it.
 */
export function useAviatorRound(options: Options): RoundState & { cashOut: (seat: number) => void } {
    const [state, setState] = useState<RoundState>({
        phase: 'betting',
        multiplier: 1,
        bettingLeft: options.bettingMs,
        round: { ...EMPTY_ROUND, clientSeed: options.initialClientSeed },
        history: options.initialHistory,
    });

    // callbacks change every render; the loop reads them through a ref so it
    // never has to restart
    const opts = useRef(options);
    opts.current = options;

    const raf = useRef<number | null>(null);
    const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const roundIdRef = useRef<number | null>(null);

    useEffect(() => {
        let cancelled = false;

        const wait = (ms: number, fn: () => void) => {
            timers.current.push(setTimeout(() => { if (!cancelled) fn(); }, ms));
        };

        const frame = (fn: () => void) => {
            raf.current = requestAnimationFrame(() => { if (!cancelled) fn(); });
        };

        /** Countdown, then flight, then the bust — shared by both modes. */
        const runRound = (takeoffAt: number, settle: () => Promise<number | null>) => {
            const tickCountdown = () => {
                const left = Math.max(0, takeoffAt - performance.now());
                setState((s) => (s.phase === 'betting' ? { ...s, bettingLeft: left } : s));
                if (left > 0) {
                    frame(tickCountdown);
                } else {
                    startFlight();
                }
            };

            const startFlight = () => {
                setState((s) => ({ ...s, phase: 'flying', multiplier: 1, bettingLeft: 0 }));

                let busted = false;

                const fly = () => {
                    if (busted) return;
                    const m = multiplierAt(performance.now() - takeoffAt);
                    setState((s) => (s.phase === 'flying' ? { ...s, multiplier: m } : s));
                    frame(fly);
                };
                frame(fly);

                const poll = async () => {
                    if (cancelled || busted) return;

                    const crashAt = await settle();

                    if (cancelled) return;

                    if (crashAt === null) {
                        wait(SETTLE_POLL_MS, () => { void poll(); });
                        return;
                    }

                    busted = true;
                    if (raf.current) cancelAnimationFrame(raf.current);

                    setState((s) => ({ ...s, phase: 'crashed', multiplier: crashAt }));
                    opts.current.onCrash(crashAt);

                    wait(opts.current.crashedMs, () => { void openRound(); });
                };

                wait(SETTLE_POLL_MS, () => { void poll(); });
            };

            setState((s) => ({ ...s, phase: 'betting', multiplier: 1, bettingLeft: opts.current.bettingMs }));
            frame(tickCountdown);
        };

        /* ---------- preview: no account, no money, drawn locally ---------- */

        const openPreviewRound = () => {
            // same distribution the server draws from, without a seed: a
            // preview proves nothing, so there is nothing to commit to
            const r = Math.random();
            const crashAt = r < HOUSE_EDGE ? 1 : Math.max(1, Math.floor((1 / (1 - r)) * 100) / 100);

            setState((s) => ({ ...s, round: { ...EMPTY_ROUND, clientSeed: s.round.clientSeed } }));

            const takeoffAt = performance.now() + opts.current.bettingMs;
            const crashesAt = takeoffAt + timeToReach(crashAt);

            runRound(takeoffAt, async () => (performance.now() >= crashesAt ? crashAt : null));
        };

        /* ---------- live: the server owns the round ---------- */

        const openLiveRound = async () => {
            const seats = opts.current.collectSeats();

            // Nothing staked this round. There is no money to commit to, so it
            // is drawn locally exactly as a signed-out visitor's is — asking the
            // server to open an empty round would only come back rejected, and
            // a watching player would see a validation error every cycle.
            if (seats.length === 0) {
                roundIdRef.current = null;
                opts.current.onRoundOpen([]);
                openPreviewRound();
                return;
            }

            let open: OpenRound;
            try {
                open = await postJson<OpenRound>('/game/aviator/rounds', { seats });
            } catch (e) {
                if (cancelled) return;
                // most often "ব্যালেন্স যথেষ্ট নয়" — drop the stakes and keep
                // the table running rather than freezing the screen
                opts.current.onError(e instanceof Error ? e.message : 'রাউন্ড শুরু করা যায়নি');
                opts.current.onRoundOpen([]);
                if (seats.length > 0) {
                    wait(1200, () => { void openLiveRound(); });
                } else {
                    wait(2500, () => { void openLiveRound(); });
                }
                return;
            }

            if (cancelled) return;

            roundIdRef.current = open.round_id;
            opts.current.onRoundOpen(seats.map((s) => s.seat));
            opts.current.onBalance(open.balance);

            setState((s) => ({
                ...s,
                round: {
                    id: open.round_id,
                    nonce: open.nonce,
                    serverSeedHash: open.server_seed_hash,
                    clientSeed: open.client_seed,
                    serverSeed: null,
                    crashAt: null,
                },
            }));

            // the two clocks are never identical; line them up once per round
            const drift = open.server_now - Date.now();
            const takeoffAt = performance.now() + (open.starts_at - drift - Date.now());

            runRound(takeoffAt, async () => {
                try {
                    const done = await postJson<SettledRound>(`/game/aviator/rounds/${open.round_id}/settle`);

                    setState((s) => ({
                        ...s,
                        round: {
                            id: done.round_id,
                            nonce: done.nonce,
                            serverSeedHash: done.server_seed_hash,
                            clientSeed: done.client_seed,
                            serverSeed: done.server_seed,
                            crashAt: done.crash_at,
                        },
                        history: done.history,
                    }));
                    opts.current.onBalance(done.balance);

                    return done.crash_at;
                } catch {
                    // 422 until the aircraft could actually have crashed
                    return null;
                }
            });
        };

        const openRound = async () => {
            if (opts.current.live) {
                await openLiveRound();
            } else {
                openPreviewRound();
            }
        };

        void openRound();

        return () => {
            cancelled = true;
            if (raf.current) cancelAnimationFrame(raf.current);
            timers.current.forEach(clearTimeout);
            timers.current = [];
        };
    }, [options.live]);

    const cashOut = useCallback((seat: number) => {
        const roundId = roundIdRef.current;
        if (roundId === null) return;

        void postJson<{ ok: boolean; multiplier: number; payout: number; balance: number }>(
            `/game/aviator/rounds/${roundId}/cash-out`,
            { seat },
        )
            .then((res) => {
                opts.current.onBalance(res.balance);
                opts.current.onCashedOut(seat, res.multiplier, res.payout);
            })
            .catch((e: unknown) => {
                opts.current.onError(e instanceof Error ? e.message : 'ক্যাশ আউট হয়নি');
            });
    }, []);

    return { ...state, cashOut };
}
