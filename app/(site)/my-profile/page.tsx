'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';
import { useLightSheet } from '@/components/useLightSheet';

/** The account's own details, and the one thing a player may change here:
    the display name. Everything else (phone, VIP, referral code) is set by
    the system or the admin, so it is shown read-only. */
export default function MyProfilePage() {
  useLightSheet();
  const { toast } = useUI();
  const { ready, session, profile, supabase, refresh } = useAuth();
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setName(profile?.display_name ?? '');
  }, [profile?.display_name]);

  const signedIn = ready && Boolean(session);
  const joined = session?.user.created_at
    ? new Date(session.user.created_at).toLocaleDateString('en-CA')
    : '—';

  const rows: [string, string][] = [
    ['User ID', profile?.phone ?? '—'],
    ['Mobile number', profile?.phone ?? '—'],
    ['Name', profile?.display_name || '—'],
    ['VIP level', `VIP ${profile?.vip_level ?? 0}`],
    ['Referral code', profile?.referral_code ?? '—'],
    ['Registered on', joined],
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) { setErr('The name must be at least 2 characters'); return; }
    if (!supabase || !session) { setErr('Log in first'); return; }

    setBusy(true);
    setErr('');
    // RLS "edit own profile" lets a player update only their own row.
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: clean })
      .eq('id', session.user.id);
    setBusy(false);

    if (error) { setErr('Could not change the name — try again'); return; }
    await refresh();
    toast('Name changed');
  };

  return (
    <>
      <PageHeader title="My Account" />

      <div className="ma">
        <p className="ma__user">Username: <b>{signedIn ? profile?.phone ?? '—' : 'Guest'}</b></p>

        {!signedIn && ready && (
          <div className="wallet-bar" style={{ margin: '0 0 12px' }}>
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        )}

        {/* The one field on this screen a player owns. The reference asks for
            a Facebook, a Google, a WhatsApp, an email and a second phone as
            well; `profiles` has nowhere to put any of them, and a box that
            forgets what it was told is worse than no box, so they are not
            drawn until there is a column behind them. */}
        <label className="ma__field">
          <span aria-hidden>✎</span>
          <input
            value={name}
            onChange={(e) => { setName(e.target.value); setErr(''); }}
            placeholder="Please fill in Nickname"
            maxLength={40}
            disabled={!signedIn}
          />
        </label>
        {err && <p className="ma__err">{err}</p>}

        {/* what the account is, as it stands — set by the system, not here */}
        <div className="ma__facts">
          {rows.slice(1).map(([k, v]) => (
            <div key={k}><span>{k}</span><b>{v}</b></div>
          ))}
        </div>

        <p className="ma__privacy">We care about your privacy</p>
        <p className="ma__note">
          আপনার তথ্য এনক্রিপ্ট করে রাখা হয়। মোবাইল নাম্বার বদলাতে সাপোর্টে যোগাযোগ
          করুন — ওটাই আপনার লগইন আইডি।
        </p>

        <button
          type="button"
          className="ma__submit"
          disabled={!signedIn || busy || name.trim() === (profile?.display_name ?? '')}
          onClick={(e) => void save(e as unknown as React.FormEvent)}
        >
          {busy ? 'Saving…' : 'Submit'}
        </button>
      </div>
    </>
  );
}
