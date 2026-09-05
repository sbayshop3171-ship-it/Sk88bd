'use client';

import Link from 'next/link';
import { useState } from 'react';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { money } from '@/lib/brand';
import { WITHDRAW_CHANNELS } from '@/lib/payments';
import { t } from '@/lib/strings';

const MIN_WITHDRAW = 500;

export default function WithdrawPage() {
  const { toast } = useUI();
  const [channelId, setChannelId] = useState(WITHDRAW_CHANNELS[0].id);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!/^01\d{9}$/.test(account.trim())) next.account = 'সঠিক ১১ ডিজিটের নাম্বার দিন';
    const n = Number(amount);
    if (!Number.isFinite(n) || n < MIN_WITHDRAW) next.amount = `সর্বনিম্ন ${money(MIN_WITHDRAW)}`;
    setErr(next);
    if (Object.keys(next).length) return;
    toast('উইথড্র প্রসেসিং ব্যাকএন্ড যুক্ত হলে কাজ করবে');
  };

  return (
    <>
      <PageHeader
        title={t.withdraw}
        action={<Link href="/withdraw-history" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 12px' }}>হিস্টোরি</Link>}
      />

      <div className="profile">
        <i className="profile__av" aria-hidden>👤</i>
        <div>
          <div className="profile__n">উইথড্রযোগ্য</div>
          <div className="profile__id">টার্নওভার সম্পূর্ণ হলে তোলা যাবে</div>
        </div>
        <div className="profile__bal"><b>{money(0)}</b><small>ব্যালেন্স</small></div>
      </div>

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="পেমেন্ট মেথড">
          <select value={channelId} onChange={(e) => setChannelId(e.target.value)}>
            {WITHDRAW_CHANNELS.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="আপনার অ্যাকাউন্ট নাম্বার" error={err.account}>
          <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                 value={account} onChange={(e) => setAccount(e.target.value)} />
        </Field>
        <Field label={`পরিমাণ (সর্বনিম্ন ${money(MIN_WITHDRAW)})`} error={err.amount}>
          <input type="number" inputMode="numeric" placeholder={String(MIN_WITHDRAW)}
                 value={amount} onChange={(e) => setAmount(e.target.value)} />
        </Field>

        <button type="submit" className="btn btn--gold btn--block">{t.withdraw} রিকোয়েস্ট</button>

        <div className="note">
          উইথড্র রিকোয়েস্ট অ্যাডমিন প্যানেল থেকে অনুমোদনের পর প্রসেস হবে।
        </div>
      </form>
    </>
  );
}
