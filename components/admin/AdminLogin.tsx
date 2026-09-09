'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import type { FormEvent } from 'react';
import type { PanelBase } from '@/lib/panel-base';

const REASON_TEXT: Record<string, string> = {
  'invalid-credentials': 'That username or password is not correct.',
  locked: 'Too many failed attempts — try again in a little while.',
  'not-configured':
    'No admin password is set on this server. Set ADMIN_PASSWORD and restart the app.',
};

/** The same form either way, but an agent arriving at /agent is not the
    operator: they are not told the panel is an admin panel, and the username
    box does not start filled in with the operator's own login name. */
export default function AdminLogin({ base }: { base: PanelBase }) {
  const agentDoor = base === '/agent';
  const router = useRouter();
  const [username, setUsername] = useState(agentDoor ? '' : 'admin');
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
      const data = (await res.json()) as {
        ok?: boolean;
        reason?: string;
        retryInSeconds?: number;
      };

      if (!res.ok || !data.ok) {
        if (data.reason === 'locked' && data.retryInSeconds) {
          const minutes = Math.ceil(data.retryInSeconds / 60);
          setError(`Too many failed attempts — try again in ${minutes} minutes.`);
          return;
        }
        setError(REASON_TEXT[data.reason ?? ''] ?? 'Could not log in.');
        return;
      }

      router.refresh();
    } catch {
      setError('Network problem. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="adm-auth">
      <form className="adm-auth__card" onSubmit={submit}>
        <h1>{agentDoor ? 'Agent Login' : 'Admin Login'}</h1>
        <p>
          {agentDoor
            ? 'Enter your agent ID and password.'
            : 'Enter your credentials to open the admin panel.'}
        </p>

        <label className="adm-auth__field">
          <span>{agentDoor ? 'Agent ID' : 'Username'}</span>
          <input
            autoComplete="username"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>

        <label className="adm-auth__field">
          <span>{agentDoor ? 'Password' : 'Password'}</span>
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
          {busy ? 'Logging in…' : 'Log In'}
        </button>
      </form>
    </main>
  );
}
