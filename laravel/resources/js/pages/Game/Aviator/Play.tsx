import { Head, Link, router } from '@inertiajs/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import AviatorCanvas from '../../../components/aviator/AviatorCanvas';
import BetPanel, { emptySlot, type Slot } from '../../../components/aviator/BetPanel';
import HistoryStrip from '../../../components/aviator/HistoryStrip';
import LiveBets from '../../../components/aviator/LiveBets';
import { useAviatorRound, type SeatBet } from '../../../components/aviator/useAviatorRound';
import PageHeader from '../../../components/PageHeader';
import { useUI } from '../../../providers/UIProvider';
import { useAuth } from '../../../lib/auth';
import { fmtX, type HistoryEntry } from '../../../lib/aviator';
import { taka } from '../../../lib/brand';

export default function Play({
    clientSeed,
    minStake,
    bettingMs,
    crashedMs,
    history: initialHistory,
}: {
    clientSeed: string;
    minStake: number;
    bettingMs: number;
    crashedMs: number;
    history: HistoryEntry[];
}) {
    const { toast } = useUI();
    const { wallet, signedIn } = useAuth();

    const [balance, setBalance] = useState(wallet?.balance ?? 0);
    const [slots, setSlots] = useState<[Slot, Slot]>([emptySlot(10000), emptySlot(50000)]);

    // the round loop reads the seats without re-subscribing every render
    const slotsRef = useRef(slots);
    slotsRef.current = slots;

    const patch = useCallback((i: 0 | 1, p: Partial<Slot>) => {
        setSlots((s) => {
            const next: [Slot, Slot] = [{ ...s[0] }, { ...s[1] }];
            next[i] = { ...next[i], ...p };
            return next;
        });
    }, []);

    /** Seats queued for the next round, as the API wants them. */
    const collectSeats = useCallback((): SeatBet[] => {
        const out: SeatBet[] = [];
        let spend = 0;

        slotsRef.current.forEach((slot, seat) => {
            if (!slot.queued && !slot.auto) return;
            if (slot.stake < minStake || slot.stake > balanceRef.current - spend) return;
            spend += slot.stake;
            const auto = Number(slot.autoAt);
            out.push({
                seat,
                stake: slot.stake,
                auto_at: Number.isFinite(auto) && auto > 1 ? auto : null,
            });
        });

        return out;
    }, [minStake]);

    const balanceRef = useRef(balance);
    balanceRef.current = balance;

    const onRoundOpen = useCallback((staked: number[]) => {
        setSlots((s) => s.map((slot, seat) => (
            staked.includes(seat)
                ? { ...slot, staked: slot.stake, cashedAt: null, queued: false }
                : { ...slot, staked: null, cashedAt: null, queued: false }
        )) as [Slot, Slot]);
    }, []);

    const onCrash = useCallback((crashAt: number) => {
        const lost = slotsRef.current
            .filter((s) => s.staked !== null && s.cashedAt === null)
            .reduce((a, s) => a + (s.staked ?? 0), 0);

        if (lost > 0) toast(`${fmtX(crashAt)} এ উড়ে গেছে — ${taka(lost)} হেরেছেন`);

        // Clear the finished round. `queued` is left alone: opening a round
        // already consumed it, so anything still queued here was placed during
        // this flight for the next one, and must survive the bust. Seats on
        // auto queue themselves up again.
        setSlots((s) => s.map((x) => ({
            ...x, staked: null, cashedAt: null, queued: x.queued || x.auto,
        })) as [Slot, Slot]);
    }, [toast]);

    const onCashedOut = useCallback((seat: number, multiplier: number, payout: number) => {
        patch(seat as 0 | 1, { cashedAt: multiplier });
        toast(`${fmtX(multiplier)} — ${taka(payout)} জিতেছেন`);
    }, [patch, toast]);

    const { phase, multiplier, bettingLeft, round, history, cashOut } = useAviatorRound({
        live: signedIn,
        bettingMs,
        crashedMs,
        initialHistory,
        initialClientSeed: clientSeed,
        collectSeats,
        onRoundOpen,
        onCrash,
        onBalance: setBalance,
        onCashedOut,
        onError: toast,
    });

    // auto cash-out, checked per seat. The server prices the cash-out from its
    // own clock, so this only decides *when* to ask.
    useEffect(() => {
        if (phase !== 'flying' || !signedIn) return;
        slots.forEach((s, i) => {
            if (s.staked === null || s.cashedAt !== null) return;
            const target = Number(s.autoAt);
            if (Number.isFinite(target) && target > 1 && multiplier >= target) {
                cashOut(i);
            }
        });
    }, [phase, multiplier, slots, cashOut, signedIn]);

    const place = (i: 0 | 1) => {
        if (!signedIn) {
            router.visit('/login');
            return;
        }
        const slot = slots[i];
        if (slot.stake < minStake) { toast(`সর্বনিম্ন বেট ${taka(minStake)}`); return; }
        if (slot.stake > balance) { toast('ব্যালেন্স যথেষ্ট নয়'); return; }
        patch(i, { queued: true });
        toast(phase === 'betting' ? 'বেট বসছে' : 'পরের রাউন্ডে বেট বসবে');
    };

    return (
        <>
            <Head title="Aviator" />
            <PageHeader
                title="Aviator"
                action={<span className="bal-pill"><b>{taka(balance)}</b><i className="av" aria-hidden>👤</i></span>}
            />

            <HistoryStrip history={history} />

            <AviatorCanvas
                phase={phase}
                multiplier={multiplier}
                bettingLeft={bettingLeft}
                bettingTotal={bettingMs}
                fairLabel={signedIn ? 'প্রুভাবলি ফেয়ার' : 'প্রিভিউ'}
            />

            <div className="av-slots">
                {([0, 1] as const).map((i) => (
                    <BetPanel
                        key={i}
                        slot={slots[i]}
                        phase={phase}
                        multiplier={multiplier}
                        balance={balance}
                        minStake={minStake}
                        disabled={!signedIn}
                        disabledLabel="লগইন করে খেলুন"
                        onPatch={(p) => patch(i, p)}
                        onPlace={() => place(i)}
                        onCancel={() => patch(i, { queued: false, auto: false })}
                        onCashOut={() => cashOut(i)}
                    />
                ))}
            </div>

            <LiveBets phase={phase} multiplier={multiplier} />

            <section className="sec">
                <div className="sec__hd">
                    <h2 className="sec__title">প্রুভাবলি ফেয়ার</h2>
                    <div className="sec__ctrl"><Link href="/game/aviator/fairness">যাচাই</Link></div>
                </div>
                <div className="av-fair">
                    <div className="av-fair__row"><span>রাউন্ড</span><b>#{round.id ?? '—'}</b></div>
                    <div className="av-fair__row"><span>নন্স</span><b>{round.nonce ?? '—'}</b></div>
                    <div className="av-fair__row">
                        <span>সার্ভার সিড হ্যাশ</span>
                        <b className="mono">{round.serverSeedHash ? `${round.serverSeedHash.slice(0, 24)}…` : '—'}</b>
                    </div>
                    <div className="av-fair__row">
                        <span>ক্লায়েন্ট সিড</span><b className="mono">{round.clientSeed || '—'}</b>
                    </div>
                    <div className="av-fair__row">
                        <span>সার্ভার সিড</span>
                        <b className="mono">
                            {round.serverSeed ? `${round.serverSeed.slice(0, 24)}…` : 'রাউন্ড শেষে প্রকাশ হবে'}
                        </b>
                    </div>
                </div>
                <div className="note">
                    রাউন্ড শুরুর আগেই সার্ভার সিডের হ্যাশ দেখানো হয়, আর শেষে আসল সিড প্রকাশ
                    করা হয় — তাই ফলাফল আগে থেকেই নির্ধারিত ছিল কিনা আপনি নিজে যাচাই করতে
                    পারবেন। সিড সার্ভারে তৈরি হয় এবং ক্র‍্যাশ পয়েন্ট ব্রাউজারে কখনো পাঠানো
                    হয় না, তাই কেউ আগে থেকে বলে দিতে পারে না পরের রাউন্ড কত এক্স যাবে।
                </div>
            </section>

            {!signedIn && (
                <div className="note" style={{ margin: 12 }}>
                    এটি প্রিভিউ রাউন্ড — কোনো টাকা জড়িত নেই এবং ফেয়ারনেস সিড তৈরি হয় না।
                    লগইন করলে সার্ভার থেকে আসল রাউন্ড আসবে ও ব্যালেন্স থেকে বেট কাটা হবে।
                </div>
            )}
        </>
    );
}
