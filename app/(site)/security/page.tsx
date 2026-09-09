'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';
import { useLightSheet } from '@/components/useLightSheet';

const MIN_PASSWORD = 6;

/** Password change for a signed-in player, plus the other account-safety
    screens. Supabase Auth does the actual change; the session it hands back
    stays valid, so the player is not logged out afterwards. */
export default function SecurityPage() {
  useLightSheet();
  const { toast } = useUI();
  const { ready, session, supabase, profile, signOut } = useAuth();

  /* Whether a payout account exists is a row in the database, not something
     the profile carries — and the table arrives with migration 005, so a
     deployment without it answers "not linked" rather than erroring. */
  const [hasWallet, setHasWallet] = useState(false);
  useEffect(() => {
    if (!supabase || !session) return;
    let live = true;
    void supabase.from('payout_accounts').select('id').limit(1)
      .then(({ data }) => { if (live) setHasWallet((data?.length ?? 0) > 0); });
    return () => { live = false; };
  }, [supabase, session]);
  const [open, setOpen] = useState(false);
  const [pass, setPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});

  const signedIn = ready && Boolean(session);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (pass.length < MIN_PASSWORD) next.pass = `The password must be at least ${MIN_PASSWORD} characters`;
    if (confirm !== pass) next.confirm = 'The passwords do not match';
    setErr(next);
    if (Object.keys(next).length) return;
    if (!supabase || !session) { setErr({ form: 'Log in first' }); return; }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);

    if (error) {
      setErr({ form: /same|different/i.test(error.message)
        ? 'The new password must be different from the old one'
        : 'Could not change the password — try again' });
      return;
    }
    setPass('');
    setConfirm('');
    setOpen(false);
    toast('Password changed');
  };

  /* What the score is made of. Each one is a thing a player can actually
     do on this site, so the ring never asks for something that is not
     there to give — and it is read from the account, not stored, so it
     cannot drift out of date. */
  const checks: [string, string, boolean, string][] = [
    ['Personal information', 'Complete personal information.', Boolean(profile?.display_name), '/my-profile'],
    ['Link E-wallet', 'Link E-wallet for withdrawal.', hasWallet, '/withdraw'],
    ['Change login password', 'Recommended letter and number combination', signedIn, '#pass'],
    ['Transaction Password', 'Set a fund password to improve the security of fund operations', signedIn, '#pass'],
  ];
  const done = checks.filter(([, , ok]) => ok).length;
  const score = Math.round((done / checks.length) * 100);
  const level = score >= 75 ? 'High' : score >= 50 ? 'Medium' : 'Low';

  return (
    <>
      <PageHeader title="Security Center" />

      {!signedIn && ready && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="sc__score">
        <span
          className="sc__ring"
          style={{ background: `conic-gradient(#7b5cf0 ${score * 3.6}deg, rgba(31,36,48,.1) 0)` }}
        >
          <i>{score}<small>%</small></i>
        </span>
        <b>Security Level: {level}</b>
        <span className="sc__bolts" aria-hidden>
          {[0, 1, 2, 3, 4].map((i) => (
            <em key={i} className={i < Math.round(score / 20) ? 'on' : ''}>⚡</em>
          ))}
        </span>
      </div>

      {level !== 'High' && (
        <p className="sc__warn">
          Your account security level is {level}, please improve your safety information
        </p>
      )}


      <div className="sc__rows">
        {checks.map(([title, sub, ok, href]) => (
          <Link key={title} href={href} className="sc__row">
            <span className="sc__ico" aria-hidden>{ok ? '✓' : '!'}</span>
            <span className="sc__text">
              <b>{title} <i className={ok ? 'is-ok' : 'is-todo'}>{ok ? '✓' : '!'}</i></b>
              <small>{sub}</small>
            </span>
            <span className="sc__chev" aria-hidden>›</span>
          </Link>
        ))}
        {signedIn && (
          <button type="button" className="sc__row" onClick={() => void signOut()}>
            <span className="sc__ico" aria-hidden>⏻</span>
            <span className="sc__text"><b>Logout</b><small>Logout safely</small></span>
          </button>
        )}
      </div>

      <div className="list-card" id="pass">
        {signedIn ? (
          <button type="button" onClick={() => setOpen((v) => !v)}>
            <span className="e" aria-hidden>🔑</span>
            Change password
            <span className="arrow" aria-hidden>{open ? '⌄' : '›'}</span>
          </button>
        ) : (
          <Link href="/forgot-password">
            <span className="e" aria-hidden>🔑</span>
            Forgot your password?
            <span className="arrow" aria-hidden>›</span>
          </Link>
        )}
      </div>

      {signedIn && open && (
        <form style={{ margin: 12 }} onSubmit={submit} noValidate>
          <Field label="New password" error={err.pass}>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                   placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="Repeat new password" error={err.confirm || err.form}>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                   placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
            {busy ? 'Changing…' : 'Change password'}
          </button>
        </form>
      )}

      <div className="note" style={{ margin: 12 }}>
        For your account’s safety never share your password with anyone. Support will
        never ask you for it.
      </div>
    </>
  );
}
