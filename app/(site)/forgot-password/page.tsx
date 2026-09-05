'use client';

import { useState } from 'react';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';

export default function ForgotPasswordPage() {
  const { toast } = useUI();
  const [phone, setPhone] = useState('');
  const [err, setErr] = useState('');

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^01\d{9}$/.test(phone.trim())) { setErr('সঠিক ১১ ডিজিটের নাম্বার দিন'); return; }
    setErr('');
    toast('SMS গেটওয়ে যুক্ত হলে OTP পাঠানো হবে');
  };

  return (
    <>
      <PageHeader title="পাসওয়ার্ড রিসেট" />
      <div className="hero">
        <h1>পাসওয়ার্ড ভুলে গেছেন?</h1>
        <p>রেজিস্টার করা মোবাইল নাম্বারে OTP পাঠানো হবে</p>
      </div>
      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="মোবাইল নাম্বার" error={err}>
          <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                 value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn--gold btn--block">OTP পাঠান</button>
      </form>
    </>
  );
}
