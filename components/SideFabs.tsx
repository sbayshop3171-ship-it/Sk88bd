'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { ChatIcon, FacebookIcon, TelegramIcon, UpIcon, WhatsAppIcon } from './Icons';

/** Social + support buttons, plus a back-to-top that appears after scrolling. */
export default function SideFabs() {
  const path = usePathname();
  const [showTop, setShowTop] = useState(false);

  useEffect(() => {
    const onScroll = () => setShowTop(window.scrollY > 400);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // a game screen is its own surface: these float directly over the bet
  // controls, and on the two-seat layout they cover the right-hand seat
  if (path.startsWith('/game/')) return null;

  return (
    <>
      <Link href="/refer" className="refer-bubble">
        <span className="e" aria-hidden>👥</span>
        রেফার
      </Link>

      <div className="fabs">
        <a className="fab fab--wa" href={BRAND.social.whatsapp} target="_blank"
           rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
        <a className="fab fab--fb" href={BRAND.social.facebook} target="_blank"
           rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>
        <a className="fab fab--tg" href={BRAND.social.telegram} target="_blank"
           rel="noopener noreferrer" aria-label="Telegram"><TelegramIcon /></a>
        <Link className="fab fab--chat" href="/support" aria-label="লাইভ চ্যাট"><ChatIcon /></Link>
        <button
          className={`fab fab--top${showTop ? ' show' : ''}`}
          type="button"
          aria-label="উপরে যান"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        >
          <UpIcon />
        </button>
      </div>
    </>
  );
}
