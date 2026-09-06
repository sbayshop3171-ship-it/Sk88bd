'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useCashierConfig } from '@/components/useCashierConfig';
import { useUI } from '@/components/UIProvider';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { isImageIcon, type WithdrawMethod } from '@/lib/cashier-config';
import { t } from '@/lib/strings';

type Wallet = { id: number; channel_id: string; account_no: string; holder: string };

/** Pick a method, pick (or add) one of your saved wallets for it, type the
    amount and your password, and the request is raised. Copy, methods and
    the daily rule come from the admin's cashier design. */
export default function WithdrawPage() {
  const { toast } = useUI();
  const { ready, backendReady, session, wallet, supabase, refresh } = useAuth();
  const { config, ready: configReady } = useCashierConfig();
  const cfg = config.withdraw;

  const methods = useMemo(() => cfg.methods.filter((m) => m.active), [cfg.methods]);
  const [methodId, setMethodId] = useState('');
  const method: WithdrawMethod | undefined = methods.find((m) => m.id === methodId) ?? methods[0];

  const [wallets, setWallets] = useState<Wallet[] | null>(null);
  // false once the payout_accounts table turns out to be missing (migration
  // 005 not applied yet) — the screen then takes the number inline
  const [walletsSupported, setWalletsSupported] = useState(true);
  const [walletId, setWalletId] = useState<number | null>(null);
  const [adding, setAdding] = useState(false);
  const [newNo, setNewNo] = useState('');
  const [newHolder, setNewHolder] = useState('');
  const [inlineNo, setInlineNo] = useState('');
  const [todayCount, setTodayCount] = useState(0);
  const [amount, setAmount] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ amount: number; account: string } | null>(null);

  const balance = toTaka(wallet?.balance ?? 0);
  const signedIn = ready && Boolean(session);
  const forMethod = (wallets ?? []).filter((w) => method && w.channel_id === method.channelId);
  const picked = forMethod.find((w) => w.id === walletId) ?? forMethod[0];
  const remaining = cfg.dailyLimit > 0 ? Math.max(0, cfg.dailyLimit - todayCount) : null;

  const loadWallets = useCallback(async () => {
    if (!supabase || !session) return;
    const { data, error } = await supabase
      .from('payout_accounts')
      .select('id, channel_id, account_no, holder')
      .order('created_at', { ascending: true });
    if (error) {
      setWalletsSupported(false);
      setWallets([]);
      return;
    }
    setWallets((data as Wallet[]) ?? []);
  }, [supabase, session]);

  const loadToday = useCallback(async () => {
    if (!supabase || !session) return;
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const { count } = await supabase
      .from('withdrawals')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', start.toISOString());
    setTodayCount(count ?? 0);
  }, [supabase, session]);

  useEffect(() => {
    void loadWallets();
    void loadToday();
  }, [loadWallets, loadToday]);

  const addWallet = async () => {
    if (!method || !supabase || !session) return;
    const no = newNo.replace(/[\s-]+/g, '');
    if (no.length < 4) { setErr({ add: 'সঠিক নাম্বার দিন' }); return; }
    if (forMethod.length >= cfg.maxWallets) { setErr({ add: `সর্বোচ্চ ${cfg.maxWallets} টি ওয়ালেট রাখা যায়` }); return; }
    setBusy(true);
    const { error } = await supabase.from('payout_accounts').insert({
      user_id: session.user.id,
      channel_id: method.channelId,
      account_no: no,
      holder: newHolder.trim().slice(0, 60),
    });
    setBusy(false);
    if (error) {
      setErr({ add: /duplicate|unique/i.test(error.message) ? 'এই নাম্বারটি আগে থেকেই আছে' : 'যোগ করা গেল না — আবার চেষ্টা করুন' });
      return;
    }
    setErr({});
    setNewNo('');
    setNewHolder('');
    setAdding(false);
    await loadWallets();
    toast('ই-ওয়ালেট যোগ হয়েছে');
  };

  const removeWallet = async (id: number) => {
    if (!supabase) return;
    const { error } = await supabase.from('payout_accounts').delete().eq('id', id);
    if (error) { toast('মুছে ফেলা গেল না'); return; }
    if (walletId === id) setWalletId(null);
    await loadWallets();
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!method) return;

    const accountNo = walletsSupported ? picked?.account_no ?? '' : inlineNo.replace(/[\s-]+/g, '');
    const next: Record<string, string> = {};
    if (!accountNo) next.account = walletsSupported ? 'আগে একটি ই-ওয়ালেট যোগ করুন' : 'অ্যাকাউন্ট নাম্বার দিন';
    const n = Number(amount);
    if (!Number.isFinite(n) || n < method.min) next.amount = `সর্বনিম্ন ${money(method.min)}`;
    else if (n > method.max) next.amount = `এক রিকোয়েস্টে সর্বোচ্চ ${money(method.max)}`;
    if (session && n > balance) next.amount = `ব্যালেন্সে আছে ${money(balance)}`;
    if (remaining !== null && remaining <= 0) next.amount = 'আজকের উত্তোলন সীমা শেষ — কাল আবার চেষ্টা করুন';
    if (!password) next.password = cfg.passwordHint || 'পাসওয়ার্ড দিন';
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

    setBusy(true);
    // the "transaction password" is the login password, re-checked here so a
    // borrowed phone cannot empty the wallet
    const check = await supabase.auth.signInWithPassword({ email: session.user.email ?? '', password });
    if (check.error) {
      setBusy(false);
      setErr({ password: 'পাসওয়ার্ড ভুল' });
      return;
    }

    /* request_withdrawal debits the wallet inside the same statement that
       raises the request, so the amount cannot be gambled away while it waits
       in the queue. A rejection puts it back. */
    const { error } = await supabase.rpc('request_withdrawal', {
      p_channel: method.channelId,
      p_amount: toPaisa(n),
      p_account_no: accountNo,
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
    setPassword('');
    await refresh();
    void loadToday();
    setDone({ amount: n, account: accountNo });
    window.scrollTo({ top: 0 });
  };

  if (!method) {
    return (
      <>
        <PageHeader title={t.withdraw} />
        <div className="note" style={{ margin: 12 }}>
          {configReady ? 'এই মুহূর্তে কোনো উইথড্র মেথড চালু নেই। সাপোর্টে যোগাযোগ করুন।' : 'লোড হচ্ছে…'}
        </div>
      </>
    );
  }

  if (done) {
    return (
      <>
        <PageHeader title={t.withdraw} />
        <div className="cz-done">
          <span className="cz-done__tick" aria-hidden>✓</span>
          <h2>রিকোয়েস্ট জমা হয়েছে!</h2>
          <p>
            {money(done.amount)} {method.name} ({done.account}) এ পাঠানোর রিকোয়েস্ট জমা হয়েছে।
            অ্যাডমিন অনুমোদন করলে {cfg.processingTime} এর মধ্যে পৌঁছাবে।
          </p>
          <button type="button" className="btn btn--gold" onClick={() => setDone(null)}>আরেকটি উত্তোলন</button>
          <div className="cz-done__links">
            <Link href="/withdraw-history">হিস্টোরি দেখুন</Link>
            <Link href="/">হোমে ফিরুন</Link>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={t.withdraw}
        action={<Link href="/withdraw-history" className="btn btn--ghost" style={{ fontSize: 11, padding: '6px 12px' }}>হিস্টোরি</Link>}
      />

      <div className="cz-tabs scroll-x" role="tablist">
        {methods.map((m) => (
          <button
            key={m.id}
            type="button"
            role="tab"
            aria-selected={m.id === method.id}
            className={`cz-tab${m.id === method.id ? ' on' : ''}`}
            onClick={() => { setMethodId(m.id); setWalletId(null); setErr({}); }}
          >
            <MethodIcon method={m} size={22} />
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      <form className="cz" onSubmit={submit} noValidate>
        {walletsSupported ? (
          <section className="cz-sec cz-wallets">
            <h2 className="cz-sec__h">
              {cfg.walletsTitle} ({forMethod.length}/{cfg.maxWallets})
            </h2>
            {!signedIn ? (
              <p className="cz-note">লগইন করলে আপনার সংরক্ষিত ওয়ালেট এখানে দেখা যাবে।</p>
            ) : forMethod.length === 0 ? (
              <div className="cz-wallets__empty">
                <span aria-hidden>💳</span>
                <small>{cfg.emptyWalletsText}</small>
              </div>
            ) : (
              <div className="cz-wallets__list">
                {forMethod.map((w) => (
                  <label key={w.id} className={`cz-wallet-row${picked?.id === w.id ? ' on' : ''}`}>
                    <input type="radio" name="wallet" checked={picked?.id === w.id} onChange={() => setWalletId(w.id)} />
                    <MethodIcon method={method} size={22} />
                    <span className="cz-wallet-row__no">
                      <b>{w.account_no}</b>
                      {w.holder && <small>{w.holder}</small>}
                    </span>
                    <button type="button" className="cz-wallet-row__x" aria-label="মুছুন" onClick={() => void removeWallet(w.id)}>×</button>
                  </label>
                ))}
              </div>
            )}
            {signedIn && forMethod.length < cfg.maxWallets && (
              <button type="button" className="cz-add" aria-label="ওয়ালেট যোগ করুন" onClick={() => { setAdding(true); setErr({}); }}>+</button>
            )}
            {err.account && <p className="cz-err">{err.account}</p>}
          </section>
        ) : (
          <section className="cz-sec">
            <h2 className="cz-sec__h">আপনার {method.name} নাম্বার</h2>
            <input
              className="cz-input" type="tel" inputMode="numeric" placeholder={method.accountHint}
              value={inlineNo} onChange={(e) => setInlineNo(e.target.value)}
            />
            {err.account && <p className="cz-err">{err.account}</p>}
          </section>
        )}

        <section className="cz-sec cz-info">
          <p><span>উত্তোলন সময়:</span> <b>{cfg.processingTime}</b></p>
          {cfg.reminder && <p className="cz-info__rem"><i aria-hidden>✅</i> <span>সৌজন্যমূলক স্মরণিকা:</span> {cfg.reminder}</p>}
          {remaining !== null && (
            <p className="cz-info__daily">দৈনিক উত্তোলন {cfg.dailyLimit} (বার), অবশিষ্ট উত্তোলন {remaining} (বার)</p>
          )}
          <p><span>প্রধান ওয়ালেট:</span> <b>{money(balance, 2)}</b></p>
          <p><span>উপলব্ধ পরিমাণ:</span> <b>{money(balance, 2)}</b></p>
          <button type="button" className="cz-refresh" onClick={() => { void refresh(); void loadToday(); toast('ব্যালেন্স রিফ্রেশ হয়েছে'); }}>
            <i aria-hidden>🔄</i> আপনার ব্যালেন্স রিফ্রেশ করুন
          </button>
        </section>

        <section className="cz-sec">
          <h2 className="cz-sec__h">{cfg.amountLabel}:</h2>
          <label className="cz-field">
            <span>পরিমাণ</span>
            <input
              type="number" inputMode="numeric" placeholder={`${method.min} — ${method.max}`}
              value={amount} onChange={(e) => setAmount(e.target.value)}
            />
          </label>
          {err.amount && <p className="cz-err">{err.amount}</p>}
          <label className="cz-field">
            <span>{cfg.passwordLabel}</span>
            <input
              type={showPass ? 'text' : 'password'} autoComplete="current-password" placeholder="••••"
              value={password} onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="cz-field__eye" aria-label="দেখান" onClick={() => setShowPass((v) => !v)}>
              {showPass ? '🙈' : '👁'}
            </button>
          </label>
          {err.password && <p className="cz-err">{err.password}</p>}
          {cfg.passwordHint && !err.password && <p className="cz-limit">{cfg.passwordHint}</p>}
        </section>

        <div className="cz-next cz-next--inline">
          <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
            {busy ? 'পাঠানো হচ্ছে…' : `${t.withdraw} রিকোয়েস্ট`}
          </button>
          {cfg.note && <p className="cz-limit">{cfg.note}</p>}
        </div>
      </form>

      {adding && (
        <>
          <div className="scrim on" onClick={() => setAdding(false)} />
          <div className="modal cz-modal" role="dialog" aria-modal="true">
            <h3>{method.name} ওয়ালেট যোগ করুন</h3>
            <p>যে নাম্বারে টাকা নিতে চান। নিজের নামে থাকা অ্যাকাউন্ট দিন।</p>
            <label className="cz-field">
              <span>নাম্বার</span>
              <input type="tel" inputMode="numeric" placeholder={method.accountHint} value={newNo} onChange={(e) => setNewNo(e.target.value)} autoFocus />
            </label>
            <label className="cz-field">
              <span>অ্যাকাউন্টের নাম (ঐচ্ছিক)</span>
              <input value={newHolder} onChange={(e) => setNewHolder(e.target.value)} />
            </label>
            {err.add && <p className="cz-err">{err.add}</p>}
            <div className="cz-modal__acts">
              <button type="button" className="btn btn--ghost" onClick={() => setAdding(false)}>বাতিল</button>
              <button type="button" className="btn btn--gold" disabled={busy} onClick={() => void addWallet()}>যোগ করুন</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}

function MethodIcon({ method, size }: { method: WithdrawMethod; size: number }) {
  if (isImageIcon(method.icon)) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="cz-icon" src={method.icon} alt="" width={size} height={size} style={{ width: size, height: size }} />;
  }
  return (
    <span className="cz-icon cz-icon--glyph" style={{ width: size, height: size, fontSize: size * 0.55, color: method.color }} aria-hidden>
      {method.icon}
    </span>
  );
}
