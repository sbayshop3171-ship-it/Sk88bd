'use client';

import { useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import PageHeader from '@/components/PageHeader';
import { useSiteSettings } from '@/components/useSiteSettings';
import { useUI } from '@/components/UIProvider';
import { useLightSheet } from '@/components/useLightSheet';

/* ============================================================
   Complaint / suggestion.

   The reference posts this into its own ticket queue. We have no
   queue yet, and a form that swallows what a player writes is
   worse than no form — so Submit hands the finished message to
   the operator's own support channel, the same WhatsApp or
   Telegram the support page opens, with everything filled in.
   The player still writes once and the operator still receives it.

   The reference also asks for a captcha here. Not copied: this
   screen is behind a login, so there is nobody to keep out that
   the login has not already kept out.
   ============================================================ */

const ISSUES = [
  'Deposit',
  'Withdrawal',
  'Bonus & promotions',
  'Games & bets',
  'Account & login',
  'Something else',
];

const MAX = 500;

export default function SuggestionPage() {
  useLightSheet();
  const { profile } = useAuth();
  const { support } = useSiteSettings();
  const { toast } = useUI();

  const [issue, setIssue] = useState('');
  const [text, setText] = useState('');

  const body = text.trim();
  const ready = Boolean(issue) && body.length > 0;

  /* WhatsApp first, Telegram if that is the one the operator set. The
     settings hold either a bare number/handle or a full link, and the admin
     screen insists on full https links for Telegram — so a link is taken
     apart rather than glued onto another t.me/ in front of it. */
  const channel = () => {
    const wa = (support.whatsapp ?? '').trim();
    if (wa) {
      const number = /^\+?[\d\s()-]+$/.test(wa)
        ? wa.replace(/\D/g, '')
        : /wa\.me\/(\d+)/i.exec(wa)?.[1] ?? '';
      if (number) return (msg: string) => `https://wa.me/${number}?text=${encodeURIComponent(msg)}`;
      // a group or business link cannot carry a message; open it as it is
      if (/^https?:\/\//i.test(wa)) return () => wa;
    }
    const tg = (support.telegram ?? '').trim()
      .replace(/^https?:\/\/(www\.)?(t|telegram)\.me\//i, '')
      .replace(/^@/, '')
      .split(/[/?#]/)[0];
    if (tg) return (msg: string) => `https://t.me/${tg}?text=${encodeURIComponent(msg)}`;
    return null;
  };

  const submit = () => {
    if (!ready) return;
    const build = channel();
    const msg = [
      `Topic: ${issue}`,
      // the player ID is what support searches by in the admin panel
      profile?.player_no
        ? `ID: ${profile.player_no} (${profile.phone})`
        : profile?.phone ? `ID: ${profile.phone}` : null,
      '',
      body,
    ].filter(Boolean).join('\n');

    if (!build) {
      toast('Support chat isn’t set up yet — reach us from the Support page');
      return;
    }
    window.open(build(msg), '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <PageHeader title="Complaint / suggestion" />

      <div className="sg">
        <label className="sg__field">
          <select value={issue} onChange={(e) => setIssue(e.target.value)}>
            <option value="">* Choose a topic</option>
            {ISSUES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>

        <div className="sg__box">
          <b>* What could we do better?</b>
          <textarea
            placeholder="Write here"
            maxLength={MAX}
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <small>( {body.length} / {MAX} )</small>
        </div>

        <p className="sg__note">
          Your message goes to our support team along with your ID. To send a
          picture, send it straight to the support chat.
        </p>

        <button type="button" className="btn btn--gold btn--block sg__send" disabled={!ready} onClick={submit}>
          Submit
        </button>
      </div>
    </>
  );
}
