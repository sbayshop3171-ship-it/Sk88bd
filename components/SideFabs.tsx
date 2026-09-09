'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { ChatIcon, FacebookIcon, TelegramIcon, UpIcon, WhatsAppIcon } from './Icons';
import { useSiteSettings } from './useSiteSettings';

/** The floating rail: refer bubble, a support toggle that unfolds the social
    links, and a back-to-top that appears after scrolling. Collapsed by
    default — on a phone five stacked buttons hid a third of every screen. */
export default function SideFabs() {
  const path = usePathname();
  const [showTop, setShowTop] = useState(false);
  const [open, setOpen] = useState(false);
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

  // fold the rail back up whenever the player moves to another page
  useEffect(() => { setOpen(false); }, [path]);

  // a game screen is its own surface: these float directly over the bet
  // controls, and on the two-seat layout they cover the right-hand seat
  if (path.startsWith('/game/')) return null;

  return (
    <div className={`fabs${open ? ' open' : ''}`}>
      <Link href="/refer" className="refer-bubble">
        <span className="e" aria-hidden>👥</span>
        Refer
      </Link>

      {support.whatsapp && (
        <a className="fab fab--social fab--wa" href={support.whatsapp} target="_blank"
           rel="noopener noreferrer" aria-label="WhatsApp"><WhatsAppIcon /></a>
      )}
      {support.facebook && (
        <a className="fab fab--social fab--fb" href={support.facebook} target="_blank"
           rel="noopener noreferrer" aria-label="Facebook"><FacebookIcon /></a>
      )}
      {support.telegram && (
        <a className="fab fab--social fab--tg" href={support.telegram} target="_blank"
           rel="noopener noreferrer" aria-label="Telegram"><TelegramIcon /></a>
      )}
      <Link className="fab fab--social fab--chat" href="/support" aria-label="Live chat"><ChatIcon /></Link>

      <button
        className="fab fab--toggle"
        type="button"
        aria-label={open ? 'Close support' : 'Support'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? <span className="x" aria-hidden>×</span> : <ChatIcon />}
      </button>

      <button
        className={`fab fab--top${showTop ? ' show' : ''}`}
        type="button"
        aria-label="Back to top"
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      >
        <UpIcon />
      </button>
    </div>
  );
}
