'use client';

import { useState } from 'react';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { fmtX, verifyRound } from '@/lib/aviator';

/** Lets a player re-derive a finished round from its revealed seed. */
export default function FairnessPage() {
  const [serverSeed, setServerSeed] = useState('');
  const [clientSeed, setClientSeed] = useState('');
  const [nonce, setNonce] = useState('');
  const [result, setResult] = useState<{ hash: string; crashAt: number } | null>(null);
  const [err, setErr] = useState('');

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serverSeed.trim() || !clientSeed.trim()) {
      setErr('সার্ভার সিড ও ক্লায়েন্ট সিড দুটোই দিন');
      return;
    }
    setErr('');
    const { serverSeedHash, crashAt } = await verifyRound(
      serverSeed.trim(), clientSeed.trim(), Number(nonce) || 0,
    );
    setResult({ hash: serverSeedHash, crashAt });
  };

  return (
    <>
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
        <button type="submit" className="btn btn--gold btn--block">যাচাই করুন</button>
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
