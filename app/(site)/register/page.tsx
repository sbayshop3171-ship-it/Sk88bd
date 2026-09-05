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

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { signUp, backendReady } = useAuth();

  const [f, setF] = useState({ phone: '', pass: '', confirm: '', ref: '' });
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidPhone(f.phone)) next.phone = 'সঠিক ১১ ডিজিটের নাম্বার দিন';
    if (f.pass.length < 6) next.pass = 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে';
    if (f.confirm !== f.pass) next.confirm = 'পাসওয়ার্ড মিলছে না';
    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const message = await signUp(f.phone.trim(), f.pass, f.ref.trim() || undefined);
    setBusy(false);

    if (message) { setErr({ form: message }); return; }
    toast('অ্যাকাউন্ট তৈরি হয়েছে');
    router.push('/member');
  };

  return (
    <>
      <PageHeader title={t.register} />

      <div className="hero">
        <h1>৳১৮ সাইন আপ বোনাস</h1>
        <p>রেজিস্টার করে নাম্বার ভেরিফাই করলেই বোনাস পাবেন</p>
      </div>

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="মোবাইল নাম্বার" error={err.phone}>
          <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                 value={f.phone} onChange={set('phone')} disabled={busy} />
        </Field>
        <Field label="পাসওয়ার্ড" error={err.pass}>
          <input type="password" autoComplete="new-password" placeholder="••••••••"
                 value={f.pass} onChange={set('pass')} disabled={busy} />
        </Field>
        <Field label="পাসওয়ার্ড নিশ্চিত করুন" error={err.confirm}>
          <input type="password" autoComplete="new-password" placeholder="••••••••"
                 value={f.confirm} onChange={set('confirm')} disabled={busy} />
        </Field>
        <Field label="রেফারেল কোড (ঐচ্ছিক)">
          <input type="text" placeholder={`${BRAND.name.toUpperCase()}XX`}
                 value={f.ref} onChange={set('ref')} disabled={busy} />
        </Field>

        {err.form && <div className="field__err" style={{ marginBottom: 10 }}>{err.form}</div>}

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'অপেক্ষা করুন…' : t.registerNow}
        </button>

        <div className="form-alt">
          আগে থেকেই অ্যাকাউন্ট আছে? <Link href="/login"><b>{t.login}</b></Link>
        </div>

        <div className="note">
          রেজিস্টার করে আপনি নিশ্চিত করছেন যে আপনার বয়স ১৮ বছরের বেশি।
          {!backendReady && ' ডেটাবেস যুক্ত হয়নি — রেজিস্ট্রেশন কাজ করবে না।'}
        </div>
      </form>
    </>
  );
}
