'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';

const REASON_TEXT: Record<string, string> = {
  'invalid-credentials': 'ইউজারনেম অথবা পাসওয়ার্ড সঠিক নয়।',
};

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { ok?: boolean; reason?: string };

      if (!res.ok || !data.ok) {
        setError(REASON_TEXT[data.reason ?? ''] ?? 'লগইন করা যায়নি।');
        return;
      }

      router.refresh();
    } catch {
      setError('নেটওয়ার্ক সমস্যা হয়েছে। আবার চেষ্টা করুন।');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adm-auth">
      <form className="adm-auth__card" onSubmit={submit}>
        <h1>অ্যাডমিন লগইন</h1>
        <p>Admin panel খুলতে আপনার credentials দিন।</p>

        <label className="adm-auth__field">
          <span>ইউজারনেম</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="adm-auth__field">
          <span>পাসওয়ার্ড</span>
          <input
            autoComplete="current-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>

        {error && <div className="adm-auth__error">{error}</div>}

        <button className="btn btn--gold btn--block" type="submit" disabled={busy}>
          {busy ? 'লগইন হচ্ছে...' : 'লগইন'}
        </button>
      </form>
    </main>
  );
}
