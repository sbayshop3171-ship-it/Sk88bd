'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';

const MIN_PASSWORD = 6;

/** Password change for a signed-in player, plus the other account-safety
    screens. Supabase Auth does the actual change; the session it hands back
    stays valid, so the player is not logged out afterwards. */
export default function SecurityPage() {
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
    if (pass.length < MIN_PASSWORD) next.pass = `পাসওয়ার্ড কমপক্ষে ${MIN_PASSWORD} অক্ষরের হতে হবে`;
    if (confirm !== pass) next.confirm = 'পাসওয়ার্ড মিলছে না';
    setErr(next);
    if (Object.keys(next).length) return;
    if (!supabase || !session) { setErr({ form: 'আগে লগইন করুন' }); return; }

    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pass });
    setBusy(false);

    if (error) {
      setErr({ form: /same|different/i.test(error.message)
        ? 'নতুন পাসওয়ার্ড আগেরটার থেকে আলাদা হতে হবে'
        : 'পাসওয়ার্ড বদলানো গেল না — আবার চেষ্টা করুন' });
      return;
    }
    setPass('');
    setConfirm('');
    setOpen(false);
    toast('পাসওয়ার্ড বদলানো হয়েছে');
  };

  return (
    <>
      <PageHeader title="সিকিউরিটি সেন্টার" />

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
            পাসওয়ার্ড পরিবর্তন
            <span className="arrow" aria-hidden>{open ? '⌄' : '›'}</span>
          </button>
        ) : (
          <Link href="/forgot-password">
            <span className="e" aria-hidden>🔑</span>
            পাসওয়ার্ড ভুলে গেছেন?
            <span className="arrow" aria-hidden>›</span>
          </Link>
        )}
        <Link href="/my-profile">
          <span className="e" aria-hidden>📱</span>
          মোবাইল নাম্বার
          <span className="arrow" aria-hidden>›</span>
        </Link>
        <Link href="/withdraw">
          <span className="e" aria-hidden>🏦</span>
          উইথড্র অ্যাকাউন্ট
          <span className="arrow" aria-hidden>›</span>
        </Link>
      </div>

      {signedIn && open && (
        <form style={{ margin: 12 }} onSubmit={submit} noValidate>
          <Field label="নতুন পাসওয়ার্ড" error={err.pass}>
            <input type="password" value={pass} onChange={(e) => setPass(e.target.value)}
                   placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <Field label="নতুন পাসওয়ার্ড আবার" error={err.confirm || err.form}>
            <input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)}
                   placeholder="••••••••" autoComplete="new-password" />
          </Field>
          <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
            {busy ? 'বদলানো হচ্ছে…' : 'পাসওয়ার্ড বদলান'}
          </button>
        </form>
      )}

      <div className="note" style={{ margin: 12 }}>
        অ্যাকাউন্টের নিরাপত্তার জন্য পাসওয়ার্ড কারো সাথে শেয়ার করবেন না। সাপোর্ট
        কখনো আপনার পাসওয়ার্ড চাইবে না।
      </div>
    </>
  );
}
