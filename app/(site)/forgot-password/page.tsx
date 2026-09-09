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
    if (!/^01\d{9}$/.test(phone.trim())) { setErr('Enter a valid 11-digit number'); return; }
    setErr('');
    toast('An OTP will be sent once an SMS gateway is connected');
  };

  return (
    <>
      <PageHeader title="Reset Password" />
      <div className="hero">
        <h1>Forgot your password?</h1>
        <p>An OTP is sent to your registered mobile number</p>
      </div>
      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="Mobile number" error={err}>
          <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                 value={phone} onChange={(e) => setPhone(e.target.value)} />
        </Field>
        <button type="submit" className="btn btn--gold btn--block">Send OTP</button>
      </form>
    </>
  );
}
