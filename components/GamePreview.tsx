'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { t } from '@/lib/strings';

/**
 * Game shown running, but gated behind a deposit.
 *
 * Two kinds of source feed this, told apart by the URL:
 *  - A provider's own play-money page (real art, real reels).
 *  - A self-hosted .mp4/.webm gameplay clip, for games with no fun mode.
 *
 * Either way a transparent veil sits on top and the frame takes no input, so
 * the game plays on screen but a visitor cannot touch it — the deposit CTA
 * is the way in. No session token, no wallet.
 *
 * Fullscreen: the button asks the browser for the real Fullscreen API and,
 * where the phone allows it, rotates to landscape — provider frames are built
 * for a full screen and look cramped in a card. Both calls are best-effort:
 * iOS Safari has no element fullscreen and no orientation lock, so the class
 * on the wrapper drives a CSS fallback that pins the frame to the viewport,
 * and the state is driven off the fullscreenchange event rather than our own
 * call so leaving with the system back gesture keeps the UI honest.
 */

/** youtu.be/ID, watch?v=ID or embed/ID → the id, else null. */
function youTubeId(url: string): string | null {
  const m = url.match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?v=|embed\/))([\w-]{11})/);
  return m ? m[1] : null;
}

/** a path/URL ending in a video container we can play natively. */
const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

type OrientationLock = ScreenOrientation & { lock?: (o: string) => Promise<void>; unlock?: () => void };

export default function GamePreview({ url, name }: { url: string; name: string }) {
  const ytId = youTubeId(url);
  const video = isVideoFile(url);
  const boxRef = useRef<HTMLDivElement>(null);
  const [full, setFull] = useState(false);

  const src = ytId
    ? `https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&mute=1&loop=1&playlist=${ytId}&controls=0&modestbranding=1&rel=0&playsinline=1&disablekb=1`
    : url;

  /* Track the browser's opinion, not ours: the user can leave fullscreen with
     Escape or the back gesture without going through our button. */
  useEffect(() => {
    const sync = () => setFull(Boolean(document.fullscreenElement) || full);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Escape has to work even where there is no real fullscreen to leave. */
  useEffect(() => {
    if (!full) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFull(false); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [full]);

  const enter = useCallback(async () => {
    setFull(true);
    const el = boxRef.current;
    try { await el?.requestFullscreen?.(); } catch { /* iOS Safari, older Firefox */ }
    const o = screen.orientation as OrientationLock | undefined;
    try { await o?.lock?.('landscape'); } catch { /* desktop and iOS refuse */ }
  }, []);

  const exit = useCallback(async () => {
    setFull(false);
    const o = screen.orientation as OrientationLock | undefined;
    try { o?.unlock?.(); } catch { /* ignore */ }
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* ignore */ }
  }, []);

  return (
    <section className={`gpv${full ? ' gpv--full' : ''}`}>
      {/* deposit CTA sits above the game */}
      <div className="gpv__bar">
        <span className="gpv__note">{t.previewOnly}</span>
        <button type="button" className="btn btn--ghost gpv__full" onClick={enter}>
          {t.fullscreen}
        </button>
        <Link href="/deposit" className="btn btn--gold gpv__cta">{t.deposit}</Link>
      </div>

      <div
        className={`gpv__box${video ? ' gpv__box--video' : ''}`}
        ref={boxRef}
      >
        {/* sits behind the frame: providers take tens of seconds to pull their
            assets, and an empty black box reads as broken until then */}
        <p className="gpv__loading">গেম লোড হচ্ছে…</p>

        {video ? (
          <video
            src={url}
            title={name}
            autoPlay
            muted
            loop
            playsInline
            tabIndex={-1}
            aria-hidden="true"
          />
        ) : (
          <iframe
            src={src}
            title={name}
            tabIndex={-1}
            aria-hidden="true"
            allow="autoplay; encrypted-media"
            sandbox="allow-scripts allow-same-origin allow-presentation"
          />
        )}

        {/* invisible: it only has to swallow the tap, not announce itself */}
        <div className="gpv__veil" aria-hidden />

        {full && (
          <>
            <button type="button" className="gpv__close" onClick={exit} aria-label={t.close}>✕</button>
            <span className="gpv__stamp">{t.previewOnly}</span>
          </>
        )}
      </div>
    </section>
  );
}
