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
      setErr('Enter both the server seed and the client seed');
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
      <PageHeader title="Verify Fairness" />

      <div className="hero">
        <h1>Check it yourself</h1>
        <p>Recompute the result from a finished round’s seeds</p>
      </div>

      <form style={{ margin: 12 }} onSubmit={run} noValidate>
        <Field label="Server seed (revealed when the round ends)" error={err}>
          <input value={serverSeed} onChange={(e) => setServerSeed(e.target.value)}
                 placeholder="a1b2c3…" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Client seed">
          <input value={clientSeed} onChange={(e) => setClientSeed(e.target.value)}
                 placeholder="Your seed" autoComplete="off" spellCheck={false} />
        </Field>
        <Field label="Nonce (round number)">
          <input type="number" value={nonce} onChange={(e) => setNonce(e.target.value)} placeholder="1" />
        </Field>
        <button type="submit" className="btn btn--gold btn--block">Verify</button>
      </form>

      {result && (
        <div className="av-fair" style={{ margin: 12 }}>
          <div className="av-fair__row">
            <span>Server seed hash</span>
            <b className="mono">{result.hash.slice(0, 32)}…</b>
          </div>
          <div className="av-fair__row">
            <span>Computed crash point</span>
            <b style={{ color: 'var(--gold)', fontSize: 16 }}>{fmtX(result.crashAt)}</b>
          </div>
        </div>
      )}

      <div className="note" style={{ margin: 12 }}>
        If this hash matches the one you were shown during the round, the result was
        settled in advance and nobody could have changed it.
      </div>
    </>
  );
}
