import { Head } from '@inertiajs/react';
import { useState } from 'react';
import Field from '../../../components/Field';
import PageHeader from '../../../components/PageHeader';
import { fmtX } from '../../../lib/aviator';
import { postJson } from '../../../lib/http';

/** Lets a player re-derive a finished round from its published seed. */
export default function Fairness() {
    const [serverSeed, setServerSeed] = useState('');
    const [clientSeed, setClientSeed] = useState('');
    const [nonce, setNonce] = useState('');
    const [result, setResult] = useState<{ hash: string; crashAt: number } | null>(null);
    const [err, setErr] = useState('');
    const [busy, setBusy] = useState(false);

    const run = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!serverSeed.trim() || !clientSeed.trim()) {
            setErr('সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন');
            return;
        }
        setErr('');
        setBusy(true);
        try {
            const res = await postJson<{ server_seed_hash: string; crash_at: number }>(
                '/game/aviator/verify',
                {
                    server_seed: serverSeed.trim(),
                    client_seed: clientSeed.trim(),
                    nonce: Number(nonce) || 0,
                },
            );
            setResult({ hash: res.server_seed_hash, crashAt: res.crash_at });
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
                <p>শেষ হওয়া রাউন্ডের সিড দিয়ে ফলাফল আবার হিসাব করুন</p>
            </div>

            <form style={{ margin: 12 }} onSubmit={run} noValidate>
                <Field label="সার্ভার সিড (রাউন্ড শেষে প্রকাশিত)" error={err}>
                    <input value={serverSeed} onChange={(e) => setServerSeed(e.target.value)}
                           placeholder="a1b2c3…" autoComplete="off" spellCheck={false} />
                </Field>
                <Field label="ক্লায়েন্ট সিড">
                    <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)}
                           placeholder="আপনার সিড" autoComplete="off" spellCheck={false} />
                </Field>
                <Field label="নন্স (রাউন্ড নম্বর)">
                    <input type="number" value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="1" />
                </Field>
                <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
                    {busy ? 'যাচাই হচ্ছে…' : 'যাচাই করুন'}
                </button>
            </form>

            {result && (
                <div className="av-fair" style={{ margin: 12 }}>
                    <div className="av-fair__row">
                        <span>সার্ভার সিড হ্যাশ</span>
                        <b className="mono">{result.hash.slice(0, 32)}…</b>
                    </div>
                    <div className="av-fair__row">
                        <span>হিসাব করা ক্র‍্যাশ পয়েন্ট</span>
                        <b style={{ color: 'var(--gold)', fontSize: 16 }}>{fmtX(result.crashAt)}</b>
                    </div>
                </div>
            )}

            <div className="note" style={{ margin: 12 }}>
                রাউন্ড চলাকালে যে হ্যাশটি দেখানো হয়েছিল, উপরের হ্যাশ তার সাথে মিললে বোঝা
                যায় ফলাফল আগেই নির্ধারিত ছিল এবং কেউ তা বদলাতে পারেনি।
            </div>
        </>
    );
}
