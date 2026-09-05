'use client';

import { useState } from 'react';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { money } from '@/lib/brand';
import { DEPOSIT_CHANNELS, QUICK_AMOUNTS } from '@/lib/payments';
import { t } from '@/lib/strings';
import Link from 'next/link';

export default function DepositPage() {
  const { toast } = useUI();
  const [channel, setChannel] = useState(DEPOSIT_CHANNELS[0]);
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < channel.min || n > channel.max) {
      setErr(`${channel.name} এর জন্য ${money(channel.min)} — ${money(channel.max)} এর মধ্যে দিন`);
      return;
    }
    setErr('');
    toast('পেমেন্ট গেটওয়ে যুক্ত হলে এখান থেকে ডিপোজিট হবে');
  };

  return (
    <>
      <PageHeader
        title={t.deposit}
        action={<Link href="/deposit-history" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 12px' }}>হিস্টোরি</Link>}
      />

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <div className="field">
          <label>পেমেন্ট মেথড</label>
          <div className="grid grid--2" style={{ gap: 8 }}>
            {DEPOSIT_CHANNELS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => { setChannel(c); setErr(''); }}
                className="game"
                style={{
                  padding: '10px 8px',
                  display: 'flex', alignItems: 'center', gap: 9,
                  borderColor: c.id === channel.id ? 'var(--gold)' : 'var(--line)',
                  background: c.id === channel.id ? 'rgba(255,196,46,.12)' : undefined,
                }}
                aria-pressed={c.id === channel.id}
              >
                <span className={c.art} style={{ width: 30, height: 30, borderRadius: 8, display: 'grid', placeItems: 'center', fontSize: 15, flex: '0 0 30px' }}>
                  {c.glyph}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{c.name}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label>দ্রুত সিলেক্ট</label>
          <div className="scroll-x">
            <div className="provs">
              {QUICK_AMOUNTS.map((a) => (
                <button key={a} type="button" className="prov" onClick={() => setAmount(String(a))}>
                  {money(a)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <Field label={`পরিমাণ (সর্বনিম্ন ${money(channel.min)})`} error={err}>
          <input
            type="number" inputMode="numeric" placeholder={String(channel.min)}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            min={channel.min} max={channel.max}
          />
        </Field>

        <button type="submit" className="btn btn--gold btn--block">{t.deposit} করুন</button>

        <div className="note">
          ডিপোজিট লিমিট: {money(channel.min)} — {money(channel.max)}।
          পেমেন্ট গেটওয়ে ও অপারেটর অ্যাকাউন্ট নাম্বার অ্যাডমিন প্যানেল থেকে সেট হবে।
        </div>
      </form>
    </>
  );
}
