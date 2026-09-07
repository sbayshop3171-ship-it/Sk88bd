'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useCashierConfig } from '@/components/useCashierConfig';
import { useUI } from '@/components/UIProvider';
import { toPaisa, toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import {
  chargeBase,
  fillTokens,
  isImageIcon,
  withdrawCharge,
  type DepositMethod,
  type WithdrawMethod,
} from '@/lib/cashier-config';
import type { PublicDepositAccount } from '@/lib/payment-accounts';
import { DEPOSIT_CHANNELS } from '@/lib/payments';
import { t } from '@/lib/strings';

type Wallet = { id: number; channel_id: string; account_no: string; holder: string };

/** The raised request, snapshotted the moment it leaves the form: the wallet
    is debited straight away, so the balance the charge was worked out on is
    only true before that point. */
type Raised = {
  id: number | null;
  amount: number;
  account: string;
  balance: number;
  charge: number;
};

type Step = 'form' | 'summary' | 'pay' | 'done';

/** Four screens. Pick a method, a saved wallet and an amount → read the
    summary of what the withdrawal will cost → cash the agent charge out to
    the number shown and hand back its TrxID → done. Every label, rule and
    the charge rate itself come from the admin's cashier design. */
export default function WithdrawPage() {
  /* The withdraw flow is the one white screen on a dark site, and its `cz-`
     classes are shared with deposit — so the skin is a body class held for
     as long as this page is mounted, the same way a game claims the chrome. */
  useEffect(() => {
    document.body.classList.add('cz-light');
    return () => document.body.classList.remove('cz-light');
  }, []);

  const { toast } = useUI();
  const { ready, backendReady, session, wallet, supabase, refresh } = useAuth();
  const { config, ready: configReady } = useCashierConfig();
  const cfg = config.withdraw;

  const methods = useMemo(() => cfg.methods.filter((m) => m.active), [cfg.methods]);
  const [methodId, setMethodId] = useState('');
  const method: WithdrawMethod | undefined = methods.find((m) => m.id === methodId) ?? methods[0];

  // The charge is cashed out to us, so it is paid the same way a deposit is:
  // through a method the admin marked as a cash-out in the deposit design.
  const chargeMethods = useMemo(() => {
    const active = config.deposit.methods.filter((m) => m.active);
    const cashout = active.filter((m) => m.payType === 'cashout');
    return cashout.length ? cashout : active.filter((m) => m.payType !== 'transfer');
  }, [config.deposit.methods]);
  const [chargeMethodId, setChargeMethodId] = useState('');
  const chargeMethod: DepositMethod | undefined =
    chargeMethods.find((m) => m.id === chargeMethodId) ?? chargeMethods[0];

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

  const [step, setStep] = useState<Step>('form');
  const [raised, setRaised] = useState<Raised | null>(null);
  const [agent, setAgent] = useState<PublicDepositAccount | null>(null);
  const [loadingAgent, setLoadingAgent] = useState(false);
  const [chargeTrx, setChargeTrx] = useState('');

  const balance = toTaka(wallet?.balance ?? 0);
  const signedIn = ready && Boolean(session);
  const forMethod = (wallets ?? []).filter((w) => method && w.channel_id === method.channelId);
  const picked = forMethod.find((w) => w.id === walletId) ?? forMethod[0];
  const remaining = cfg.dailyLimit > 0 ? Math.max(0, cfg.dailyLimit - todayCount) : null;

  // What the player will owe on top of the request. It never leaves the
  // wallet — the admin collects it against the TrxID — so every screen only
  // has to state it plainly and keep it in step with the amount box.
  const typed = Number(amount);
  const typedOk = Number.isFinite(typed) && typed > 0;
  const previewBase = chargeBase(cfg.chargeBasis, typedOk ? typed : 0, balance);
  const previewCharge = withdrawCharge(previewBase, cfg.chargePerThousand);
  const chargeOn = cfg.chargePerThousand > 0;

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

  // One agent number per visit to the charge screen, from the numbers the
  // admin marked "উইথড্র" for that channel.
  useEffect(() => {
    if (step !== 'pay' || !chargeMethod) return;
    let live = true;
    setLoadingAgent(true);
    setAgent(null);
    /* side=withdraw so the charge lands on the number the admin designated
       for it at /admin/payments, not on whichever deposit till came up. */
    const url = `/api/deposit/account?side=withdraw&channel=${encodeURIComponent(chargeMethod.channelId)}`;
    const pick = async () => {
      for (const query of [`${url}&kinds=agent`, url]) {
        const res = await fetch(query, { cache: 'no-store' }).catch(() => null);
        if (res?.ok) {
          const data = (await res.json()) as { ok: true; account: PublicDepositAccount };
          if (data?.ok) return data.account;
        }
      }
      return null;
    };
    void pick()
      .then((found) => { if (live) setAgent(found); })
      .finally(() => { if (live) setLoadingAgent(false); });
    return () => { live = false; };
  }, [step, chargeMethod]);

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

  /* ---------------- step 1 → 2: check everything, then show the summary --- */
  const review = async (e: React.FormEvent) => {
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

    // the "transaction password" is the login password, re-checked here so a
    // borrowed phone cannot empty the wallet
    setBusy(true);
    const check = await supabase.auth.signInWithPassword({ email: session.user.email ?? '', password });
    setBusy(false);
    if (check.error) {
      setErr({ password: 'পাসওয়ার্ড ভুল' });
      return;
    }

    setRaised({
      id: null,
      amount: n,
      account: accountNo,
      balance,
      charge: withdrawCharge(chargeBase(cfg.chargeBasis, n, balance), cfg.chargePerThousand),
    });
    setStep('summary');
    window.scrollTo({ top: 0 });
  };

  /* ---------------- step 2 → 3: raise the request ------------------------ */
  const apply = async () => {
    if (!method || !raised || !supabase) return;
    setBusy(true);

    /* request_withdrawal debits the wallet inside the same statement that
       raises the request, so the amount cannot be gambled away while it waits
       in the queue. A rejection puts it back. */
    const { data, error } = await supabase.rpc('request_withdrawal', {
      p_channel: method.channelId,
      p_amount: toPaisa(raised.amount),
      p_account_no: raised.account,
    });
    setBusy(false);

    if (error) {
      setErr({
        apply: /balance|check/i.test(error.message)
          ? 'ব্যালেন্স যথেষ্ট নয়'
          : 'রিকোয়েস্ট পাঠানো গেল না — আবার চেষ্টা করুন',
      });
      return;
    }

    const id = typeof data === 'number' ? data : null;
    setRaised({ ...raised, id });
    setErr({});
    setPassword('');
    await refresh();
    void loadToday();

    // Nothing more to pay: skip the charge screen entirely.
    if (!chargeOn || raised.charge <= 0) {
      setStep('done');
      window.scrollTo({ top: 0 });
      return;
    }
    /* The charge is quoted by the server from the cashier config — the
       browser only says which withdrawal and which channel. */
    if (id !== null) {
      await quoteCharge(id, { channelId: chargeMethod?.channelId });
    }
    setStep('pay');
    window.scrollTo({ top: 0 });
  };

  /* The charge and the proof both go through our own route rather than
     straight at the database: the figure is worked out server-side from the
     cashier config, so the browser never gets to say what it owes. */
  const quoteCharge = async (
    id: number,
    extra: { channelId?: string; trxId?: string },
  ): Promise<boolean> => {
    try {
      const res = await fetch('/api/withdraw/charge', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id, ...extra }),
      });
      const data = (await res.json()) as { ok?: boolean };
      return Boolean(data?.ok);
    } catch {
      return false;
    }
  };

  /* ---------------- step 3 → 4: hand back the charge TrxID --------------- */
  const confirmCharge = async () => {
    if (!raised) return;
    const trx = chargeTrx.trim();
    if (!trx) { setErr({ trx: 'TrxID অবশ্যই পূরণ করতে হবে!' }); return; }

    setBusy(true);
    const saved = raised.id === null
      ? true
      : await quoteCharge(raised.id, {
        channelId: chargeMethod?.channelId,
        trxId: trx,
      });
    setBusy(false);

    if (!saved) {
      setErr({ trx: 'TrxID জমা দেওয়া গেল না — আবার চেষ্টা করুন' });
      return;
    }
    setErr({});
    setStep('done');
    window.scrollTo({ top: 0 });
  };

  const restart = () => {
    setAmount('');
    setPassword('');
    setChargeTrx('');
    setRaised(null);
    setAgent(null);
    setErr({});
    setStep('form');
    window.scrollTo({ top: 0 });
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} কপি হয়েছে`);
    } catch {
      toast('কপি করা গেল না — হাতে লিখে নিন');
    }
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

  const tokens = {
    rate: money(cfg.chargePerThousand),
    min: money(method.min),
    max: money(method.max),
    time: cfg.processingTime,
    charge: money(raised?.charge ?? previewCharge),
    balance: money(raised?.balance ?? balance),
    amount: money(raised?.amount ?? (typedOk ? typed : 0)),
  };

  /* ---------------- step 4: done ---------------- */
  if (step === 'done' && raised) {
    return (
      <>
        <PageHeader title={t.withdraw} />
        <div className="cz-done">
          <span className="cz-done__tick" aria-hidden>✓</span>
          <h2>রিকোয়েস্ট জমা হয়েছে!</h2>
          <p>
            {money(raised.amount)} {method.name} ({raised.account}) এ পাঠানোর রিকোয়েস্ট জমা হয়েছে।
            {raised.charge > 0 && chargeTrx.trim()
              ? ` চার্জের TrxID (${chargeTrx.trim()}) যাচাই হলে ${cfg.processingTime} এর মধ্যে টাকা পৌঁছাবে।`
              : ` অ্যাডমিন অনুমোদন করলে ${cfg.processingTime} এর মধ্যে পৌঁছাবে।`}
          </p>
          <button type="button" className="btn btn--gold" onClick={restart}>আরেকটি উত্তোলন</button>
          <div className="cz-done__links">
            <Link href="/withdraw-history">হিস্টোরি দেখুন</Link>
            <Link href="/">হোমে ফিরুন</Link>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- step 3: pay the agent charge ---------------- */
  if (step === 'pay' && raised) {
    const guide = cfg.guideLines.split('\n').map((l) => l.trim()).filter(Boolean);
    return (
      <>
        <div className="cz-top cz-top--pay">
          <div>
            <b>BDT {raised.charge.toLocaleString('en-IN')}</b>
            <small>{cfg.payTitle}</small>
          </div>
          <span className="cz-top__tag">PAY</span>
        </div>

        <div className="cz-pay">
          {cfg.payWarning && <p className="cz-warn">{cfg.payWarning}</p>}

          {chargeMethods.length > 1 && (
            <div className="cz-tabs scroll-x" role="tablist">
              {chargeMethods.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  role="tab"
                  aria-selected={m.id === chargeMethod?.id}
                  className={`cz-tab${m.id === chargeMethod?.id ? ' on' : ''}`}
                  onClick={() => { setChargeMethodId(m.id); setErr({}); }}
                >
                  <MethodIcon method={m} size={30} />
                  <span>{m.name}</span>
                </button>
              ))}
            </div>
          )}

          {chargeMethod && (
            <div className="cz-gate" style={{ background: chargeMethod.color }}>
              <MethodIcon method={chargeMethod} size={40} />
              <b>{channelName(chargeMethod.channelId)} এজেন্ট চার্জ</b>
            </div>
          )}

          <div className="cz-label">এজেন্ট নাম্বার<span>*</span></div>
          {cfg.agentNote && <p className="cz-sub">{cfg.agentNote}</p>}
          {loadingAgent ? (
            <div className="paybox paybox--wait">নাম্বার আনা হচ্ছে…</div>
          ) : agent ? (
            <div className="cz-wallet">
              <div className="cz-wallet__row">
                <b>{agent.number}</b>
                <button type="button" className="cz-wallet__copy" onClick={() => void copy(agent.number, 'নাম্বার')} aria-label="কপি">⧉</button>
              </div>
              {agent.holder && <div className="cz-wallet__meta"><span>{agent.holder}</span></div>}
            </div>
          ) : (
            <div className="paybox paybox--empty">
              এই মুহূর্তে এজেন্ট নাম্বার দেওয়া নেই। সাপোর্টে যোগাযোগ করুন — আপনার
              রিকোয়েস্ট জমা আছে, বাতিল হয়নি।
            </div>
          )}

          <div className="cz-label">চার্জের পরিমাণ<span>*</span></div>
          {cfg.chargeExactNote && <p className="cz-sub">{cfg.chargeExactNote}</p>}
          <div className="cz-wallet cz-wallet--gold">
            <div className="cz-wallet__row">
              <b>{money(raised.charge)}</b>
              <button type="button" className="cz-wallet__copy" onClick={() => void copy(String(raised.charge), 'চার্জ')} aria-label="কপি">⧉</button>
            </div>
          </div>

          {(cfg.guideTitle || guide.length > 0) && (
            <div className="cz-guide">
              {cfg.guideTitle && <b>ⓘ {cfg.guideTitle}</b>}
              <ul>
                {guide.map((line, i) => <li key={i}>{fillTokens(line, tokens)}</li>)}
              </ul>
            </div>
          )}

          <p className="cz-meta">
            উত্তোলন: <b>{money(raised.amount)}</b> · ব্যালেন্স ছিল: <b>{money(raised.balance)}</b>
          </p>

          <div className="cz-label">
            {cfg.chargeTrxLabel}
            <span>(প্রয়োজন)</span>
          </div>
          <input
            className={`cz-trx${chargeTrx.trim() ? ' ok' : ''}`}
            placeholder={cfg.chargeTrxPlaceholder}
            value={chargeTrx}
            onChange={(e) => { setChargeTrx(e.target.value); setErr({}); }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          {err.trx && <p className="cz-err">{err.trx}</p>}

          <button type="button" className="btn btn--gold cz-confirm" disabled={busy} onClick={() => void confirmCharge()}>
            {busy ? 'পাঠানো হচ্ছে…' : 'নিশ্চিত'}
          </button>

          {cfg.chargeCaution && (
            <div className="cz-caution">
              <b>সতর্কতা:</b>
              <p>{cfg.chargeCaution}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  /* ---------------- step 2: the summary ---------------- */
  if (step === 'summary' && raised) {
    const rules = cfg.rules.split('\n').map((l) => l.trim()).filter(Boolean);
    const base = chargeBase(cfg.chargeBasis, raised.amount, raised.balance);
    return (
      <>
        <div className="cz-top cz-top--pay">
          <button type="button" className="cz-top__back" aria-label="পিছনে" onClick={() => { setStep('form'); setErr({}); }}>‹</button>
          <div>
            <b>BDT {raised.amount.toLocaleString('en-IN')}</b>
            <small>{cfg.summaryTitle}</small>
          </div>
          <span className="cz-top__tag">PAY</span>
        </div>

        <div className="cz-pay">
          {cfg.summaryWarning && <p className="cz-warn">{cfg.summaryWarning}</p>}

          <div className="cz-gate" style={{ background: method.color }}>
            <MethodIcon method={method} size={40} />
            <b>{method.name}</b>
          </div>

          <div className="cz-label">অ্যাকাউন্ট নাম্বার<span>*</span></div>
          <p className="cz-sub">এই নাম্বারে উত্তোলনের টাকা পাঠানো হবে</p>
          <div className="cz-ro">{raised.account}</div>

          <div className="cz-label">উত্তোলনের পরিমাণ</div>
          <div className="cz-ro cz-ro--gold">{money(raised.amount)}</div>

          {chargeOn && raised.charge > 0 && (
            <>
              <div className="cz-label cz-label--warn">⚠ {cfg.chargeLabel}<span>*</span></div>
              <p className="cz-sub">
                {money(base)} × ({money(cfg.chargePerThousand)}/৳1,000) = {money(raised.charge)}
              </p>
              <div className="cz-ro cz-ro--red">{money(raised.charge)}</div>
            </>
          )}

          {rules.length > 0 && (
            <div className="cz-rules">
              {cfg.rulesTitle && <b>📋 {cfg.rulesTitle}</b>}
              <ol>
                {rules.map((line, i) => {
                  const red = line.startsWith('!');
                  return (
                    <li key={i} className={red ? 'red' : undefined}>
                      {fillTokens(red ? line.slice(1) : line, tokens)}
                    </li>
                  );
                })}
              </ol>
            </div>
          )}

          {chargeOn && raised.charge > 0 && (
            <div className="cz-calc">
              <b>🧮 চার্জ হিসাব</b>
              <p><span>{cfg.chargeBasis === 'balance' ? 'আপনার ব্যালেন্স' : 'উত্তোলনের পরিমাণ'}</span><b>{money(base)}</b></p>
              <p><span>চার্জ রেট</span><b>প্রতি ৳1,000 এ {money(cfg.chargePerThousand)}</b></p>
              <p className="cz-calc__total"><span>মোট চার্জ</span><b>{money(raised.charge)}</b></p>
            </div>
          )}

          {err.apply && <p className="cz-err">{err.apply}</p>}

          <button type="button" className="btn btn--gold cz-confirm" disabled={busy} onClick={() => void apply()}>
            {busy ? 'পাঠানো হচ্ছে…' : cfg.applyLabel}
          </button>

          {cfg.chargeWarning && (
            <div className="cz-caution">
              <b>সতর্কতা:</b>
              <p>{cfg.chargeWarning}</p>
            </div>
          )}
        </div>
      </>
    );
  }

  /* ---------------- step 1: the form ---------------- */
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
            <MethodIcon method={m} size={30} />
            <span>{m.name}</span>
          </button>
        ))}
      </div>

      <form className="cz" onSubmit={review} noValidate>
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

        {/* The charge is not shown here. On this screen the player is still
            deciding how much to take out, and a ৳6,208 figure against a
            balance they have not committed reads as a fee on nothing. It is
            worked out and shown on the summary, once there is a real
            withdrawal for it to apply to. */}

        <div className="cz-next cz-next--inline">
          <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
            {busy ? 'যাচাই হচ্ছে…' : `${t.withdraw} রিকোয়েস্ট`}
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

/** "bkash" → "bKash": the wallet's own name, not the admin's tile label. */
function channelName(channelId: string) {
  return DEPOSIT_CHANNELS.find((c) => c.id === channelId)?.name ?? channelId;
}

function MethodIcon({ method, size }: { method: { icon: string; color: string }; size: number }) {
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
