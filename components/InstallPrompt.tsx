'use client';

import { usePathname } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { BRAND } from '@/lib/brand';
import { INSTALL_OPEN_EVENT, usePwaInstall } from './usePwaInstall';

const SNOOZE_KEY = 'sk_install_snoozed_until';
const SNOOZE_DAYS = 7;
/** let the page settle before covering part of it */
const AUTO_DELAY_MS = 4000;

/** Registers the service worker and offers "Install app".
 *
 * The sheet opens by itself a few seconds into the first visit, and again
 * whenever something calls openInstallSheet() — the app strip on the home
 * page and the download page both do. "পরে" hides it for a week.
 */
export default function InstallPrompt() {
  const path = usePathname();
  const { canInstall, installed, needsIosSteps, install } = usePwaInstall();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // the service worker is what makes Chrome treat this as an installable app
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') return;
    const id = window.setTimeout(() => {
      void navigator.serviceWorker.register('/sw.js').catch(() => {
        /* an unsupported or blocked worker just means no install offer */
      });
    }, 1200);
    return () => window.clearTimeout(id);
  }, []);

  const onGameScreen = path.startsWith('/play/') || path.startsWith('/game/');

  const snoozed = useCallback(() => {
    try {
      const until = Number(localStorage.getItem(SNOOZE_KEY) ?? 0);
      return Number.isFinite(until) && until > Date.now();
    } catch {
      return false;
    }
  }, []);

  // open on request, from anywhere on the site
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener(INSTALL_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(INSTALL_OPEN_EVENT, onOpen);
  }, []);

  // and once by itself, unless the player said "পরে" recently. Never over a
  // game — those screens are the game and nothing else.
  useEffect(() => {
    if (onGameScreen || installed || snoozed()) return;
    if (!canInstall && !needsIosSteps) return;
    const id = window.setTimeout(() => setOpen(true), AUTO_DELAY_MS);
    return () => window.clearTimeout(id);
  }, [canInstall, needsIosSteps, installed, snoozed, onGameScreen]);

  if (installed || !open) return null;

  const close = (snooze: boolean) => {
    setOpen(false);
    if (!snooze) return;
    try {
      localStorage.setItem(SNOOZE_KEY, String(Date.now() + SNOOZE_DAYS * 864e5));
    } catch {
      /* private mode — it will simply ask again next visit */
    }
  };

  const onInstall = async () => {
    setBusy(true);
    const accepted = await install();
    setBusy(false);
    if (accepted) close(false);
  };

  return (
    <>
      <div className="scrim on" onClick={() => close(true)} />
      <div className="pwa" role="dialog" aria-modal="true" aria-labelledby="pwa-title">
        <button className="pwa__x" type="button" aria-label="বন্ধ করুন" onClick={() => close(true)}>×</button>

        <div className="pwa__head">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="pwa__icon" src="/icons/icon-192.png" alt="" width={56} height={56} />
          <div>
            <h2 className="pwa__title" id="pwa-title">{BRAND.name} অ্যাপ</h2>
            <p className="pwa__sub">ফোনের হোম স্ক্রিনে যোগ করুন</p>
          </div>
        </div>

        <ul className="pwa__points">
          <li><span aria-hidden>⚡</span> ব্রাউজার খোলার ঝামেলা নেই — এক ট্যাপে খুলবে</li>
          <li><span aria-hidden>📲</span> ফুল স্ক্রিন, অ্যাপের মতোই চলবে</li>
          <li><span aria-hidden>🎁</span> ইনস্টল করলেই ৳১৮ বোনাস</li>
        </ul>

        {canInstall ? (
          <button className="btn btn--gold btn--block" type="button" disabled={busy} onClick={onInstall}>
            {busy ? 'ইনস্টল হচ্ছে…' : 'ইনস্টল করুন'}
          </button>
        ) : needsIosSteps ? (
          <ol className="pwa__ios">
            <li>নিচের <b>শেয়ার</b> বাটনে ট্যাপ করুন <span aria-hidden>⬆️</span></li>
            <li><b>Add to Home Screen</b> বেছে নিন</li>
            <li><b>Add</b> চাপুন — হয়ে গেল</li>
          </ol>
        ) : (
          <p className="pwa__note">
            ব্রাউজারের মেনু (⋮) খুলে <b>Install app</b> অথবা <b>Add to Home screen</b> বেছে নিন।
          </p>
        )}

        <button className="pwa__later" type="button" onClick={() => close(true)}>পরে দেখব</button>
      </div>
    </>
  );
}
