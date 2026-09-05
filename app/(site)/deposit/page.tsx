'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { toPaisa } from '@/lib/auth';
import { money } from '@/lib/brand';
import { KIND_LABEL, type PublicDepositAccount } from '@/lib/payment-accounts';
import { DEPOSIT_CHANNELS, QUICK_AMOUNTS } from '@/lib/payments';
import { t } from '@/lib/strings';
import Link from 'next/link';

export default function DepositPage() {
  const { toast } = useUI();
  const { backendReady, session, supabase, refresh } = useAuth();
  const [channel, setChannel] = useState(DEPOSIT_CHANNELS[0]);
  const [amount, setAmount] = useState('');
  const [sender, setSender] = useState('');
  const [txnId, setTxnId] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [account, setAccount] = useState<PublicDepositAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(true);

  // One random operator number per channel pick. Switching channel — or
  // reloading — asks again, so players spread across the numbers the admin
  // added instead of all paying into the same one.
  useEffect(() => {
    let live = true;
    setLoadingAccount(true);
    setAccount(null);

    fetch(`/api/deposit/account?channel=${encodeURIComponent(channel.id)}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok: true; account: PublicDepositAccount } | null) => {
        if (live) setAccount(data?.ok ? data.account : null);
      })
      .catch(() => { if (live) setAccount(null); })
      .finally(() => { if (live) setLoadingAccount(false); });

    return () => { live = false; };
  }, [channel.id]);

  const copyNumber = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.number);
      toast('নাম্বার কপি হয়েছে');
    } catch {
      toast('কপি করা গেল না — হাতে লিখে নিন');
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();

    const n = Number(amount);
    if (!Number.isFinite(n) || n < channel.min || n > channel.max) {
      setErr(`${channel.name} এর জন্য ${money(channel.min)} — ${money(channel.max)} এর মধ্যে দিন`);
      return;
    }
    if (!/^01\d{9}$/.test(sender.trim())) {
      setErr('যে নাম্বার থেকে পাঠিয়েছেন সেটি দিন (১১ ডিজিট)');
      return;
    }
    setErr('');

    if (!backendReady) {
      toast('পেমেন্ট গেটওয়ে যুক্ত হলে এখান থেকে ডিপোজিট হবে');
      return;
    }
    if (!session || !supabase) {
      setErr('ডিপোজিট করতে আগে লগইন করুন');
      return;
    }

    // The player raises the request; RLS only lets them insert their own row.
    // An admin approves it at /admin/deposits, and only then does the money
    // reach the wallet.
    setBusy(true);
    const { error } = await supabase.from('deposits').insert({
      user_id: session.user.id,
      channel_id: channel.id,
      amount: toPaisa(n),
      sender_no: sender.trim(),
      txn_id: txnId.trim() || null,
    });
    setBusy(false);

    if (error) {
      setErr('রিকোয়েস্ট পাঠানো গেল না — আবার চেষ্টা করুন');
      return;
    }

    setAmount('');
    setSender('');
    setTxnId('');
    await refresh();
    toast('ডিপোজিট রিকোয়েস্ট জমা হয়েছে — অ্যাডমিন অনুমোদনের পর ব্যালেন্সে যোগ হবে');
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
          <label>{channel.name} নাম্বার</label>
          {loadingAccount ? (
            <div className="paybox paybox--wait">নাম্বার আনা হচ্ছে…</div>
          ) : account ? (
            <div className="paybox">
              <div className="paybox__top">
                <span className="paybox__kind">{KIND_LABEL[account.kind]}</span>
                <span className="paybox__ch">{account.channelName}</span>
              </div>
              <div className="paybox__row">
                <b className="paybox__num">{account.number}</b>
                <button type="button" className="btn btn--gold paybox__copy" onClick={copyNumber}>
                  কপি
                </button>
              </div>
              <div className="paybox__holder">{account.holder}</div>
              {account.note && <p className="paybox__note">{account.note}</p>}
            </div>
          ) : (
            <div className="paybox paybox--empty">
              এই মুহূর্তে {channel.name} নাম্বার দেওয়া নেই। সাপোর্টে যোগাযোগ করুন অথবা
              অন্য একটি মেথড বেছে নিন।
            </div>
          )}
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

        <Field label={`পরিমাণ (সর্বনিম্ন ${money(channel.min)})`}>
          <input
            type="number" inputMode="numeric" placeholder={String(channel.min)}
            value={amount} onChange={(e) => setAmount(e.target.value)}
            min={channel.min} max={channel.max}
          />
        </Field>

        <Field label="যে নাম্বার থেকে পাঠিয়েছেন">
          <input
            type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
            value={sender} onChange={(e) => setSender(e.target.value)}
          />
        </Field>

        <Field label="ট্রানজেকশন আইডি (ঐচ্ছিক)" error={err}>
          <input
            placeholder="যেমন: 9F2K4L8M"
            value={txnId} onChange={(e) => setTxnId(e.target.value)}
          />
        </Field>

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'পাঠানো হচ্ছে…' : `${t.deposit} করুন`}
        </button>

        <div className="note">
          ডিপোজিট লিমিট: {money(channel.min)} — {money(channel.max)}।
          উপরের নাম্বারে টাকা পাঠিয়ে, তারপর পরিমাণ ও যে নাম্বার থেকে পাঠিয়েছেন
          সেটি দিয়ে সাবমিট করুন। অ্যাডমিন অনুমোদন করলে ব্যালেন্সে যোগ হবে।
        </div>
      </form>
    </>
  );
}
