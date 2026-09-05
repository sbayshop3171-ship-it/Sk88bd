'use client';

import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useRef } from 'react';
import { t } from '@/lib/strings';
import { LeftIcon } from './Icons';
import { Wordmark } from './Header';

/* ============================================================
   Fullscreen game player.

   Same shape as the reference lobby's /play: a thin bar with a
   back arrow and the game's name, the frame filling everything
   below it.

   A launched frame is a provider free-play demo — play money by
   construction (sandboxed, no wallet, no session token), so it is
   handed input and actually plays. A clip is a looping recording.
   Neither can reach a real balance; the deposit button in the bar
   is the way to real play.
   ============================================================ */

type Reason = 'no-aggregator' | 'no-demo' | 'upstream';

/* Only the transient case gets an explanation. For a game that simply is not
   connected yet, the screen shows the game — its own artwork, full bleed —
   rather than a wall of text about aggregators. */
const MESSAGE: Partial<Record<Reason, string>> = {
  upstream: 'গেম সার্ভার এখন সাড়া দিচ্ছে না। একটু পরে আবার চেষ্টা করুন।',
};

const isVideoFile = (url: string) => /\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(url);

export default function GamePlayer({
  name,
  provider,
  url,
  thumb,
  reason,
}: {
  name: string;
  provider: string;
  url?: string;
  thumb?: string;
  reason?: Reason;
}) {
  const router = useRouter();
  const shell = useRef<HTMLDivElement>(null);

  /* Ask for real fullscreen and landscape once the frame is up. Both are
     best-effort — iOS Safari has neither — and the layout already fills the
     viewport on its own, so a refusal costs nothing. */
  useEffect(() => {
    if (!url) return;
    const el = shell.current;
    const go = async () => {
      try { await el?.requestFullscreen?.(); } catch { /* iOS Safari */ }
      const o = screen.orientation as ScreenOrientation & { lock?: (s: string) => Promise<void> };
      try { await o?.lock?.('landscape'); } catch { /* desktop, iOS */ }
    };
    /* Chrome only grants fullscreen from a gesture; the tap that opened this
       page usually still counts, and when it does not the layout stands in. */
    void go();
    return () => {
      const o = screen.orientation as ScreenOrientation & { unlock?: () => void };
      try { o?.unlock?.(); } catch { /* ignore */ }
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    };
  }, [url]);

  const back = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    router.back();
  };

  return (
    <div className="player" ref={shell}>
      <div className="player__bar">
        <button type="button" className="player__back" onClick={back} aria-label={t.previous}>
          <LeftIcon />
        </button>
        <span className="player__name">{name}</span>
        <span className="player__prov">{provider}</span>
        {/* the art now opens this screen directly, so the way in has to live
            here rather than on a sheet the visitor no longer passes through */}
        <Link href="/deposit" className="btn btn--gold player__cta">{t.deposit}</Link>
      </div>

      <div className="player__stage">
        {url ? (
          <>
            {/* Branded loader over the frame: the game takes a few seconds to
                pull its assets, and this holds the site's own face on screen
                the whole time, so the join to the provider is never bare. */}
            <div className="player__load" aria-hidden>
              <Wordmark />
              <span className="player__loadbar"><i /></span>
              <p className="player__loadtxt">গেম লোড হচ্ছে…</p>
            </div>
            {isVideoFile(url) ? (
              /* a recorded game — a looping clip, no controls to give */
              <video src={url} title={name} autoPlay muted loop playsInline />
            ) : (
              /* a real free-play demo: let it take input so it actually plays,
                 the way the reference lobby's trial does. It is play-money by
                 construction — sandboxed, no wallet, no session token — so a
                 real balance is never in reach. sandbox withholds
                 allow-top-navigation, so the provider's own links cannot pull
                 the visitor off the site. */
              <iframe
                src={url}
                title={name}
                allow="autoplay; encrypted-media; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-presentation allow-forms allow-pointer-lock"
              />
            )}
          </>
        ) : (
          /* No live frame — so the screen becomes the game's own splash: its
             artwork slowly drifting over a blurred, brightened copy of itself,
             a light sweeping across, the name and provider lit up, and a play
             button. It reads as a game about to start, not a dead end. Only the
             genuinely transient case (upstream down) says so in words. */
          <div className="player__poster">
            {thumb && (
              <>
                <Image className="player__blur" src={thumb} alt="" aria-hidden fill sizes="100vw" />
                <Image className="player__fit" src={thumb} alt={name} fill sizes="100vw" priority />
              </>
            )}
            <span className="player__sweep" aria-hidden />
            <div className="player__splash">
              <p className="player__splashName">{name}</p>
              <p className="player__splashProv">{provider}</p>
              {reason === 'upstream' && <p className="player__splashNote">{MESSAGE.upstream}</p>}
              <Link href="/deposit" className="btn btn--gold player__play">
                <span className="player__playIco" aria-hidden>▶</span>{t.play}
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
