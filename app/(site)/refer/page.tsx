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
  ['১', 'আপনার রেফারেল লিংক বন্ধুদের শেয়ার করুন'],
  ['২', 'বন্ধু রেজিস্টার করে ডিপোজিট করুক'],
  ['৩', 'সে যত খেলবে, আপনি তত কমিশন পাবেন — আজীবন'],
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
      toast(`${what} কপি হয়েছে`);
    } catch {
      toast('কপি করা যায়নি — ম্যানুয়ালি কপি করুন');
    }
  };

  return (
    <>
      <PageHeader title="রেফার ও কমিশন" />

      <div className="hero">
        <h1>৪০% পর্যন্ত কমিশন</h1>
        <p>বন্ধু আনুন, আজীবন কমিশন নিন</p>
      </div>

      <div className="stat">
        <div><b>{stats?.total ?? 0}</b><small>মোট রেফার</small></div>
        <div><b>{stats?.active ?? 0}</b><small>সক্রিয় রেফার</small></div>
        <div><b>{money(toTaka(stats?.commission ?? 0))}</b><small>মোট কমিশন</small></div>
      </div>

      {signedIn ? (
        <div className="field" style={{ margin: 12 }}>
          <label>আপনার রেফারেল কোড</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <input readOnly value={code} onFocus={(e) => e.currentTarget.select()} />
            <button className="btn btn--ghost" type="button" onClick={() => copy(code, 'কোড')}>কপি</button>
          </div>
          <label style={{ marginTop: 12 }}>আপনার রেফারেল লিংক</label>
          <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
          <button className="btn btn--gold btn--block" style={{ marginTop: 10 }} type="button"
                  onClick={() => copy(link, 'লিংক')}>
            লিংক কপি করুন
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
          ? 'বন্ধু আপনার লিংক দিয়ে রেজিস্টার করলে কোডটি নিজে থেকেই বসে যাবে।'
          : 'লগইন করলে আপনার নিজস্ব কোড ও লিংক এখানে দেখা যাবে।'}
      </div>
    </>
  );
}
