import { Head, router } from '@inertiajs/react';
import { useState } from 'react';
import Field from '../../../components/Field';
import PageHeader from '../../../components/PageHeader';
import { postJson } from '../../../lib/http';
import { fmtX, type Commitment } from '../../../lib/zeus';

interface Revealed {
    server_seed: string;
    server_seed_hash: string;
    client_seed: string;
    spins: number;
    revealed_at: string | null;
}

/**
 * The seed pair screen: what is committed now, what has been published, and a
 * calculator that replays any nonce off a published seed.
 */
export default function Fairness({
    seed,
    revealed,
}: {
    seed: Commitment | null;
    revealed: Revealed[];
}) {
    const [next, setNext] = useState('');
    const [rotating, setRotating] = useState(false);

    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('');
    const [buy, setBuy] = useState(false);
    const [result, setResult] = useState<{ hash: string; units: number; freeSpins: number } | null>(null);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const rotate = async () => {
        setRotating(true);

        try {
            await postJson('/game/zeus/seed', { client_seed: next.trim() });
            router.reload();
        } catch (e) {
            setErr(e instanceof Error ? e.message : 'সিড বদলানো যায়নি');
            setRotating(false);
        }
    };

    const run = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!serverSeed.trim() || !clientSeed.trim()) {
            setErr('সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন');

            return;
        }

        setErr('');
        setBusy(true);

        try {
            const res = await postJson<{ server_seed_hash: string; win_units: number; free_spins: number }>(
                '/game/zeus/verify',
                {
                    server_seed: serverSeed.trim(),
                    client_seed: clientSeed.trim(),
                    nonce: Number(nonce) || 0,
                    buy,
                },
            );

            setResult({ hash: res.server_seed_hash, units: res.win_units, freeSpins: res.free_spins });
        } catch (e2) {
            setErr(e2 instanceof Error ? e2.message : 'যাচাই করা যায়নি');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <Head title="ফেয়ারনেস যাচাই" />
            <PageHeader title="ফেয়ারনেস যাচাই" />

            <div className="hero">
                <h1>নিজে যাচাই করুন</h1>
                <p>প্রকাশিত সিড দিয়ে যেকোনো স্পিন আবার চালিয়ে দেখুন</p>
            </div>

            {seed && (
                <section className="sec">
                    <div className="sec__hd"><h2 className="sec__title">চলমান সিড</h2></div>
                    <div className="av-fair">
                        <div className="av-fair__row">
                            <span>সার্ভার সিড হ্যাশ</span>
                            <b className="mono">{seed.server_seed_hash.slice(0, 32)}…</b>
                        </div>
                        <div className="av-fair__row"><span>ক্লায়েন্ট সিড</span><b className="mono">{seed.client_seed}</b></div>
                        <div className="av-fair__row"><span>খেলা হয়েছে</span><b>{seed.nonce} স্পিন</b></div>
                    </div>

                    <Field label="নতুন ক্লায়েন্ট সিড (খালি রাখলে র‍্যান্ডম)">
                        <input
                            value={next}
                            onChange={(e) => setNext(e.target.value)}
                            placeholder="নিজের পছন্দমতো"
                            autoComplete="off"
                            spellCheck={false}
                        />
                    </Field>
                    <button className="btn btn--ghost btn--block" type="button" onClick={rotate} disabled={rotating}>
                        {rotating ? 'বদলাচ্ছে…' : 'সিড বদলে পুরোনোটা প্রকাশ করুন'}
                    </button>
                    <div className="note">
                        সিড বদলালে চলমান সার্ভার সিডটি প্রকাশ হয়ে যায় এবং ওই সিডে খেলা প্রতিটি
                        স্পিন নিচের ক্যালকুলেটরে মিলিয়ে দেখা যায়। প্রকাশিত সিডে আর খেলা হয় না।
                    </div>
                </section>
            )}

            {revealed.length > 0 && (
                <section className="sec">
                    <div className="sec__hd"><h2 className="sec__title">প্রকাশিত সিড</h2></div>
                    <div className="zg-log">
                        {revealed.map((r) => (
                            <button
                                type="button"
                                className="zg-log__row zg-log__row--tap"
                                key={r.server_seed_hash}
                                onClick={() => {
                                    setServerSeed(r.server_seed);
                                    setClientSeed(r.client_seed);
                                }}
                            >
                                <span className="mono">{r.server_seed.slice(0, 14)}…</span>
                                <span>{r.spins} স্পিন</span>
                                <b>বসান</b>
                            </button>
                        ))}
                    </div>
                </section>
            )}

            <form style={{ margin: 12 }} onSubmit={run} noValidate>
                <Field label="সার্ভার সিড (প্রকাশিত)">
                    <input value={serverSeed} onChange={(e) => setServerSeed(e.target.value)}
                           placeholder="a1b2c3…" autoComplete="off" spellCheck={false} />
                </Field>
                <Field label="ক্লায়েন্ট সিড">
                    <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)}
                           placeholder="আপনার সিড" autoComplete="off" spellCheck={false} />
                </Field>
                <Field label="নন্স" error={err}>
                    <input value={nonce} onChange={(e) => setNonce(e.target.value.replace(/\D/g, ''))}
                           inputMode="numeric" placeholder="0" />
                </Field>
                <label className="zg-check">
                    <input type="checkbox" checked={buy} onChange={(e) => setBuy(e.target.checked)} />
                    <span>স্পিনটি কেনা ফ্রি স্পিন ছিল</span>
                </label>

                <button className="btn btn--gold btn--block" type="submit" disabled={busy}>
                    {busy ? 'হিসাব হচ্ছে…' : 'হিসাব করুন'}
                </button>
            </form>

            {result && (
                <section className="sec">
                    <div className="av-fair">
                        <div className="av-fair__row">
                            <span>সিডের হ্যাশ</span><b className="mono">{result.hash.slice(0, 32)}…</b>
                        </div>
                        <div className="av-fair__row"><span>জেতা</span><b>{fmtX(result.units)}</b></div>
                        <div className="av-fair__row"><span>ফ্রি স্পিন</span><b>{result.freeSpins || '—'}</b></div>
                    </div>
                    <div className="note">
                        উপরের হ্যাশটি স্পিনের আগে দেখানো হ্যাশের সঙ্গে মিললে বোঝা যায় সিডটি
                        বদলানো হয়নি — অর্থাৎ ফলাফল বেট বসানোর আগেই ঠিক হয়ে ছিল।
                    </div>
                </section>
            )}
        </>
    );
}
