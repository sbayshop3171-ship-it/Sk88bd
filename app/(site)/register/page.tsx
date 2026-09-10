'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { AGENT_PARAM, normalizeAgentCode } from '@/lib/agent-links';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { isValidPhone } from '@/lib/auth';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Where the agent code waits if the visitor wanders off before signing up. */
const AGENT_KEY = 'sk88bd.agent';

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useUI();
  const { signUp, backendReady } = useAuth();

  const [f, setF] = useState({ phone: '', pass: '', confirm: '', ref: '' });
  /** the agent whose link brought this visitor here — never typed, so it is
      not a form field */
  const [agent, setAgent] = useState('');

  // A shared referral link lands here as /register?ref=CODE; seed the field
  // so the friend is credited without having to type the code. Read from
  // location in an effect: useSearchParams would force a Suspense boundary
  // on this statically prerendered page for no gain.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref')?.trim();
    if (ref) setF((cur) => (cur.ref ? cur : { ...cur, ref }));

    // An agent's link is /register?agent=CODE. Somebody who arrives, looks
    // around the site and comes back to register is still that agent's
    // signup, so the code outlives the query string.
    const fromUrl = normalizeAgentCode(params.get(AGENT_PARAM));
    if (fromUrl) {
      setAgent(fromUrl);
      try { localStorage.setItem(AGENT_KEY, fromUrl); } catch { /* private mode */ }
      return;
    }
    try {
      const kept = normalizeAgentCode(localStorage.getItem(AGENT_KEY));
      if (kept) setAgent(kept);
    } catch { /* private mode */ }
  }, []);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setF({ ...f, [k]: e.target.value });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (!isValidPhone(f.phone)) next.phone = 'Enter a valid 11-digit number';
    if (f.pass.length < 6) next.pass = 'The password must be at least 6 characters';
    if (f.confirm !== f.pass) next.confirm = 'The passwords do not match';
    setErr(next);
    if (Object.keys(next).length) return;

    setBusy(true);
    const message = await signUp(f.phone.trim(), f.pass, f.ref.trim() || undefined, agent || undefined);
    setBusy(false);

    if (message) { setErr({ form: message }); return; }
    // credited now; a second account from the same phone is not this agent's
    try { localStorage.removeItem(AGENT_KEY); } catch { /* private mode */ }
    toast('Account created');
    router.push('/member');
  };

  return (
    <>
      <PageHeader title={t.register} />

      <div className="hero">
        <h1>৳18 Sign Up Bonus</h1>
        <p>Register and verify your number to get the bonus</p>
      </div>

      <form style={{ margin: 12 }} onSubmit={submit} noValidate>
        <Field label="Mobile number" error={err.phone}>
          <input type="tel" inputMode="numeric" placeholder="01XXXXXXXXX"
                 value={f.phone} onChange={set('phone')} disabled={busy} />
        </Field>
        <Field label="Password" error={err.pass}>
          <input type="password" autoComplete="new-password" placeholder="••••••••"
                 value={f.pass} onChange={set('pass')} disabled={busy} />
        </Field>
        <Field label="Confirm password" error={err.confirm}>
          <input type="password" autoComplete="new-password" placeholder="••••••••"
                 value={f.confirm} onChange={set('confirm')} disabled={busy} />
        </Field>
        <Field label="Referral code (optional)">
          <input type="text" placeholder={`${BRAND.name.toUpperCase()}XX`}
                 autoCapitalize="none" autoCorrect="off" spellCheck={false}
                 value={f.ref} onChange={set('ref')} disabled={busy} />
        </Field>

        {agent && (
          <div className="note" style={{ marginBottom: 10 }}>
            You arrived through agent code <b>{agent}</b> — this account goes on their list.
          </div>
        )}

        {err.form && <div className="field__err" style={{ marginBottom: 10 }}>{err.form}</div>}

        <button type="submit" className="btn btn--gold btn--block" disabled={busy}>
          {busy ? 'Please wait…' : t.registerNow}
        </button>

        <div className="form-alt">
          Already have an account? <Link href="/login"><b>{t.login}</b></Link>
        </div>

        <div className="note">
          By registering you confirm that you are over 18 years of age.
          {!backendReady && ' The database is not connected — registration will not work.'}
        </div>
      </form>
    </>
  );
}
