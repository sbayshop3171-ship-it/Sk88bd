'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { toTaka } from '@/lib/auth';
import { BRAND, money } from '@/lib/brand';
import { t } from '@/lib/strings';

const STEPS: [string, string][] = [
  ['1', 'Share your referral link with friends'],
  ['2', 'Your friend registers and makes a deposit'],
  ['3', 'The more they play, the more commission you earn — for life'],
];

type Stats = { total: number; active: number; commission: number };

/** The player's own referral code, as a link that lands on /register with
    the code filled in, plus how many people came through it. */
export default function ReferPage() {
  const { toast } = useUI();
  const { ready, session, profile } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);

  const signedIn = ready && Boolean(session);
  const code = profile?.referral_code ?? '';
  // the domain the player is actually on, so the link works on every mirror;
  // read after mount so server and client render the same first frame
  const [origin, setOrigin] = useState(`https://${BRAND.domain}`);
  useEffect(() => { setOrigin(window.location.origin); }, []);
  const link = code ? `${origin}/register?ref=${code}` : '';

  useEffect(() => {
    if (!session) return;
    let live = true;
    fetch('/api/me/referrals', { cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { ok: true } & Stats | { ok: false }) => { if (live && d.ok) setStats(d); })
      .catch(() => { /* keep zeros */ });
    return () => { live = false; };
  }, [session]);

  const copy = async (text: string, what: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast(`${what} copied`);
    } catch {
      toast('Could not copy — copy it manually');
    }
  };

  return (
    <>
      <PageHeader title="Refer & Commission" />

      <div className="hero">
        <h1>Up to 40% commission</h1>
        <p>Bring a friend, earn commission for life</p>
      </div>

      <div className="stat">
        <div><b>{stats?.total ?? 0}</b><small>Total referrals</small></div>
        <div><b>{stats?.active ?? 0}</b><small>Active referrals</small></div>
        <div><b>{money(toTaka(stats?.commission ?? 0))}</b><small>Total commission</small></div>
      </div>

      {signedIn ? (
        <div className="field" style={{ margin: 12 }}>
          <label>Your referral code</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn btn--ghost" type="button" onClick={() => copy(code, 'Code')}>Copy</button>
          </div>
          <label style={{ marginTop: 12 }}>Your referral link</label>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn--gold btn--block" style={{ marginTop: 10 }} type="button"
                  onClick={() => copy(link, 'Link')}>
            Copy link
          </button>
        </div>
      ) : ready && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="list-card">
        {STEPS.map(([n, text]) => (
          <div key={n} style={{ display: 'flex', gap: 11, padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span className="winners__rank">{n}</span>
            <span>{text}</span>
          </div>
        ))}
      </div>

      <div className="note" style={{ margin: 12 }}>
        {signedIn
          ? 'When a friend registers through your link the code fills itself in.'
          : 'Log in and your own code and link show up here.'}
      </div>
    </>
  );
}
