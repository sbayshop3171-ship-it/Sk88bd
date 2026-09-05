'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

const REASON_TEXT: Record<string, string> = {
  'invalid-credentials': 'পুরনো পাসওয়ার্ড সঠিক নয়।',
  'password-too-short': 'নতুন পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে।',
  'password-mismatch': 'নতুন পাসওয়ার্ড এবং confirm password মিলছে না।',
  unauthorized: 'Session শেষ হয়েছে। আবার লগইন করুন।',
};

export default function AdminPasswordPanel() {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');
    setMessage('');

    if (newPassword !== confirmPassword) {
      setBusy(false);
      setError(REASON_TEXT['password-mismatch']);
      return;
    }

    try {
      const res = await fetch('/api/admin/auth/change-password', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ oldPassword, newPassword, confirmPassword }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };

      if (!res.ok || !data.ok) {
        setError(REASON_TEXT[data.reason ?? ''] ?? 'পাসওয়ার্ড পরিবর্তন করা যায়নি।');
        return;
      }

      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setMessage('পাসওয়ার্ড আপডেট হয়েছে। নতুন পাসওয়ার্ড দিয়ে পরেরবার লগইন করবেন।');
    } catch {
      setError('নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="adm-security" onSubmit={submit}>
      <h2 className="adm__h2">অ্যাডমিন পাসওয়ার্ড</h2>
      <p className="adm__sub">
        পুরনো পাসওয়ার্ড verify করে নতুন পাসওয়ার্ড save হবে। Save হলে আগের
        session token invalid হয়ে যাবে।
      </p>

      <div className="adm-security__grid">
        <label className="adm-signal__field">
          <span>পুরনো পাসওয়ার্ড</span>
          <input
            type="password"
            autoComplete="current-password"
            value={oldPassword}
            onChange={(event) => setOldPassword(event.target.value)}
            required
          />
        </label>

        <label className="adm-signal__field">
          <span>নতুন পাসওয়ার্ড</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
          />
        </label>

        <label className="adm-signal__field">
          <span>Confirm password</span>
          <input
            type="password"
            autoComplete="new-password"
            minLength={6}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
          />
        </label>
      </div>

      {error && <div className="adm-auth__error">{error}</div>}
      {message && <div className="adm-auth__success">{message}</div>}

      <button className="btn btn--gold" type="submit" disabled={busy}>
        {busy ? 'সেভ হচ্ছে...' : 'পাসওয়ার্ড সেভ'}
      </button>
    </form>
  );
}
