'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatIcon, FacebookIcon, TelegramIcon, UpIcon, WhatsAppIcon } from './Icons';
import { useSiteSettings } from './useSiteSettings';

/** Social + support buttons, plus a back-to-top that appears after scrolling. */
export default function SideFabs() {
  const path = usePathname();
  const [showTop, setShowTop] = useState(false);
  const showTopRef = useRef(false);
  // the admin's links; a blank one drops its button
  const { support } = useSiteSettings();

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const next = window.scrollY > 400;
      if (showTopRef.current !== next) {
        showTopRef.current = next;
        setShowTop(next);
      }
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
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
        {support.whatsapp && (
          <a className="fab fab--wa" href={support.whatsapp} target="_blank"
             rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
        )}
        {support.facebook && (
          <a className="fab fab--fb" href={support.facebook} target="_blank"
             rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>
        )}
        {support.telegram && (
          <a className="fab fab--tg" href={support.telegram} target="_blank"
             rel="noopener noreferrer" aria-label="Telegram"><TelegramIcon /></a>
        )}
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
