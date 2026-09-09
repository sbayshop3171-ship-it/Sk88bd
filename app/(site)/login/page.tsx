'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { isValidPhone } from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/strings';

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { signIn, backendReady } = useAuth();

  const [phone, setPhone] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState<{ phone?: string; pass?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: typeof err = {};
    if (!isValidPhone(phone)) next.phone = 'Enter a valid 11-digit number (01XXXXXXXXX)';
    if (pass.length < 6) next.pass = 'The password must be at least 6 characters';
    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const message = await signIn(phone, pass);
    setBusy(false);

    if (message) { setErr({ form: message }); return; }
    toast('Logged in');
    router.push('/member');
  };

  return (
    <>
      <PageHeader title={t.login} />

      <div className="hero">
        <h1>Welcome</h1>
        <p>Log in to your {BRAND.name} account</p>
      </div>

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="Mobile number" error={err.phone}>
          <input
            type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value.trim())} disabled={busy}
          />
        </Field>
        <Field label="Password" error={err.pass}>
          <input
            type="password" autoComplete="current-password" placeholder="••••••••"
            value={pass} onChange={(e) => setPass(e.target.value)} disabled={busy}
          />
        </Field>

        <div style={{ textAlign: 'right', marginBottom: 14 }}>
          <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--mint)' }}>
            Forgot your password?
          </Link>
        </div>

        {err.form && <div className="field__err" style={{ marginBottom: 10 }}>{err.form}</div>}

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'Please wait…' : t.login}
        </button>

        <div className="form-alt">
          No account? <Link href="/register"><b>{t.register}</b></Link>
        </div>

        {!backendReady && (
          <div className="note">The database is not connected — login will not work.</div>
        )}
      </form>
    </>
  );
}
