import { Head, Link } from '@inertiajs/react';
import { useState } from 'react';
import PageHeader from '../../../components/PageHeader';
import BetBar from '../../../components/zeus/BetBar';
import Reels from '../../../components/zeus/Reels';
import { useZeusRound } from '../../../components/zeus/useZeusRound';
import { useAuth } from '../../../lib/auth';
import { taka } from '../../../lib/brand';
import { useUI } from '../../../providers/UIProvider';
import { GLYPH, SYMBOL_NAME, type Commitment, type HistoryEntry } from '../../../lib/zeus';

interface Rules {
    min_cluster: number;
    paytable: Record<string, [number, number, number]>;
    scatter_pay: Record<string, number>;
    free_spins: number;
    trigger: number;
    retrigger: number;
    retrigger_spins: number;
    buy_cost: number;
    max_win: number;
}

export default function Play({
    rules,
    minStake,
    maxStake,
    seed,
    history,
}: {
    rules: Rules;
    minStake: number;
    maxStake: number;
    seed: Commitment | null;
    history: HistoryEntry[];
}) {
    const { toast } = useUI();
    const { wallet, signedIn } = useAuth();

    const [balance, setBalance] = useState(wallet?.balance ?? 0);
    const [stake, setStake] = useState(minStake);
    const [turbo, setTurbo] = useState(false);

    const { board, winning, dropping, multiplier, wonUnits, free, banner, busy, spin } = useZeusRound({
        stake,
        turbo,
        onBalance: setBalance,
        onError: toast,
    });

    const guard = (run: () => void) => {
        if (signedIn && stake > balance) {
            toast('ব্যালেন্স যথেষ্ট নয়');

            return;
        }

        run();
    };

    const won = Math.floor(stake * wonUnits);

    return (
        <>
            <Head title="Zeus Gate" />
            <PageHeader
                title="Zeus Gate"
                action={
                    signedIn ? (
                        <span className="bal-pill"><b>{taka(balance)}</b><i className="av" aria-hidden>👤</i></span>
                    ) : (
                        <Link className="btn btn--ghost" href="/login">লগইন</Link>
                    )
                }
            />

            <div className={`zg-stage${free ? ' is-free' : ''}`}>
                <div className="zg-stage__top">
                    <span className="zg-mult" data-hot={multiplier > 1}>
                        {multiplier > 1 ? `মোট ${multiplier}x` : 'জিউস গেট'}
                    </span>
                    {free && <span className="zg-free">ফ্রি স্পিন {free.spin}/{free.of}</span>}
                </div>

                <Reels grid={board} winning={winning} dropping={dropping} />

                <div className="zg-stage__win" aria-live="polite">
                    {won > 0 ? <b>{taka(won)}</b> : <span>৮টি একই সিম্বল পড়লেই জিত</span>}
                </div>

                {banner && (
                    <div className={`zg-banner zg-banner--${banner.kind}`}>
                        <b>{banner.text}</b>
                        {banner.sub && <span>{banner.sub}</span>}
                    </div>
                )}
            </div>

            <BetBar
                stake={stake}
                minStake={minStake}
                maxStake={maxStake}
                buyCost={rules.buy_cost}
                balance={signedIn ? balance : stake * rules.buy_cost}
                busy={busy}
                turbo={turbo}
                onStake={setStake}
                onSpin={() => guard(() => spin(false))}
                onBuy={() => guard(() => spin(true))}
                onTurbo={() => setTurbo((t) => !t)}
            />

            {!signedIn && (
                <div className="note" style={{ margin: '12px 12px 0' }}>
                    এটি ফ্রি-প্লে ডেমো — কোনো টাকা জড়িত নেই এবং জেতা টাকা ব্যালেন্সে যোগ হবে
                    না। লগইন করলে আসল রাউন্ড চলবে ও ফেয়ারনেস সিড তৈরি হবে।{' '}
                    <Link href="/login" className="zg-inline-link">লগইন করুন</Link>
                </div>
            )}

            <section className="sec">
                <div className="sec__hd"><h2 className="sec__title">পে-টেবিল</h2></div>
                <div className="zg-pay">
                    {Object.entries(rules.paytable).map(([symbol, pays]) => (
                        <div className="zg-pay__row" key={symbol}>
                            <span className="zg-pay__sym" aria-hidden>{GLYPH[symbol]}</span>
                            <span className="zg-pay__name">{SYMBOL_NAME[symbol]}</span>
                            <b>{pays[0]}x</b><b>{pays[1]}x</b><b>{pays[2]}x</b>
                        </div>
                    ))}
                    <div className="zg-pay__head">
                        <span /><span />
                        <b>৮–৯</b><b>১০–১১</b><b>১২+</b>
                    </div>
                </div>
                <div className="note">
                    ⚡ বজ্র {rules.trigger}টি পড়লে {rules.free_spins}টি ফ্রি স্পিন। ফ্রি স্পিনে
                    গুণক অর্ব জমতে থাকে — পুরো রাউন্ডের জেতা তার সঙ্গে গুণ হয়। ভেতরে আবার{' '}
                    {rules.retrigger}টি বজ্র পড়লে আরও {rules.retrigger_spins}টি স্পিন। এক
                    রাউন্ডে সর্বোচ্চ {rules.max_win.toLocaleString('en-IN')}x পর্যন্ত।
                </div>
            </section>

            <section className="sec">
                <div className="sec__hd">
                    <h2 className="sec__title">প্রুভাবলি ফেয়ার</h2>
                    <div className="sec__ctrl"><Link href="/game/zeus/fairness">যাচাই</Link></div>
                </div>
                <div className="av-fair">
                    <div className="av-fair__row">
                        <span>সার্ভার সিড হ্যাশ</span>
                        <b className="mono">{seed ? `${seed.server_seed_hash.slice(0, 24)}…` : '—'}</b>
                    </div>
                    <div className="av-fair__row"><span>ক্লায়েন্ট সিড</span><b className="mono">{seed?.client_seed ?? '—'}</b></div>
                    <div className="av-fair__row"><span>পরের নন্স</span><b>{seed?.nonce ?? '—'}</b></div>
                </div>
                <div className="note">
                    প্রথম স্পিনের আগেই সার্ভার সিডের হ্যাশ আপনার হাতে থাকে, আর প্রতিটি স্পিন
                    সেই সিডের সঙ্গে নন্স মিলিয়ে চলে। সিড বদলালে পুরোনো সিডটি প্রকাশ হয় — তখন
                    প্রতিটি স্পিন নিজে চালিয়ে মিলিয়ে দেখতে পারবেন।
                </div>
            </section>

            {history.length > 0 && (
                <section className="sec">
                    <div className="sec__hd"><h2 className="sec__title">শেষ স্পিনগুলো</h2></div>
                    <div className="zg-log">
                        {history.map((h) => (
                            <div className={`zg-log__row${h.payout > 0 ? ' is-win' : ''}`} key={h.id}>
                                <span>#{h.nonce}</span>
                                <span>{taka(h.cost)}{h.bought ? ' · কেনা' : ''}</span>
                                <b>{h.payout > 0 ? `+${taka(h.payout)}` : '—'}</b>
                            </div>
                        ))}
                    </div>
                </section>
            )}
        </>
    );
}
