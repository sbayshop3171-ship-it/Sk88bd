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
  'ডিপোজিট',
  'উইথড্র',
  'বোনাস ও প্রমোশন',
  'গেম বা বাজি',
  'অ্যাকাউন্ট ও লগইন',
  'অন্য কিছু',
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

  /** WhatsApp first, Telegram if that is the one the operator set. */
  const channel = () => {
    const wa = support.whatsapp?.replace(/[^\d]/g, '');
    if (wa) return (msg: string) => `https://wa.me/${wa}?text=${encodeURIComponent(msg)}`;
    const tg = support.telegram?.replace(/^@/, '');
    if (tg) return (msg: string) => `https://t.me/${tg}?text=${encodeURIComponent(msg)}`;
    return null;
  };

  const submit = () => {
    if (!ready) return;
    const build = channel();
    const msg = [
      `ধরন: ${issue}`,
      profile?.phone ? `আইডি: ${profile.phone}` : null,
      '',
      body,
    ].filter(Boolean).join('\n');

    if (!build) {
      toast('সাপোর্ট চ্যানেল এখনো যুক্ত হয়নি — সাপোর্ট পেজ থেকে যোগাযোগ করুন');
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
            <option value="">* সমস্যার ধরন বেছে নিন</option>
            {ISSUES.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
        </label>

        <div className="sg__box">
          <b>* কী আরও ভালো করা যায়?</b>
          <textarea
            placeholder="এখানে লিখুন"
            maxLength={MAX}
            rows={6}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <small>( {body.length} / {MAX} )</small>
        </div>

        <p className="sg__note">
          লেখাটি আপনার আইডি সহ আমাদের সাপোর্টে চলে যাবে। ছবি পাঠাতে চাইলে সাপোর্ট
          চ্যাটে সরাসরি পাঠিয়ে দিন।
        </p>

        <button type="button" className="btn btn--gold btn--block sg__send" disabled={!ready} onClick={submit}>
          জমা
        </button>
      </div>
    </>
  );
}
