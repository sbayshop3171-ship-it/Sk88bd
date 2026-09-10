'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';
import { toTaka } from '@/lib/auth';
import { money } from '@/lib/brand';
import { useLightSheet } from '@/components/useLightSheet';

/* ============================================================
   Security Center — CK44's screen, rebuilt on our data.

   The reference (ck444app.org, member centre page `securityCenter`)
   is three stacked cards: who you are and what the wallet is doing,
   a score with the level it earns, and the list of the things that
   move the score. The markup below keeps the reference's own class
   names — `information-wrap`, `account-bind-item`, `iconinfo` — so
   the CSS port at the end of globals.css reads against it line for
   line, and the copy is the reference's own English, key for key.

   Four of the rows are scored, the fifth (logout) is not — that is
   the reference's arithmetic too: score = done / 4, and the level
   comes off it at the same thresholds the reference uses (>80 High,
   >60 Medium, else Low; 100 is "the optimal setting").
   ============================================================ */

/** The reference scores four things. Order is the reference's order. */
type Key = 'profile' | 'loginPassword' | 'eWallet' | 'paymentPassword';

const MIN_PASSWORD = 6;

export default function SecurityPage() {
  useLightSheet();
  const { toast } = useUI();
  const { ready, session, supabase, profile, wallet, signOut, refresh } = useAuth();

  const signedIn = ready && Boolean(session);

  /* ---------- what the account has ---------- */

  /* Whether a payout account exists is a row in the database, not something
     the profile carries — and the table arrives with migration 005, so a
     deployment without it answers "not linked" rather than erroring. The
     transaction password is the same story with migration 010. */
  const [hasWallet, setHasWallet] = useState(false);
  const [hasTxnPassword, setHasTxnPassword] = useState(false);
  const [pending, setPending] = useState<[number, number]>([0, 0]);

  useEffect(() => {
    if (!supabase || !session) return;
    let live = true;

    void supabase.from('payout_accounts').select('id').limit(1)
      .then(({ data }) => { if (live) setHasWallet((data?.length ?? 0) > 0); });

    void supabase.rpc('has_transaction_password')
      .then(({ data }) => { if (live) setHasTxnPassword(data === true); });

    void Promise.all([
      supabase.from('deposits').select('id', { count: 'exact', head: true }).eq('state', 'pending'),
      supabase.from('withdrawals').select('id', { count: 'exact', head: true }).eq('state', 'pending'),
    ]).then(([d, w]) => {
      if (live) setPending([d.count ?? 0, w.count ?? 0]);
    });

    return () => { live = false; };
  }, [supabase, session]);

  /* ---------- the profile card ---------- */

  const [hidden, setHidden] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const balance = toTaka(wallet?.balance ?? 0);

  const reload = useCallback(async () => {
    setSpinning(true);
    await refresh();
    setSpinning(false);
  }, [refresh]);

  const copyUser = async () => {
    const id = profile?.phone;
    if (!id) return;
    try {
      await navigator.clipboard.writeText(id);
      toast('Copied');
    } catch {
      toast('Copied');
    }
  };

  const nickname = profile?.display_name || profile?.phone || '—';
  const initial = (profile?.display_name || profile?.phone || '-').trim().charAt(0).toUpperCase();
  const joined = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-CA')
    : '—';
  /* the reference stamps today's date under each pending count */
  const [today, setToday] = useState('');
  useEffect(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    setToday(`${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`);
  }, []);

  /* ---------- the score ---------- */

  const done: Record<Key, boolean> = {
    profile: Boolean(profile?.display_name),
    /* a login password always exists — the reference counts having one, not
       having changed it, which is why this row is green from the first day */
    loginPassword: signedIn,
    eWallet: hasWallet,
    paymentPassword: hasTxnPassword,
  };

  const items: { key: Key; icon: string; label: string; detail: string }[] = [
    {
      key: 'profile',
      icon: 'icon-info',
      label: 'Personal Information',
      detail: 'Complete the personal information to improve your account security.',
    },
    {
      key: 'loginPassword',
      icon: 'icon-pwd',
      label: 'Login password',
      detail: 'Recommended password with combination of letters and numbers, mixed with uppercase and lowercase.',
    },
    {
      key: 'eWallet',
      icon: 'icon-eWallet',
      label: 'Link E-wallet',
      detail: 'Link E-wallet for withdrawal.',
    },
    {
      key: 'paymentPassword',
      icon: 'icon-moneypwd',
      label: 'Transaction Password',
      detail: 'Transaction password will use to verify your identity for any fund related operation for account safety purposes.',
    },
  ];

  const score = Math.floor(
    (items.filter((i) => done[i.key]).length / items.length) * 100,
  );
  const grade = score > 80 ? 'high' : score > 60 ? 'mid' : 'low';
  const level = grade === 'high' ? 'High' : grade === 'mid' ? 'Medium' : 'Low';
  const optimal = score >= 100;
  const todo = items.filter((i) => !done[i.key]);

  /* ---------- the two forms the rows open ---------- */

  const [panel, setPanel] = useState<null | 'loginPassword' | 'paymentPassword'>(null);
  const close = () => { setPanel(null); setErr({}); setOld(''); setPass(''); setConfirm(''); };

  const [old, setOld] = useState('');
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [shown, setShown] = useState<Record<string, boolean>>({});

  const eye = (name: string) => (
    <button
      type="button"
      className={`mcac-icon ${shown[name] ? 'icon-eyes' : 'icon-eyes-close'}`}
      aria-label={shown[name] ? 'Hide' : 'Show'}
      onClick={() => setShown((s) => ({ ...s, [name]: !s[name] }))}
    />
  );

  /* Supabase Auth does the login-password change; the session it hands back
     stays valid, so the player is not logged out afterwards. */
  const changeLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!old) next.old = 'Please fill in current password';
    if (pass.length < MIN_PASSWORD) next.pass = `The password must be at least ${MIN_PASSWORD} characters`;
    if (confirm !== pass) next.confirm = 'The passwords do not match';
    setErr(next);
    if (Object.keys(next).length) return;
    if (!supabase || !session) { setErr({ form: 'Log in first' }); return; }

    setBusy(true);
    /* the old password is checked rather than trusted — a session left open
       on a shared phone should not be able to lock the owner out */
    const check = await supabase.auth.signInWithPassword({
      email: session.user.email ?? '', password: old,
    });
    if (check.error) {
      setBusy(false);
      setErr({ old: 'Current password is wrong' });
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);

    if (error) {
      setErr({ form: /same|different/i.test(error.message)
        ? 'The new password must be different from the old one'
        : 'Could not change the password — try again' });
      return;
    }
    close();
    toast('Success');
  };

  const changeTxn = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (hasTxnPassword && !old) next.old = 'Please fill in current password';
    if (pass.length < MIN_PASSWORD) next.pass = `The password must be at least ${MIN_PASSWORD} characters`;
    if (confirm !== pass) next.confirm = 'The passwords do not match';
    setErr(next);
    if (Object.keys(next).length) return;
    if (!supabase || !session) { setErr({ form: 'Log in first' }); return; }

    setBusy(true);
    const { error } = await supabase.rpc('set_transaction_password', {
      p_new: pass, p_old: hasTxnPassword ? old : null,
    });
    setBusy(false);

    if (error) {
      setErr(/wrong/i.test(error.message)
        ? { old: 'Current password is wrong' }
        : { form: 'Could not set the transaction password — try again' });
      return;
    }
    setHasTxnPassword(true);
    close();
    toast('Success');
  };

  /* ---------- what a row does when it is tapped ---------- */

  const rowHref: Partial<Record<Key, string>> = {
    profile: '/my-profile',
    eWallet: '/withdraw',
  };

  return (
    <>
      <PageHeader title="Security Center" />

      {!signedIn && ready && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div id="mc_container" className="security-center clear-float">
        <div className="outer-casing overflow">

          {/* ---------- who you are, and what the wallet is doing ---------- */}
          <div className="information-wrap personal-information js_personal">
            <div className="information-top">
              <div className="vipicon" aria-hidden />
              <div className="upper-right">
                <div className="info-img">
                  <div className="first-name active">{initial}</div>
                </div>
                <div className="info-left">
                  <div className="info-level-wrap">
                    <Link href="/vip" className="vip-label">
                      <span className="vipicon" aria-hidden />
                      <span className="level-name">VIP {profile?.vip_level ?? 0}</span>
                    </Link>
                  </div>
                  <div className="nickname-wrap">
                    <label className="ellipsis information-nickname">{nickname}</label>
                    <Link href="/my-profile" className="edit-icon" aria-label="Edit" />
                  </div>
                  <div className="regdate-wrap">
                    <span className="regdate-icon" aria-hidden />
                    <span className="join-title">Joined</span>
                    <label className="ellipsis information-regDate">{joined}</label>
                  </div>
                </div>
              </div>
            </div>

            <div className="copy-wrap">
              <div className="copy-btn">
                <label className="username-copy">{signedIn ? profile?.phone ?? '—' : 'Guest'}</label>
                <button type="button" className="copy-icon" aria-label="Copy" onClick={() => void copyUser()} />
              </div>
            </div>

            <div className="information-money">
              <div className="amount-wrap">
                <div className="money-view js_sumBalance">
                  {hidden ? '******' : money(balance, 2)}
                </div>
                <button
                  type="button"
                  className={`refresh${spinning ? ' processing' : ''}`}
                  aria-label="Refresh"
                  onClick={() => void reload()}
                />
                <button
                  type="button"
                  className={`eyes-icon${hidden ? ' icon-eyes-close' : ''}`}
                  aria-label={hidden ? 'Show balance' : 'Hide balance'}
                  onClick={() => setHidden((v) => !v)}
                />
              </div>
            </div>

            <div className="money-plan" id="money-plan">
              <div className="plan-item">
                <div className="plan-wrap ellipsis">
                  <label id="pendingDepositCount">{pending[0]}</label>
                  <label>deposit request processing.</label>
                  <div className="now js_now">{today}</div>
                </div>
              </div>
              <div className="plan-item">
                <div className="plan-wrap ellipsis">
                  <label id="pendingWithdrawCount">{pending[1]}</label>
                  <label>withdrawal request processing.</label>
                  <div className="now js_now">{today}</div>
                </div>
              </div>
            </div>
          </div>

          {/* ---------- the score, and the level it earns ---------- */}
          <div className={`information-wrap security-information grade-${grade}${optimal ? ' grade-optimal' : ''} js_score`}>
            <div className="grade-view">
              <div className="grade-text js_scorelevel">{level}</div>
              <div className="small-view">Security Level</div>
            </div>
            <div className="more-gradeInfo">
              <div className="js_scoreNum">The score is <strong>{score}</strong> points</div>
              <div>
                <label>Your account security level is</label>
                <span className="js_scorelevel">{level}</span>
              </div>
            </div>
            <div className="setting-text">Recommended setting</div>
            <div className="setting-options clear-float js_suggest">
              {todo.map((i) => (
                <button
                  key={i.key}
                  type="button"
                  className="setting-item"
                  onClick={() => {
                    const href = rowHref[i.key];
                    if (href) window.location.assign(href);
                    else setPanel(i.key as 'loginPassword' | 'paymentPassword');
                  }}
                >
                  <div className={`iconinfo ${i.icon} active`} aria-hidden />
                  <div className="item-text">{i.label}</div>
                </button>
              ))}
            </div>
            <div className="setting-optimal">
              <i className="mcac-icon icon-optimal" aria-hidden />
              &nbsp;<span>Currently the optimal setting</span>
            </div>
          </div>

          {/* ---------- the things that move it ---------- */}
          <div className="information-wrap account-information js_platformList">
            {items.map((i) => {
              const inner = (
                <>
                  <div className={`iconinfo ${i.icon} active`} aria-hidden />
                  <div className="item-text">
                    <div className="item-text-info">
                      <label>{i.label}</label>
                      <div className={done[i.key] ? 'icons-checked-green' : 'icons-danger'} aria-hidden />
                    </div>
                  </div>
                  <div className="item-detail">{i.detail}</div>
                </>
              );
              const href = rowHref[i.key];
              return href ? (
                <Link key={i.key} href={href} className="account-bind-item">{inner}</Link>
              ) : (
                <button
                  key={i.key}
                  type="button"
                  className="account-bind-item"
                  onClick={() => setPanel(i.key as 'loginPassword' | 'paymentPassword')}
                >
                  {inner}
                </button>
              );
            })}

            <button type="button" className="account-bind-item js-logout" onClick={() => void signOut()}>
              <div className="iconinfo icon-logout active" aria-hidden />
              <div className="item-text">
                <div className="item-text-info"><label>Logout</label></div>
              </div>
              <div className="item-detail">Logout Safely</div>
            </button>
          </div>
        </div>

        {/* ---------- the sheet a row opens ---------- */}
        {panel && (
          <div className="model-case all-h" id="js_model">
            <button type="button" className="model-mask" aria-label="Close" onClick={close} />
            <form
              className="setting-modal model-content clear-float"
              onSubmit={panel === 'loginPassword' ? changeLogin : changeTxn}
              noValidate
            >
              <button type="button" className="close-info" onClick={close}>Close</button>

              <div className="setting-item">
                <div className="caption-text border-blue">
                  {panel === 'loginPassword' ? 'Change Login Password' : 'Transaction Password'}
                </div>

                {(panel === 'loginPassword' || hasTxnPassword) && (
                  <div className={`form-group${err.old ? ' input-case-error' : ''}`}>
                    <label className="form-label colon">Current Password</label>
                    <div className="input-case fr">
                      <input
                        className="input-control fr"
                        type={shown.old ? 'text' : 'password'}
                        autoComplete="current-password"
                        placeholder="Please fill in current password"
                        value={old}
                        onChange={(e) => { setOld(e.target.value); setErr({}); }}
                      />
                      {eye('old')}
                    </div>
                    {err.old && <p className="error-tips">{err.old}</p>}
                  </div>
                )}

                <div className={`form-group${err.pass ? ' input-case-error' : ''}`}>
                  <label className="form-label colon">New Password</label>
                  <div className="input-case fr">
                    <input
                      className="input-control fr"
                      type={shown.pass ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Please fill in new password"
                      value={pass}
                      onChange={(e) => { setPass(e.target.value); setErr({}); }}
                    />
                    {eye('pass')}
                  </div>
                  {err.pass && <p className="error-tips">{err.pass}</p>}
                </div>

                <div className={`form-group${err.confirm ? ' input-case-error' : ''}`}>
                  <label className="form-label colon">Confirm Password</label>
                  <div className="input-case fr">
                    <input
                      className="input-control fr"
                      type={shown.confirm ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="Please fill in confirm password"
                      value={confirm}
                      onChange={(e) => { setConfirm(e.target.value); setErr({}); }}
                    />
                    {eye('confirm')}
                  </div>
                  {err.confirm && <p className="error-tips">{err.confirm}</p>}
                </div>

                {err.form && <p className="error-tips is-form">{err.form}</p>}

                <div className="setting-item-footer">
                  <button type="submit" className="button btn-submit" disabled={busy}>
                    {busy ? '…' : 'Submit'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </>
  );
}
