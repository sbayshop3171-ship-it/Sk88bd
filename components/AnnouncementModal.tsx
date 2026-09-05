'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { t } from '@/lib/strings';

/** Gradient promo cards — placeholders for the artwork the admin panel
    will eventually upload. Deliberately not image-backed yet. */
const SLIDES = [
  { cls: 's2', title: 'অ্যাপ ডাউনলোড করলেই বোনাস', amt: '৳১৮', note: 'সাইন আপ করে নাম্বার ভেরিফাই করুন' },
  { cls: 's1', title: 'প্রতিবার ডিপোজিট বোনাস', amt: '৫%', note: 'আজীবন, প্রতিটি ডিপোজিটে' },
  { cls: 's3', title: 'মাসিক রিবেট ক্যাশব্যাক', amt: '১%', note: 'প্রতি মাসে অটোমেটিক জমা' },
];

const SEEN_KEY = `${BRAND.name.toLowerCase()}:announcement-seen`;

export default function AnnouncementModal() {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // Show once per browser session. localStorage can throw in privacy modes,
  // so a failed read just means the popup shows.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
    if (!seen) setOpen(true);
  }, []);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  };

  if (!open) return null;
  const s = SLIDES[i];

  return (
    <>
      <div className="scrim on" onClick={close} />
      <div className="ann" role="dialog" aria-modal="true" aria-label={t.announcement}>
        <button className="ann__x" type="button" aria-label={t.close} onClick={close}>×</button>
        <div className="ann__title">{t.announcement}</div>
        <div className={`ann__card ${s.cls}`}>
          <h3>{s.title}</h3>
          <div className="amt">{s.amt}</div>
          <p>{s.note}</p>
          <span className="site">SITE LINK: {BRAND.domain.toUpperCase()}</span>
        </div>
        <div className="ann__nav">
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)}>‹ {t.previous}</button>
          <button type="button" disabled={i === SLIDES.length - 1} onClick={() => setI(i + 1)}>{t.next} ›</button>
        </div>
      </div>
    </>
  );
}
