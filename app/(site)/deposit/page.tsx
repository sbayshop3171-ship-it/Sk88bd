'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import CashierHeader from '@/components/CashierHeader';
import { useCashierConfig } from '@/components/useCashierConfig';
import { useUI } from '@/components/UIProvider';
import { toPaisa } from '@/lib/auth';
import { money } from '@/lib/brand';
import {
  HOWTO_TILES,
  PAY_TYPE_KINDS,
  PAY_TYPE_LABEL,
  fillTokens,
  bonusBadge,
  isImageIcon,
  type DepositMethod,
} from '@/lib/cashier-config';
import { KIND_LABEL, type PublicDepositAccount } from '@/lib/payment-accounts';
import { PROMOTIONS } from '@/lib/promotions';
import { t } from '@/lib/strings';

type Step = 'pick' | 'pay' | 'done';

/** Three screens, like the cashiers players already know: pick a method and
    an amount → pay into the number shown and type the TrxID → done. Every
    label, method and amount comes from the admin's cashier design. */
export default function DepositPage() {
  /* Deposit wears the same white sheet as withdraw — see the `cz-light`
     block in globals.css. The class is held only while the page is mounted,
     so the rest of the lobby stays dark. */
  useEffect(() => {
    document.body.classList.add('cz-light');
    return () => document.body.classList.remove('cz-light');
  }, []);

  const router = useRouter();
  const { toast } = useUI();
  const { ready, backendReady, session, supabase, refresh } = useAuth();
  const { config, ready: configReady } = useCashierConfig();
  const cfg = config.deposit;

  const methods = useMemo(() => cfg.methods.filter((m) => m.active), [cfg.methods]);
  const [methodId, setMethodId] = useState('');
  const method: DepositMethod | undefined = methods.find((m) => m.id === methodId) ?? methods[0];

  const [step, setStep] = useState<Step>('pick');
  const [amount, setAmount] = useState('');
  const [trx, setTrx] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [promoOpen, setPromoOpen] = useState(false);
  const [howOpen, setHowOpen] = useState(true);
  const [account, setAccount] = useState<PublicDepositAccount | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);

  const n = Number(amount);
  const amountOk = Boolean(method) && Number.isFinite(n) && n >= (method?.min ?? 0) && n <= (method?.max ?? 0);
  const trxPattern = useMemo(() => {
    try { return cfg.trxPattern ? new RegExp(cfg.trxPattern) : null; } catch { return null; }
  }, [cfg.trxPattern]);
  const trxClean = trx.trim();
  const trxOk = trxClean.length > 0 && (!trxPattern || trxPattern.test(trxClean));

  // One operator number per visit to the pay screen; a re-entry asks again
  // so players spread across the numbers the admin added.
  useEffect(() => {
    if (step !== 'pay' || !method) return;
    let live = true;
    setLoadingAccount(true);
    setAccount(null);
    const kinds = PAY_TYPE_KINDS[method.payType].join(',');
    fetch(`/api/deposit/account?channel=${encodeURIComponent(method.channelId)}&kinds=${kinds}`, { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok: true; account: PublicDepositAccount } | null) => {
        if (live) setAccount(data?.ok ? data.account : null);
      })
      .catch(() => { if (live) setAccount(null); })
      .finally(() => { if (live) setLoadingAccount(false); });
    return () => { live = false; };
  }, [step, method]);

  const pickMethod = (m: DepositMethod) => {
    setMethodId(m.id);
    setErr('');
  };

  const next = () => {
    if (!method) return;
    if (!amountOk) {
      setErr(`Enter between ${money(method.min)} and ${money(method.max)} for ${method.name}`);
      return;
    }
    if (ready && !session) {
      toast('Log in first to deposit');
      router.push('/login');
      return;
    }
    setErr('');
    setTrx('');
    setStep('pay');
    window.scrollTo({ top: 0 });
  };

  const copyNumber = async () => {
    if (!account) return;
    try {
      await navigator.clipboard.writeText(account.number);
      toast('Number copied');
    } catch {
      toast('Could not copy — write it down');
    }
  };

  const askConfirm = () => {
    if (!method || !account) return;
    if (method.trxRequired && !trxOk) {
      setErr(trxClean ? 'That TrxID format is not right' : 'Enter the TrxID');
      return;
    }
    setErr('');
    setConfirming(true);
  };

  const submit = async () => {
    if (!method) return;
    setConfirming(false);
    if (!backendReady || !session || !supabase) {
      toast('Deposits run from here once a payment gateway is connected');
      return;
    }

    // The player raises the request; RLS only lets them insert their own row.
    // An admin approves it at /admin/deposits, and only then does the money
    // reach the wallet. The method/bonus columns arrive with migration 005;
    // until it is applied the row is raised without them.
    setBusy(true);
    const row = {
      user_id: session.user.id,
      channel_id: method.channelId,
      amount: toPaisa(n),
      sender_no: null,
      txn_id: trxClean || null,
    };
    const bonus = { method_id: method.id, bonus_amount: toPaisa(Math.round((n * method.bonusPercent) / 100)) };
    let { error } = await supabase.from('deposits').insert({ ...row, ...bonus });
    if (error && /column|schema cache/i.test(error.message)) {
      ({ error } = await supabase.from('deposits').insert(row));
    }
    setBusy(false);

    if (error) {
      setErr('Could not send the request — try again');
      return;
    }
    await refresh();
    setStep('done');
    window.scrollTo({ top: 0 });
  };

  const resubmit = () => {
    setTrx('');
    setErr('');
    setStep('pay');
    window.scrollTo({ top: 0 });
  };

  if (!method) {
    return (
      <>
        <CashierHeader title={t.deposit} historyHref="/deposit-history" direction="in" />
        <div className="note" style={{ margin: 12 }}>
          {configReady ? 'No deposit method is active right now. Please contact support.' : 'Loading…'}
        </div>
      </>
    );
  }

  // {min} / {max} in the admin's notice always read the picked method's own
  // limits, so the line stays true when bank or crypto is selected.
  const limits = { min: money(method.min), max: money(method.max) };

  /* ---------------- step 3: done ---------------- */
  if (step === 'done') {
    return (
      <>
        <div className="cz-top">
          <button type="button" className="cz-top__back" aria-label="Back" onClick={() => setStep('pick')}>‹</button>
          <div>
            <b>BDT {n.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</b>
            <small>{cfg.stepHeaderNote}</small>
          </div>
        </div>
        <div className="cz-done">
          <span className="cz-done__tick" aria-hidden>✓</span>
          <h2>{cfg.successTitle}</h2>
          <p>{cfg.successText}</p>
          <button type="button" className="btn btn--gold" onClick={resubmit}>Resubmit TrxID</button>
          <div className="cz-done__links">
            <Link href="/deposit-history">View history</Link>
            <Link href="/">Back to home</Link>
          </div>
        </div>
      </>
    );
  }

  /* ---------------- step 2: pay ---------------- */
  if (step === 'pay') {
    const payLabel = PAY_TYPE_LABEL[method.payType];
    const steps = cfg.howToSteps.split('\n').map((s) => s.trim()).filter(Boolean);
    return (
      <>
        <div className="cz-top">
          <button type="button" className="cz-top__back" aria-label="Back" onClick={() => { setStep('pick'); setErr(''); }}>‹</button>
          <div>
            <b>BDT {n.toLocaleString('en-IN')}</b>
            <small>{cfg.stepHeaderNote}</small>
          </div>
        </div>

        <div className="cz-pay">
          {cfg.stepWarning && <p className="cz-warn">{cfg.stepWarning}</p>}

          <div className="cz-gate" style={{ background: method.color }}>
            <MethodIcon method={method} size={40} />
            <b>{method.name}</b>
          </div>

          <div className="cz-label">{cfg.walletLabel}<span>*</span></div>
          {cfg.channelNote && <p className="cz-pink">{cfg.channelNote}</p>}
          {loadingAccount ? (
            <div className="paybox paybox--wait">Fetching the number…</div>
          ) : account ? (
            <div className="cz-wallet">
              <div className="cz-wallet__row">
                <b>{account.number}</b>
                <button type="button" className="cz-wallet__copy" onClick={copyNumber} aria-label="Copy">⧉</button>
              </div>
              <div className="cz-wallet__meta">
                <span className="paybox__kind">{KIND_LABEL[account.kind]}</span>
                <span>{account.holder}</span>
              </div>
              {account.note && <p className="paybox__note">{account.note}</p>}
            </div>
          ) : (
            <div className="paybox paybox--empty">
              No {method.name} number is set right now. Please contact support or pick
              another method.
            </div>
          )}

          {howOpen && (
            <div className="cz-how">
              {method.payType !== 'transfer' && (
                <>
                  <div className="cz-how__tiles">
                    {HOWTO_TILES.map((tile) => (
                      <span key={tile.key} className={`cz-how__tile${tile.key === method.payType ? ' on' : ''}`}>
                        <i aria-hidden>{tile.glyph}</i>
                        <small>{tile.label}</small>
                      </span>
                    ))}
                  </div>
                  <div className="cz-how__pick">{payLabel}</div>
                </>
              )}
              {method.payType === 'transfer' && cfg.howToTitle && <div className="cz-how__pick">{cfg.howToTitle}</div>}
              {steps.length > 0 && (
                <p className="cz-how__steps">
                  {steps.map((s, i) => (
                    <span key={i}>
                      {i > 0 && <em> → </em>}
                      {s === 'Pick the menu above' ? <b>{payLabel}</b> : s}
                    </span>
                  ))}
                </p>
              )}
            </div>
          )}

          <div className="cz-label">
            {cfg.trxLabel}
            {method.trxRequired && <span>(required)</span>}
          </div>
          {cfg.trxHelpText && (
            cfg.trxHelpUrl
              ? <a className="cz-help" href={cfg.trxHelpUrl} target="_blank" rel="noopener noreferrer">{cfg.trxHelpText}</a>
              : <button type="button" className="cz-help" onClick={() => setHowOpen((v) => !v)}>{cfg.trxHelpText}</button>
          )}
          <input
            className={`cz-trx${trxClean ? (trxOk ? ' ok' : ' bad') : ''}`}
            placeholder={cfg.trxPlaceholder}
            value={trx}
            onChange={(e) => { setTrx(e.target.value); setErr(''); }}
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
          />
          {trxClean && (
            <p className={`cz-trx__state${trxOk ? ' ok' : ' bad'}`}>
              {trxOk ? '✓ TrxID format looks right' : 'That TrxID format is not right'}
            </p>
          )}
          {err && <p className="cz-err">{err}</p>}

          <button
            type="button"
            className="btn btn--gold cz-confirm"
            disabled={busy || loadingAccount || !account || (method.trxRequired && !trxOk)}
            onClick={askConfirm}
          >
            {busy ? 'Sending…' : 'Confirm'}
          </button>

          {(cfg.cautionTitle || cfg.cautionText) && (
            <div className="cz-caution">
              {cfg.cautionTitle && <b>{cfg.cautionTitle}</b>}
              {cfg.cautionText && <p>{cfg.cautionText}</p>}
            </div>
          )}
        </div>

        {confirming && (
          <>
            <div className="scrim on" onClick={() => setConfirming(false)} />
            <div className="modal cz-modal" role="dialog" aria-modal="true">
              <h3>{cfg.confirmTitle}</h3>
              <p>
                {cfg.confirmText}
                {trxClean && <> <b className="cz-modal__trx">{trxClean}</b></>}
              </p>
              <div className="cz-modal__acts">
                <button type="button" className="btn btn--ghost" onClick={() => setConfirming(false)}>Cancel</button>
                <button type="button" className="btn btn--gold" onClick={submit}>Confirm</button>
              </div>
            </div>
          </>
        )}
      </>
    );
  }

  /* ---------------- step 1: pick ---------------- */
  return (
    <>
      <CashierHeader title={t.deposit} historyHref="/deposit-history" direction="in" />

      <div className="cz">
        {cfg.noticeTitle && (
          <div className="cz-notice">
            <span className="cz-notice__ico" aria-hidden>⚠</span>
            <div className="cz-notice__body">
              <b>{fillTokens(cfg.noticeTitle, limits)}</b>
              {cfg.noticeText && <p>{fillTokens(cfg.noticeText, limits)}</p>}
            </div>
          </div>
        )}

        <section className="cz-sec">
          <h2 className="cz-sec__h"><i className="cz-dot cz-dot--gold" />{cfg.methodTitle}</h2>
          <div className="cz-methods">
            {methods.map((m) => (
              <button
                key={m.id}
                type="button"
                className={`cz-method${m.id === method.id ? ' on' : ''}`}
                onClick={() => pickMethod(m)}
                aria-pressed={m.id === method.id}
              >
                <MethodIcon method={m} size={38} />
                <span className="cz-method__name">{m.name}</span>
                {bonusBadge(m.bonusPercent) && (
                  <span className="cz-method__bonus">{bonusBadge(m.bonusPercent)}</span>
                )}
              </button>
            ))}
          </div>
          {method.note && <p className="cz-note">{method.note}</p>}
        </section>

        <section className="cz-sec">
          {/* the picked method, spelled out in red above the heading — the
              line the reference prints so the channel below is read as
              belonging to the tile that was just tapped */}
          <p className="cz-chtitle">
            {method.name}
            {method.tag && <><em>|</em><i>{method.tag}</i></>}
          </p>
          <h2 className="cz-sec__h"><i className="cz-dot cz-dot--mint" />{cfg.channelTitle}</h2>
          <div className="cz-channels">
            <div className="cz-channel on">
              <span>
                {method.name}
                {method.tag && <><em>|</em><i>{method.tag}</i></>}
              </span>
            </div>
          </div>
          {cfg.channelNote && <p className="cz-pink">{cfg.channelNote}</p>}
        </section>

        <section className="cz-sec">
          <h2 className="cz-sec__h"><i className="cz-dot cz-dot--gold" />{cfg.amountTitle}</h2>
          <div className="cz-amounts">
            {cfg.amounts.map((a) => (
              <button
                key={a.amount}
                type="button"
                className={`cz-amt${Number(amount) === a.amount ? ' on' : ''}`}
                onClick={() => { setAmount(String(a.amount)); setErr(''); }}
              >
                {a.bonusLabel && <span className="cz-amt__badge">🎁 {a.bonusLabel}</span>}
                <b>{a.amount.toLocaleString('en-IN')}</b>
              </button>
            ))}
          </div>
          <label className="cz-amtin">
            <span>৳</span>
            <input
              type="number" inputMode="numeric" placeholder={String(method.min)}
              value={amount} min={method.min} max={method.max}
              onChange={(e) => { setAmount(e.target.value); setErr(''); }}
            />
          </label>
          <p className="cz-limit">Limit: {money(method.min)} — {money(method.max)}</p>
          {err && <p className="cz-err">{err}</p>}
        </section>

        {cfg.promoTitle && (
          <section className="cz-sec">
            <button type="button" className="cz-sec__h cz-sec__h--btn" onClick={() => setPromoOpen((v) => !v)} aria-expanded={promoOpen}>
              <i className="cz-dot cz-dot--purple" />{cfg.promoTitle}
              <span className={`cz-chev${promoOpen ? ' up' : ''}`} aria-hidden>⌃</span>
            </button>
            {promoOpen && (
              <div className="cz-promos">
                {cfg.promoText && <p>{cfg.promoText}</p>}
                {PROMOTIONS.slice(0, 4).map((p) => (
                  <Link key={p.id} href="/promotions" className="cz-promo">
                    <span aria-hidden>{p.glyph}</span>{p.title}
                  </Link>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <div className="cz-next">
        <button type="button" className="btn btn--gold btn--block" disabled={!amountOk} onClick={next}>
          Next
        </button>
      </div>
    </>
  );
}

function MethodIcon({ method, size }: { method: DepositMethod; size: number }) {
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
