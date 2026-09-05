'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Field from '@/components/Field';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';

/** The account's own details, and the one thing a player may change here:
    the display name. Everything else (phone, VIP, referral code) is set by
    the system or the admin, so it is shown read-only. */
export default function MyProfilePage() {
  const { toast } = useUI();
  const { ready, session, profile, supabase, refresh } = useAuth();
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
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
    ['ইউজার আইডি', profile?.phone ?? '—'],
    ['মোবাইল নাম্বার', profile?.phone ?? '—'],
    ['নাম', profile?.display_name || '—'],
    ['ভিআইপি লেভেল', `VIP ${profile?.vip_level ?? 0}`],
    ['রেফারেল কোড', profile?.referral_code ?? '—'],
    ['রেজিস্ট্রেশন তারিখ', joined],
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = name.trim().slice(0, 40);
    if (clean.length < 2) { setErr('নাম কমপক্ষে ২ অক্ষরের হতে হবে'); return; }
    if (!supabase || !session) { setErr('আগে লগইন করুন'); return; }

    setBusy(true);
    setErr('');
    // RLS "edit own profile" lets a player update only their own row.
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: clean })
      .eq('id', session.user.id);
    setBusy(false);

    if (error) { setErr('নাম বদলানো গেল না — আবার চেষ্টা করুন'); return; }
    await refresh();
    setEditing(false);
    toast('নাম বদলানো হয়েছে');
  };

  return (
    <>
      <PageHeader title="আমার প্রোফাইল" />

      <div className="profile">
        <i className="profile__av" aria-hidden>👤</i>
        <div style={{ minWidth: 0 }}>
          <div className="profile__n">
            {signedIn ? (profile?.display_name || profile?.phone || 'প্লেয়ার') : 'গেস্ট'}
          </div>
          <div className="profile__id">
            {signedIn ? `VIP ${profile?.vip_level ?? 0}` : 'লগইন করলে তথ্য দেখা যাবে'}
          </div>
        </div>
      </div>

      {!signedIn && ready && (
        <div className="wallet-bar">
          <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
          <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
        </div>
      )}

      <div className="list-card">
        {rows.map(([k, v]) => (
          <div key={k} style={{ display: 'flex', padding: '13px 14px', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,.05)' }}>
            <span style={{ color: 'var(--muted)' }}>{k}</span>
            <span style={{ marginLeft: 'auto', fontWeight: 700 }}>{v}</span>
          </div>
        ))}
      </div>

      {signedIn && (
        <div style={{ margin: 12 }}>
          {editing ? (
            <form onSubmit={save} noValidate>
              <Field label="নতুন নাম" error={err}>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="যে নামে ডাকতে চান"
                  maxLength={40}
                  autoFocus
                />
              </Field>
              <div className="wallet-bar" style={{ margin: 0 }}>
                <button type="button" className="btn btn--ghost" style={{ padding: 12 }}
                        onClick={() => { setEditing(false); setErr(''); setName(profile?.display_name ?? ''); }}
                        disabled={busy}>
                  বাতিল
                </button>
                <button type="submit" className="btn btn--gold" style={{ padding: 12 }} disabled={busy}>
                  {busy ? 'সেভ হচ্ছে…' : 'সেভ করুন'}
                </button>
              </div>
            </form>
          ) : (
            <button type="button" className="btn btn--gold btn--block" onClick={() => setEditing(true)}>
              নাম বদলান
            </button>
          )}
          <div className="note" style={{ marginTop: 12 }}>
            মোবাইল নাম্বার বদলাতে সাপোর্টে যোগাযোগ করুন — নাম্বারই আপনার লগইন আইডি।
          </div>
        </div>
      )}
    </>
  );
}
