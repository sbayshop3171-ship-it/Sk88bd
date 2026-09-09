'use client';

import Link from 'next/link';
import { useState } from 'react';
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
  const { ready, session, supabase } = useAuth();
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

  return (
    <>
      <PageHeader title="Security Center" />

      {!signedIn && ready && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="list-card">
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
        <Link href="/my-profile">
          <span className="e" aria-hidden>📱</span>
          Mobile number
          <span className="arrow" aria-hidden>›</span>
        </Link>
        <Link href="/withdraw">
          <span className="e" aria-hidden>🏦</span>
          Withdrawal account
          <span className="arrow" aria-hidden>›</span>
        </Link>
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
