'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { WITHDRAW_CHANNELS } from '@/lib/payments';
import { t } from '@/lib/strings';
import { useSiteSettings } from '@/components/useSiteSettings';

export default function WithdrawPage() {
  const { toast } = useUI();
  const { backendReady, session, wallet, supabase, refresh } = useAuth();
  const [channelId, setChannelId] = useState(WITHDRAW_CHANNELS[0].id);
  const [account, setAccount] = useState('');
  const [amount, setAmount] = useState('');
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const { min: MIN_WITHDRAW, max: MAX_WITHDRAW } = useSiteSettings().withdraw;

  const balance = toTaka(wallet?.balance ?? 0);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const next: Record<string, string> = {};
    if (!/^01\d{9}$/.test(account.trim())) next.account = 'সঠিক ১১ ডিজিটের নাম্বার দিন';
    const n = Number(amount);
    if (!Number.isFinite(n) || n < MIN_WITHDRAW) next.amount = `সর্বনিম্ন ${money(MIN_WITHDRAW)}`;
    else if (n > MAX_WITHDRAW) next.amount = `এক রিকোয়েস্টে সর্বোচ্চ ${money(MAX_WITHDRAW)}`;
    if (session && n > balance) next.amount = `ব্যালেন্সে আছে ${money(balance)}`;
    setErr(next);
    if (Object.keys(next).length) return;

    if (!backendReady) {
      toast('উইথড্র প্রসেসিং ব্যাকএন্ড যুক্ত হলে কাজ করবে');
      return;
    }
    if (!session || !supabase) {
      setErr({ amount: 'উইথড্র করতে আগে লগইন করুন' });
      return;
    }

    /* request_withdrawal debits the wallet inside the same statement that
       raises the request, so the amount cannot be gambled away while it waits
       in the queue. A rejection puts it back. */
    setBusy(true);
    const { error } = await supabase.rpc('request_withdrawal', {
      p_channel: channelId,
      p_amount: toPaisa(n),
      p_account_no: account.trim(),
    });
    setBusy(false);

    if (error) {
      setErr({
        amount: /balance|check/i.test(error.message)
          ? 'ব্যালেন্স যথেষ্ট নয়'
          : 'রিকোয়েস্ট পাঠানো গেল না — আবার চেষ্টা করুন',
      });
      return;
    }

    setAmount('');
    await refresh();
    toast('উইথড্র রিকোয়েস্ট জমা হয়েছে — অনুমোদনের পর টাকা পাঠানো হবে');
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
        <div className="profile__bal"><b>{money(balance)}</b><small>ব্যালেন্স</small></div>
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

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'পাঠানো হচ্ছে…' : `${t.withdraw} রিকোয়েস্ট`}
        </button>

        <div className="note">
          উইথড্র লিমিট: {money(MIN_WITHDRAW)} — {money(MAX_WITHDRAW)}।
          রিকোয়েস্ট করার সাথে সাথে টাকা ব্যালেন্স থেকে সরিয়ে রাখা হবে। অ্যাডমিন
          অনুমোদন করলে পাঠানো হবে, বাতিল করলে ব্যালেন্সে ফেরত আসবে।
        </div>
      </form>
    </>
  );
}
