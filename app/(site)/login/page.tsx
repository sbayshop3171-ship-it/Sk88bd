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
    if (!isValidPhone(phone)) next.phone = 'সঠিক ১১ ডিজিটের নাম্বার দিন (01XXXXXXXXX)';
    if (pass.length < 6) next.pass = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const message = await signIn(phone, pass);
    setBusy(false);

    if (message) { setErr({ form: message }); return; }
    toast('লগইন সফল');
    router.push('/member');
  };

  return (
    <>
      <PageHeader title={t.login} />

      <div className="hero">
        <h1>স্বাগতম</h1>
        <p>{BRAND.name} অ্যাকাউন্টে লগইন করুন</p>
      </div>

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="মোবাইল নাম্বার" error={err.phone}>
          <input
            type="tel" inputMode="numeric" autoComplete="tel" placeholder="01XXXXXXXXX"
            value={phone} onChange={(e) => setPhone(e.target.value.trim())} disabled={busy}
          />
        </Field>
        <Field label="পাসওয়ার্ড" error={err.pass}>
          <input
            type="password" autoComplete="current-password" placeholder="••••••••"
            value={pass} onChange={(e) => setPass(e.target.value)} disabled={busy}
          />
        </Field>

        <div style={{ textAlign: 'right', marginBottom: 14 }}>
          <Link href="/forgot-password" style={{ fontSize: 12, color: 'var(--mint)' }}>
            পাসওয়ার্ড ভুলে গেছেন?
          </Link>
        </div>

        {err.form && <div className="field__err" style={{ marginBottom: 10 }}>{err.form}</div>}

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'অপেক্ষা করুন…' : t.login}
        </button>

        <div className="form-alt">
          অ্যাকাউন্ট নেই? <Link href="/register"><b>{t.register} করুন</b></Link>
        </div>

        {!backendReady && (
          <div className="note">ডেটাবেস যুক্ত হয়নি — লগইন কাজ করবে না।</div>
        )}
      </form>
    </>
  );
}
