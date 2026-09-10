'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useUI } from '@/components/UIProvider';
import { t } from '@/lib/strings';
import { useLightSheet } from '@/components/useLightSheet';
import {
  EnvelopeIcon, FacebookBoxIcon, IdCardIcon, NickIcon, PhoneLineIcon, WhatsAppLineIcon,
} from '@/components/Icons';

/* ============================================================
   My Account — the reference's phone screen.

   The username at the top is the login and cannot move. Under it the
   real name, shown greyed and masked once it is set: a withdrawal is
   checked against it, so it is write-once (migration 011 enforces that
   in the database, not just here). Everything below is a way for
   support to reach the player, and every one of them has a column to
   land in.
   ============================================================ */

type Key = 'real_name' | 'display_name' | 'facebook_id' | 'google_id'
  | 'whatsapp' | 'email' | 'contact_phone';

/** J** — the reference shows the first letter and two stars, whatever the
    length, so the mask says nothing about the name behind it. */
const maskName = (name: string) => `${name.slice(0, 1)}**`;

export default function MyProfilePage() {
  useLightSheet();
  const { toast } = useUI();
  const { ready, session, profile, supabase, refresh } = useAuth();

  const [form, setForm] = useState<Record<Key, string>>({
    real_name: '', display_name: '', facebook_id: '',
    google_id: '', whatsapp: '', email: '', contact_phone: '',
  });
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    setForm({
      real_name: profile?.real_name ?? '',
      display_name: profile?.display_name ?? '',
      facebook_id: profile?.facebook_id ?? '',
      google_id: profile?.google_id ?? '',
      whatsapp: profile?.whatsapp ?? '',
      email: profile?.email ?? '',
      contact_phone: profile?.contact_phone ?? '',
    });
  }, [profile]);

  const signedIn = ready && Boolean(session);
  const nameLocked = Boolean(profile?.real_name);

  const set = (k: Key) => (v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErr('');
  };

  const fields: [Key, React.ReactNode, string][] = [
    ['display_name', <NickIcon key="n" />, 'Please fill in Nickname'],
    ['facebook_id', <FacebookBoxIcon key="f" />, 'Please fill in Facebook ID'],
    ['google_id', <NickIcon key="g" />, 'Please fill in Google'],
    ['whatsapp', <WhatsAppLineIcon key="w" />, 'Please fill in WhatsApp'],
    ['email', <EnvelopeIcon key="e" />, 'Please fill in Email'],
    ['contact_phone', <PhoneLineIcon key="p" />, 'Please fill in Phone Number'],
  ];

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase || !session) { setErr('Log in first'); return; }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setErr('That email does not look right'); return;
    }

    const patch: Record<string, string | null> = {};
    for (const k of Object.keys(form) as Key[]) {
      if (k === 'real_name' && nameLocked) continue;
      const v = form[k].trim().slice(0, 80);
      patch[k] = v || null;
    }

    setBusy(true);
    // RLS "edit own profile" lets a player update only their own row.
    const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
    setBusy(false);

    if (error) {
      setErr(/real name/i.test(error.message)
        ? 'The name cannot be changed — contact support'
        : 'Could not save — try again');
      return;
    }
    await refresh();
    toast('Saved');
  };

  return (
    <>
      <PageHeader title="My Account" />

      <div className="msheet ms--white">
        <p className="ms-user">Username:<b>{signedIn ? profile?.phone ?? '—' : 'Guest'}</b></p>

        {!signedIn && ready && (
          <div className="wallet-bar" style={{ margin: '16px 20px 0' }}>
            <Link href="/login" className="btn btn--ghost" style={{ padding: 12 }}>{t.login}</Link>
            <Link href="/register" className="btn btn--gold" style={{ padding: 12 }}>{t.register}</Link>
          </div>
        )}

        <form className="ms-pad ms-acct" onSubmit={save} noValidate>
          {/* the name a withdrawal is checked against: greyed and masked once
              it is set, and the database refuses a second value */}
          <label className={`ms-field${nameLocked ? ' ms-field--locked' : ''}`}>
            <span className="ms-field__ico"><IdCardIcon /></span>
            <input
              value={nameLocked ? maskName(profile?.real_name ?? '') : form.real_name}
              placeholder="Please fill in your name"
              disabled={!signedIn || nameLocked}
              onChange={(e) => set('real_name')(e.target.value)}
            />
          </label>

          {fields.map(([key, icon, placeholder]) => (
            <label className="ms-field" key={key}>
              <span className="ms-field__ico">{icon}</span>
              <input
                value={form[key]}
                placeholder={placeholder}
                disabled={!signedIn}
                inputMode={key === 'contact_phone' || key === 'whatsapp' ? 'tel' : undefined}
                onChange={(e) => set(key)(e.target.value)}
              />
            </label>
          ))}

          {err && <p className="ms-err">{err}</p>}

          <p className="ms-privacy">We care about your privacy</p>
          <p>All user data is encrypted to protect your privacy.</p>

          {/* live from the start, as the reference's is */}
          <button type="submit" className="ms-submit" disabled={!signedIn || busy}>
            {busy ? '…' : 'Submit'}
          </button>
        </form>
      </div>
    </>
  );
}
