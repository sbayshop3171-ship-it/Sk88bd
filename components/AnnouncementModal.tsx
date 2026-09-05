'use client';

import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import {
  activeSorted,
  DEFAULT_ANNOUNCEMENTS,
  type Announcement,
  type AnnouncementInput,
} from '@/lib/site-content';
import { t } from '@/lib/strings';

const SEEN_KEY = `${BRAND.name.toLowerCase()}:announcement-seen`;

/** First-visit promo popup. Ships with DEFAULT_ANNOUNCEMENTS and swaps in
    whatever the admin saved at /admin/banners once it loads. */
export default function AnnouncementModal() {
  const [cards, setCards] = useState<(AnnouncementInput | Announcement)[]>(DEFAULT_ANNOUNCEMENTS);
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  // Show once per browser session. localStorage can throw in privacy modes,
  // so a failed read just means the popup shows.
  useEffect(() => {
    let seen = false;
    try { seen = sessionStorage.getItem(SEEN_KEY) === '1'; } catch { /* ignore */ }
    if (!seen) setOpen(true);
  }, []);

  useEffect(() => {
    let live = true;
    fetch('/api/site-content', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { ok: true; announcements: Announcement[] } | null) => {
        if (!live || !data?.ok) return;
        setCards(activeSorted(data.announcements));
        setI(0);
      })
      .catch(() => { /* keep the shipped cards */ });
    return () => { live = false; };
  }, []);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(SEEN_KEY, '1'); } catch { /* ignore */ }
  };

  if (!open || cards.length === 0) return null;
  const s = cards[Math.min(i, cards.length - 1)];

  return (
    <>
      <div className="scrim on" onClick={close} />
      <div className="ann" role="dialog" aria-modal="true" aria-label={t.announcement}>
        <button className="ann__x" type="button" aria-label={t.close} onClick={close}>×</button>
        <div className="ann__title">{t.announcement}</div>
        <div className={`ann__card ${s.art}`}>
          <h3>{s.title}</h3>
          <div className="amt">{s.amount}</div>
          <p>{s.note}</p>
          <span className="site">SITE LINK: {BRAND.domain.toUpperCase()}</span>
        </div>
        <div className="ann__nav">
          <button type="button" disabled={i === 0} onClick={() => setI(i - 1)}>‹ {t.previous}</button>
          <button type="button" disabled={i >= cards.length - 1} onClick={() => setI(i + 1)}>{t.next} ›</button>
        </div>
      </div>
    </>
  );
}
